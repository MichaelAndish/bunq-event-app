#!/usr/bin/env bash
# ── bunq Platform — one-time AWS infrastructure bootstrap ──────────────────
# Prerequisites: AWS CLI v2, authenticated with admin credentials
# Usage: AWS_REGION=eu-west-1 APP_NAME=bunq bash infra/bootstrap.sh
# Idempotent: safe to run multiple times.
set -euo pipefail

REGION=${AWS_REGION:-eu-west-1}
APP=${APP_NAME:-bunq}
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

echo "▶ Bootstrapping ${APP} in ${REGION} (account ${ACCOUNT})"

# ── ECR repositories ────────────────────────────────────────────────────────
for REPO in backend mastra; do
  aws ecr describe-repositories --repository-names "${APP}-${REPO}" --region "$REGION" &>/dev/null \
    || aws ecr create-repository \
         --repository-name "${APP}-${REPO}" \
         --image-scanning-configuration scanOnPush=true \
         --region "$REGION" \
         --output text --query 'repository.repositoryUri'
  echo "  ECR: ${APP}-${REPO}"
done

BACKEND_ECR="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${APP}-backend"
MASTRA_ECR="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${APP}-mastra"

# ── S3 bucket helpers ───────────────────────────────────────────────────────
create_bucket() {
  local BUCKET="$1"
  aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null && return
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
}

# ── S3 bucket for frontend ──────────────────────────────────────────────────
FRONTEND_BUCKET="${APP}-frontend-${ACCOUNT}"
create_bucket "$FRONTEND_BUCKET"
aws s3api put-public-access-block \
  --bucket "$FRONTEND_BUCKET" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "  S3: $FRONTEND_BUCKET (CloudFront-only access)"

# ── S3 bucket for event media (replaces MinIO in production) ────────────────
MEDIA_BUCKET="${APP}-media-${ACCOUNT}"
create_bucket "$MEDIA_BUCKET"
aws s3api put-bucket-cors --bucket "$MEDIA_BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","POST"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
echo "  S3: $MEDIA_BUCKET (event media)"

# ── VPC + subnets for App Runner ↔ Aurora ───────────────────────────────────
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${APP}-vpc" \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION" 2>/dev/null)
if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${APP}-vpc}]" \
    --query 'Vpc.VpcId' --output text --region "$REGION")
  # Two private subnets in different AZs
  SUBNET_A=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 \
    --availability-zone "${REGION}a" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP}-private-a}]" \
    --query 'Subnet.SubnetId' --output text --region "$REGION")
  SUBNET_B=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" --cidr-block 10.0.2.0/24 \
    --availability-zone "${REGION}b" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${APP}-private-b}]" \
    --query 'Subnet.SubnetId' --output text --region "$REGION")
  echo "  VPC: $VPC_ID  Subnets: $SUBNET_A $SUBNET_B"
else
  SUBNET_A=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP}-private-a" \
    --query 'Subnets[0].SubnetId' --output text --region "$REGION")
  SUBNET_B=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP}-private-b" \
    --query 'Subnets[0].SubnetId' --output text --region "$REGION")
  echo "  VPC (existing): $VPC_ID"
fi

# ── Security group for Aurora ────────────────────────────────────────────────
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${APP}-db-sg" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$REGION")
if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "${APP}-db-sg" \
    --description "Allow PostgreSQL from App Runner VPC connector" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text --region "$REGION")
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 5432 \
    --cidr 10.0.0.0/16 \
    --region "$REGION"
  echo "  SG: $SG_ID"
fi

# ── DB subnet group ──────────────────────────────────────────────────────────
aws rds describe-db-subnet-groups --db-subnet-group-name "${APP}-db-subnet" \
  --region "$REGION" &>/dev/null \
  || aws rds create-db-subnet-group \
       --db-subnet-group-name "${APP}-db-subnet" \
       --db-subnet-group-description "Aurora subnets for ${APP}" \
       --subnet-ids "$SUBNET_A" "$SUBNET_B" \
       --region "$REGION"
echo "  RDS Subnet Group: ${APP}-db-subnet"

# ── RDS PostgreSQL instance ────────────────────────────────────────────────
CLUSTER_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "${APP}-db" \
  --query 'DBInstances[0].DBInstanceStatus' --output text --region "$REGION" 2>/dev/null || echo "notfound")
if [[ "$CLUSTER_STATUS" == "notfound" ]]; then
  DB_PASS=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 18)

  aws rds create-db-instance \
    --db-instance-identifier "${APP}-db" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 16 \
    --master-username bunq \
    --master-user-password "$DB_PASS" \
    --db-name bunq \
    --vpc-security-group-ids "$SG_ID" \
    --db-subnet-group-name "${APP}-db-subnet" \
    --no-publicly-accessible \
    --storage-type gp2 \
    --allocated-storage 20 \
    --backup-retention-period 7 \
    --region "$REGION" \
    --output text --query 'DBInstance.DBInstanceIdentifier' > /dev/null

  echo "  RDS PostgreSQL: ${APP}-db  (provisioning ~5 min)"
  echo "  ⚠️  SAVE YOUR DATABASE PASSWORD NOW: $DB_PASS"
  echo "  Endpoint available after provisioning — get it with:"
  echo "    aws rds describe-db-instances --db-instance-identifier bunq-db --query 'DBInstances[0].Endpoint.Address' --output text"
  echo "  DATABASE_URL will be:"
  echo "    postgresql://bunq:${DB_PASS}@<endpoint>:5432/bunq"
else
  DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${APP}-db" \
    --query 'DBInstances[0].Endpoint.Address' --output text --region "$REGION" 2>/dev/null)
  echo "  RDS: ${APP}-db ($CLUSTER_STATUS) → $DB_ENDPOINT"
fi

# ── App Runner VPC connector ─────────────────────────────────────────────────
CONNECTOR_ARN=$(aws apprunner list-vpc-connectors \
  --query "VpcConnectors[?VpcConnectorName=='${APP}-vpc-connector'].VpcConnectorArn | [0]" \
  --output text --region "$REGION")
if [[ "$CONNECTOR_ARN" == "None" || -z "$CONNECTOR_ARN" ]]; then
  CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
    --vpc-connector-name "${APP}-vpc-connector" \
    --subnets "$SUBNET_A" "$SUBNET_B" \
    --security-groups "$SG_ID" \
    --query 'VpcConnector.VpcConnectorArn' --output text --region "$REGION")
  echo "  VPC Connector: $CONNECTOR_ARN"
fi

# ── IAM role for App Runner ECR access ───────────────────────────────────────
ROLE_NAME="${APP}-apprunner-ecr-role"
aws iam get-role --role-name "$ROLE_NAME" &>/dev/null \
  || aws iam create-role \
       --role-name "$ROLE_NAME" \
       --assume-role-policy-document '{
         "Version":"2012-10-17",
         "Statement":[{
           "Effect":"Allow",
           "Principal":{"Service":"build.apprunner.amazonaws.com"},
           "Action":"sts:AssumeRole"
         }]
       }' \
       --output text --query 'Role.Arn' &>/dev/null
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess \
  2>/dev/null || true
ACCESS_ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"
echo "  IAM Role: $ROLE_NAME"

# ── App Runner: backend ──────────────────────────────────────────────────────
BACKEND_SVC=$(aws apprunner list-services \
  --query "ServiceSummaryList[?ServiceName=='${APP}-backend'].ServiceArn | [0]" \
  --output text --region "$REGION")
if [[ "$BACKEND_SVC" == "None" || -z "$BACKEND_SVC" ]]; then
  echo "  Creating App Runner service: ${APP}-backend"
  echo "  NOTE: Set BACKEND_APP_RUNNER_SERVICE_ARN GitHub secret after creation"
  aws apprunner create-service \
    --service-name "${APP}-backend" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"${BACKEND_ECR}:latest\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"9191\",
          \"RuntimeEnvironmentVariables\": {
            \"PORT\": \"9191\",
            \"NODE_ENV\": \"production\"
          }
        }
      },
      \"AuthenticationConfiguration\": {
        \"AccessRoleArn\": \"${ACCESS_ROLE_ARN}\"
      }
    }" \
    --instance-configuration "Cpu=1 vCPU,Memory=2 GB" \
    --network-configuration "{
      \"EgressConfiguration\": {
        \"EgressType\": \"VPC\",
        \"VpcConnectorArn\": \"${CONNECTOR_ARN}\"
      }
    }" \
    --region "$REGION" \
    --query 'Service.ServiceArn' --output text
else
  echo "  App Runner backend (existing): $BACKEND_SVC"
fi

# ── App Runner: mastra ───────────────────────────────────────────────────────
MASTRA_SVC=$(aws apprunner list-services \
  --query "ServiceSummaryList[?ServiceName=='${APP}-mastra'].ServiceArn | [0]" \
  --output text --region "$REGION")
if [[ "$MASTRA_SVC" == "None" || -z "$MASTRA_SVC" ]]; then
  echo "  Creating App Runner service: ${APP}-mastra"
  aws apprunner create-service \
    --service-name "${APP}-mastra" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"${MASTRA_ECR}:latest\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"4111\",
          \"RuntimeEnvironmentVariables\": {
            \"NODE_ENV\": \"production\"
          }
        }
      },
      \"AuthenticationConfiguration\": {
        \"AccessRoleArn\": \"${ACCESS_ROLE_ARN}\"
      }
    }" \
    --instance-configuration "Cpu=1 vCPU,Memory=2 GB" \
    --network-configuration "{
      \"EgressConfiguration\": {
        \"EgressType\": \"VPC\",
        \"VpcConnectorArn\": \"${CONNECTOR_ARN}\"
      }
    }" \
    --region "$REGION" \
    --query 'Service.ServiceArn' --output text
else
  echo "  App Runner Mastra (existing): $MASTRA_SVC"
fi

# ── CloudFront distribution ──────────────────────────────────────────────────
CF_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${APP}-frontend'].Id | [0]" \
  --output text)
if [[ "$CF_ID" == "None" || -z "$CF_ID" ]]; then
  CF_ID=$(aws cloudfront create-distribution \
    --distribution-config "{
      \"CallerReference\": \"${APP}-frontend-$(date +%s)\",
      \"Comment\": \"${APP}-frontend\",
      \"DefaultRootObject\": \"index.html\",
      \"Origins\": {
        \"Quantity\": 1,
        \"Items\": [{
          \"Id\": \"s3-origin\",
          \"DomainName\": \"${FRONTEND_BUCKET}.s3.${REGION}.amazonaws.com\",
          \"S3OriginConfig\": { \"OriginAccessIdentity\": \"\" }
        }]
      },
      \"DefaultCacheBehavior\": {
        \"TargetOriginId\": \"s3-origin\",
        \"ViewerProtocolPolicy\": \"redirect-to-https\",
        \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
        \"Compress\": true,
        \"AllowedMethods\": { \"Quantity\": 2, \"Items\": [\"GET\",\"HEAD\"] }
      },
      \"CustomErrorResponses\": {
        \"Quantity\": 1,
        \"Items\": [{
          \"ErrorCode\": 404,
          \"ResponsePagePath\": \"/index.html\",
          \"ResponseCode\": \"200\",
          \"ErrorCachingMinTTL\": 0
        }]
      },
      \"Enabled\": true,
      \"HttpVersion\": \"http2and3\",
      \"PriceClass\": \"PriceClass_100\"
    }" \
    --query 'Distribution.Id' --output text)
  echo "  CloudFront: $CF_ID  (set CLOUDFRONT_DISTRIBUTION_ID GitHub secret)"
else
  echo "  CloudFront (existing): $CF_ID"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  Bootstrap complete — set these GitHub Actions secrets:"
echo "════════════════════════════════════════════════════════"
echo "  AWS_ACCESS_KEY_ID           = <CI IAM user key>"
echo "  AWS_SECRET_ACCESS_KEY       = <CI IAM user secret>"
echo "  BACKEND_ECR_REPO            = ${BACKEND_ECR}"
echo "  MASTRA_ECR_REPO             = ${MASTRA_ECR}"
echo "  S3_FRONTEND_BUCKET          = ${FRONTEND_BUCKET}"
echo "  CLOUDFRONT_DISTRIBUTION_ID  = ${CF_ID}"
echo "  BACKEND_APP_RUNNER_SERVICE_ARN = (from aws apprunner list-services)"
echo "  MASTRA_APP_RUNNER_SERVICE_ARN  = (from aws apprunner list-services)"
echo "  BACKEND_API_URL             = https://<app-runner-backend-url>"
echo "  DATABASE_URL                = postgresql://bunq:<pass>@<aurora-endpoint>:5432/bunq"
echo "  ANTHROPIC_API_KEY           = <key>"
echo "  BUNQ_API_KEY                = <key>"
echo "  BUNQ_INSTALLATION_TOKEN     = <token>"
echo "  BUNQ_DEVICE_ID              = <id>"
echo "  BUNQ_SESSION_TOKEN          = <token>"
echo "  BUNQ_USER_ID                = <id>"
echo "  BUNQ_ACCOUNT_ID             = <id>"
echo "  STORAGE_ENDPOINT            = https://s3.${REGION}.amazonaws.com"
echo "  STORAGE_ACCESS_KEY          = <IAM media user key>"
echo "  STORAGE_SECRET_KEY          = <IAM media user secret>"
echo "  STORAGE_BUCKET              = ${MEDIA_BUCKET}"
echo "  STORAGE_PUBLIC_URL          = https://<cloudfront-or-s3-url>/${MEDIA_BUCKET}"
echo "════════════════════════════════════════════════════════"
