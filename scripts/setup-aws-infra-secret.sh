#!/usr/bin/env bash
# ── bunq Platform — write infra metadata to AWS Secrets Manager (bunq/infra) ─
#
# Run after infra/bootstrap.sh to store the infrastructure ARNs, URLs, and
# bucket names that the deploy script/workflow needs to read at deploy time.
#
# Usage:
#   AWS_DEFAULT_REGION="us-east-1" bash scripts/setup-aws-infra-secret.sh \
#     --backend-ecr    <ECR_URL> \
#     --mastra-ecr     <ECR_URL> \
#     --frontend-bucket <S3_BUCKET_NAME> \
#     --cf-id          <CLOUDFRONT_DISTRIBUTION_ID> \
#     --backend-arn    <APP_RUNNER_SERVICE_ARN> \
#     --mastra-arn     <APP_RUNNER_SERVICE_ARN> \
#     --backend-url    <https://...awsapprunner.com> \
#     --frontend-origin <https://...cloudfront.net>
#
# All values are printed by infra/bootstrap.sh. Re-run any time values change.
#
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'
ok()  { echo -e "${GREEN}✅ $*${RESET}"; }
step(){ echo -e "\n${CYAN}▶ $*${RESET}"; }
die() { echo -e "${RED}❌ $*${RESET}" >&2; exit 1; }

REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
SECRET_NAME="bunq/infra"

BACKEND_ECR=""
MASTRA_ECR=""
FRONTEND_BUCKET=""
CF_ID=""
BACKEND_ARN=""
MASTRA_ARN=""
BACKEND_URL=""
FRONTEND_ORIGIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-ecr)      BACKEND_ECR="$2";      shift 2 ;;
    --mastra-ecr)       MASTRA_ECR="$2";       shift 2 ;;
    --frontend-bucket)  FRONTEND_BUCKET="$2";  shift 2 ;;
    --cf-id)            CF_ID="$2";            shift 2 ;;
    --backend-arn)      BACKEND_ARN="$2";      shift 2 ;;
    --mastra-arn)       MASTRA_ARN="$2";       shift 2 ;;
    --backend-url)      BACKEND_URL="$2";      shift 2 ;;
    --frontend-origin)  FRONTEND_ORIGIN="$2";  shift 2 ;;
    --region)           REGION="$2";           shift 2 ;;
    --help|-h)
      sed -n '2,20p' "$0"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# Validate required args
for VAR_NAME in BACKEND_ECR MASTRA_ECR FRONTEND_BUCKET CF_ID BACKEND_ARN MASTRA_ARN BACKEND_URL FRONTEND_ORIGIN; do
  [[ -n "${!VAR_NAME}" ]] || die "--$(echo "$VAR_NAME" | tr '[:upper:]' '[:lower:]' | tr '_' '-') is required"
done

step "Verifying AWS credentials"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text) \
  || die "AWS credentials not set or invalid"
ok "Account: $ACCOUNT  Region: $REGION"

step "Building bunq/infra secret payload"
SECRET_JSON=$(jq -n \
  --arg backend_ecr      "$BACKEND_ECR" \
  --arg mastra_ecr       "$MASTRA_ECR" \
  --arg frontend_bucket  "$FRONTEND_BUCKET" \
  --arg cf_id            "$CF_ID" \
  --arg backend_arn      "$BACKEND_ARN" \
  --arg mastra_arn       "$MASTRA_ARN" \
  --arg backend_url      "$BACKEND_URL" \
  --arg frontend_origin  "$FRONTEND_ORIGIN" \
  '{
    BACKEND_ECR_REPO:              $backend_ecr,
    MASTRA_ECR_REPO:               $mastra_ecr,
    S3_FRONTEND_BUCKET:            $frontend_bucket,
    CLOUDFRONT_DISTRIBUTION_ID:    $cf_id,
    BACKEND_APP_RUNNER_SERVICE_ARN: $backend_arn,
    MASTRA_APP_RUNNER_SERVICE_ARN:  $mastra_arn,
    BACKEND_API_URL:               $backend_url,
    FRONTEND_ORIGIN:               $frontend_origin
  }')

step "Writing to Secrets Manager: $SECRET_NAME"
EXISTING=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query 'ARN' --output text 2>/dev/null || echo "")

if [[ -z "$EXISTING" ]]; then
  ARN=$(aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "bunq platform infrastructure metadata (ECR, S3, CF, App Runner ARNs)" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" \
    --query 'ARN' --output text)
  ok "Created: $ARN"
else
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" > /dev/null
  ok "Updated: $SECRET_NAME  (ARN: $EXISTING)"
fi

echo ""
echo "  Stored in bunq/infra:"
echo "$SECRET_JSON" | jq .
echo ""
echo "  ✅ Both the CI/CD pipeline and 'bash scripts/deploy.sh' will now"
echo "     read these values automatically from Secrets Manager."
