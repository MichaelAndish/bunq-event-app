#!/usr/bin/env bash
# ── bunq Platform — set up GitHub OIDC → IAM Role for zero-secret CI/CD ───
#
# Run ONCE per AWS account after infra/bootstrap.sh.
# After this script:
#   • GitHub Actions assumes the IAM role via OIDC (no static keys in GitHub)
#   • Only ONE GitHub Actions variable is needed:
#       AWS_DEPLOY_ROLE_ARN  (not a secret — it's just an ARN)
#   • All app secrets remain in AWS Secrets Manager (bunq/production, bunq/infra)
#
# Usage:
#   export AWS_DEFAULT_REGION="us-east-1"
#   export AWS_ACCESS_KEY_ID="..."
#   export AWS_SECRET_ACCESS_KEY="..."
#   bash scripts/setup-github-oidc.sh --github-org <org-or-user> --github-repo <repo-name>
#
# Example:
#   bash scripts/setup-github-oidc.sh --github-org michaelandish --github-repo bunq
#
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'
ok()  { echo -e "${GREEN}✅ $*${RESET}"; }
step(){ echo -e "\n${CYAN}▶ $*${RESET}"; }
die() { echo -e "${RED}❌ $*${RESET}" >&2; exit 1; }

# ── args ─────────────────────────────────────────────────────────────────────
GITHUB_ORG=""
GITHUB_REPO=""
REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
ROLE_NAME="bunq-github-deploy-role"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --github-org)  GITHUB_ORG="$2";  shift 2 ;;
    --github-repo) GITHUB_REPO="$2"; shift 2 ;;
    --role-name)   ROLE_NAME="$2";   shift 2 ;;
    --help|-h)
      echo "Usage: bash scripts/setup-github-oidc.sh --github-org <org> --github-repo <repo>"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$GITHUB_ORG" ]]  || die "--github-org is required"
[[ -n "$GITHUB_REPO" ]] || die "--github-repo is required"

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT  Region: $REGION"
echo "GitHub: $GITHUB_ORG/$GITHUB_REPO  →  Role: $ROLE_NAME"

# ── 1. Create/verify the GitHub OIDC provider ────────────────────────────────
step "Setting up GitHub OIDC provider"
OIDC_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

EXISTING=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?Arn=='${OIDC_ARN}'].Arn" \
  --output text 2>/dev/null || echo "")

if [[ -z "$EXISTING" ]]; then
  # GitHub's OIDC thumbprint (stable — sha1 of their cert chain root)
  THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "$THUMBPRINT" \
    --output text --query 'OpenIDConnectProviderArn' > /dev/null
  ok "OIDC provider created"
else
  ok "OIDC provider already exists: $OIDC_ARN"
fi

# ── 2. Create the IAM deploy role ─────────────────────────────────────────────
step "Creating IAM role: $ROLE_NAME"

TRUST_POLICY=$(jq -n \
  --arg account "$ACCOUNT" \
  --arg org     "$GITHUB_ORG" \
  --arg repo    "$GITHUB_REPO" \
  '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::\($account):oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:\($org)/\($repo):*"
        }
      }
    }]
  }')

EXISTING_ROLE=$(aws iam get-role --role-name "$ROLE_NAME" \
  --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [[ -z "$EXISTING_ROLE" ]]; then
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "GitHub Actions OIDC deploy role for $GITHUB_ORG/$GITHUB_REPO" \
    --query 'Role.Arn' --output text)
  ok "IAM role created: $ROLE_ARN"
else
  # Update trust policy in case repo changed
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document "$TRUST_POLICY"
  ROLE_ARN="$EXISTING_ROLE"
  ok "IAM role already exists: $ROLE_ARN"
fi

# ── 3. Attach a least-privilege inline policy ─────────────────────────────────
step "Attaching deploy permissions to $ROLE_NAME"

DEPLOY_POLICY=$(jq -n \
  --arg account "$ACCOUNT" \
  --arg region  "$REGION" \
  '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "SecretsManager",
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        "Resource": [
          "arn:aws:secretsmanager:\($region):\($account):secret:bunq/*"
        ]
      },
      {
        "Sid": "ECR",
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ],
        "Resource": "*"
      },
      {
        "Sid": "S3Frontend",
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::bunq-frontend-\($account)",
          "arn:aws:s3:::bunq-frontend-\($account)/*"
        ]
      },
      {
        "Sid": "CloudFront",
        "Effect": "Allow",
        "Action": ["cloudfront:CreateInvalidation"],
        "Resource": "*"
      },
      {
        "Sid": "AppRunner",
        "Effect": "Allow",
        "Action": [
          "apprunner:UpdateService",
          "apprunner:DescribeService"
        ],
        "Resource": [
          "arn:aws:apprunner:\($region):\($account):service/bunq-backend/*",
          "arn:aws:apprunner:\($region):\($account):service/bunq-mastra/*"
        ]
      }
    ]
  }')

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "BunqDeployPolicy" \
  --policy-document "$DEPLOY_POLICY"
ok "Permissions attached"

# ── 4. Print next steps ───────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ OIDC setup complete — zero static credentials needed in GitHub!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Add this ONE GitHub Actions variable (not a secret):"
echo "    Settings → Secrets and variables → Actions → Variables → New"
echo ""
echo "    Name : AWS_DEPLOY_ROLE_ARN"
echo "    Value: $ROLE_ARN"
echo ""
echo "  Also set (if not already):"
echo "    Name : AWS_REGION"
echo "    Value: $REGION"
echo ""
echo "  That's it — no AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed."
echo "════════════════════════════════════════════════════════"
