#!/usr/bin/env bash
# ── bunq Platform — one-command local deploy to AWS ────────────────────────
#
# Prerequisites:
#   - AWS CLI v2 (https://aws.amazon.com/cli/)
#   - Docker (running)
#   - Node 20+  (for the bunq session refresh)
#   - jq
#
# Usage (export AWS credentials first, then run):
#
#   export AWS_DEFAULT_REGION="us-east-1"
#   export AWS_ACCESS_KEY_ID="..."
#   export AWS_SECRET_ACCESS_KEY="..."
#   export AWS_SESSION_TOKEN="..."          # only when using temporary creds
#
#   bash scripts/deploy.sh                  # deploy everything
#   bash scripts/deploy.sh --skip-frontend  # skip S3/CloudFront step
#   bash scripts/deploy.sh --skip-backend   # skip backend/mastra images
#   bash scripts/deploy.sh --skip-session   # skip bunq session refresh
#
set -euo pipefail

# ── colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}▶ $*${RESET}"; }
ok()    { echo -e "${GREEN}✅ $*${RESET}"; }
warn()  { echo -e "${YELLOW}⚠️  $*${RESET}"; }
die()   { echo -e "${RED}❌ $*${RESET}" >&2; exit 1; }

# ── argument parsing ─────────────────────────────────────────────────────────
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_MASTRA=false
SKIP_SESSION=false
INTERACTIVE=false

if [[ $# -eq 0 ]]; then
  INTERACTIVE=true
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-frontend) SKIP_FRONTEND=true; shift ;;
    --skip-backend)  SKIP_BACKEND=true;  shift ;;
    --skip-mastra)   SKIP_MASTRA=true;   shift ;;
    --skip-session)  SKIP_SESSION=true;  shift ;;
    --interactive|-i) INTERACTIVE=true; shift ;;
    --help|-h)
      echo "Usage: bash scripts/deploy.sh [--skip-frontend] [--skip-backend] [--skip-mastra] [--skip-session] [--interactive|-i]"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

if [[ "$INTERACTIVE" == true ]]; then
  echo -e "\n${CYAN}What would you like to build and deploy?${RESET}"
  echo "1) All services (Frontend, Backend, Mastra)"
  echo "2) Frontend only"
  echo "3) Backend only"
  echo "4) Mastra only"
  echo "5) Backend & Mastra only"
  echo "q) Quit"
  read -p "Select an option [1-5, q]: " OPTION
  case "$OPTION" in
    1) ;; # defaults are false
    2) SKIP_BACKEND=true; SKIP_MASTRA=true ;;
    3) SKIP_FRONTEND=true; SKIP_MASTRA=true ;;
    4) SKIP_FRONTEND=true; SKIP_BACKEND=true ;;
    5) SKIP_FRONTEND=true ;;
    q|Q) echo "Aborted."; exit 0 ;;
    *) die "Invalid option" ;;
  esac
fi

# ── dependency checks ────────────────────────────────────────────────────────
for cmd in aws docker node jq; do
  command -v "$cmd" &>/dev/null || die "'$cmd' not found. Please install it first."
done

# ── verify AWS credentials are set ──────────────────────────────────────────
step "Verifying AWS credentials"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || die "AWS credentials are invalid or not set. Export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (and AWS_SESSION_TOKEN if using temp creds)."
REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
ok "Account: $ACCOUNT  Region: $REGION"

# ── fetch infra metadata from bunq/infra secret ──────────────────────────────
step "Fetching infra metadata from AWS Secrets Manager (bunq/infra)"
INFRA=$(aws secretsmanager get-secret-value \
  --secret-id bunq/infra \
  --query SecretString --output text \
  --region "$REGION" 2>/dev/null) \
  || die "Could not read bunq/infra secret. Run 'bash scripts/setup-aws-infra-secret.sh' first."

geti() { echo "$INFRA" | jq -r ".$1 // empty"; }

BACKEND_ECR=$(geti BACKEND_ECR_REPO)
MASTRA_ECR=$(geti MASTRA_ECR_REPO)
FRONTEND_BUCKET=$(geti S3_FRONTEND_BUCKET)
CF_DISTRIBUTION_ID=$(geti CLOUDFRONT_DISTRIBUTION_ID)
BACKEND_SERVICE_ARN=$(geti BACKEND_APP_RUNNER_SERVICE_ARN)
MASTRA_SERVICE_ARN=$(geti MASTRA_APP_RUNNER_SERVICE_ARN)
BACKEND_API_URL=$(geti BACKEND_API_URL)
FRONTEND_ORIGIN=$(geti FRONTEND_ORIGIN)

[[ -n "$BACKEND_ECR" ]]          || die "BACKEND_ECR_REPO missing from bunq/infra secret"
[[ -n "$MASTRA_ECR" ]]           || die "MASTRA_ECR_REPO missing from bunq/infra secret"
[[ -n "$FRONTEND_BUCKET" ]]      || die "S3_FRONTEND_BUCKET missing from bunq/infra secret"
[[ -n "$CF_DISTRIBUTION_ID" ]]   || die "CLOUDFRONT_DISTRIBUTION_ID missing from bunq/infra secret"
[[ -n "$BACKEND_SERVICE_ARN" ]]  || die "BACKEND_APP_RUNNER_SERVICE_ARN missing from bunq/infra secret"
[[ -n "$MASTRA_SERVICE_ARN" ]]   || die "MASTRA_APP_RUNNER_SERVICE_ARN missing from bunq/infra secret"
[[ -n "$BACKEND_API_URL" ]]      || die "BACKEND_API_URL missing from bunq/infra secret"
[[ -n "$FRONTEND_ORIGIN" ]]      || die "FRONTEND_ORIGIN missing from bunq/infra secret"

ok "Infra metadata loaded"

# ── fetch app secrets from bunq/production ───────────────────────────────────
step "Fetching app secrets from AWS Secrets Manager (bunq/production)"
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id bunq/production \
  --query SecretString --output text \
  --region "$REGION") \
  || die "Could not read bunq/production secret. Run 'bash scripts/setup-aws-secrets.sh' first."

get() { echo "$SECRET" | jq -r ".$1 // empty"; }
ok "App secrets loaded"

# ── generate .env in a temp directory ────────────────────────────────────────
TMPDIR_ENV=$(mktemp -d)
trap 'rm -rf "$TMPDIR_ENV"' EXIT
ENV_FILE="$TMPDIR_ENV/.env"

printf '%s\n' \
  "NODE_ENV=production" \
  "PORT=9191" \
  "DATABASE_URL=$(get DATABASE_URL)" \
  "ANTHROPIC_API_KEY=$(get ANTHROPIC_API_KEY)" \
  "MASTRA_MODEL=$(get MASTRA_MODEL)" \
  "MASTRA_FAST_MODEL=$(get MASTRA_FAST_MODEL)" \
  "BUNQ_API_KEY=$(get BUNQ_API_KEY)" \
  "BUNQ_INSTALLATION_TOKEN=$(get BUNQ_INSTALLATION_TOKEN)" \
  "BUNQ_SESSION_TOKEN=$(get BUNQ_SESSION_TOKEN)" \
  "BUNQ_USER_ID=$(get BUNQ_USER_ID)" \
  "BUNQ_DEFAULT_MONETARY_ACCOUNT_ID=$(get BUNQ_DEFAULT_MONETARY_ACCOUNT_ID)" \
  "BUNQ_PRIVATE_KEY=$(get BUNQ_PRIVATE_KEY)" \
  "BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com/v1" \
  "BUNQ_USE_MOCK=false" \
  "STORAGE_ENDPOINT=$(get STORAGE_ENDPOINT)" \
  "STORAGE_BUCKET=$(get STORAGE_BUCKET)" \
  "STORAGE_ACCESS_KEY=$(get STORAGE_ACCESS_KEY)" \
  "STORAGE_SECRET_KEY=$(get STORAGE_SECRET_KEY)" \
  "STORAGE_PUBLIC_URL=$(get STORAGE_PUBLIC_URL)" \
  "STORAGE_FORCE_PATH_STYLE=false" \
  "STORAGE_REGION=$REGION" \
  > "$ENV_FILE"

ok ".env generated ($(wc -l < "$ENV_FILE" | tr -d ' ') lines)"

# ── optionally refresh bunq session token ────────────────────────────────────
if [[ "$SKIP_SESSION" == false ]]; then
  step "Refreshing bunq session token"
  mkdir -p "$TMPDIR_ENV/.bunq"
  printf '%s' "$(get BUNQ_PRIVATE_KEY)" > "$TMPDIR_ENV/.bunq/client-private.pem"
  chmod 600 "$TMPDIR_ENV/.bunq/client-private.pem"
  echo "BUNQ_PRIVATE_KEY_PATH=$TMPDIR_ENV/.bunq/client-private.pem" >> "$ENV_FILE"

  node scripts/bunq-provision.mjs --refresh-session --write-env "$ENV_FILE"
  SESSION_TOKEN=$(grep '^BUNQ_SESSION_TOKEN=' "$ENV_FILE" | cut -d= -f2-)

  # Write the new session token back to Secrets Manager
  UPDATED=$(echo "$SECRET" | jq --arg t "$SESSION_TOKEN" '.BUNQ_SESSION_TOKEN = $t')
  aws secretsmanager put-secret-value \
    --secret-id bunq/production \
    --secret-string "$UPDATED" \
    --region "$REGION" > /dev/null
  # Refresh local $SECRET variable so downstream steps get the new token
  SECRET=$(aws secretsmanager get-secret-value \
    --secret-id bunq/production \
    --query SecretString --output text \
    --region "$REGION")
  ok "Session token refreshed and saved to Secrets Manager"
else
  warn "Skipping bunq session refresh (--skip-session)"
  SESSION_TOKEN=$(get BUNQ_SESSION_TOKEN)
fi

# ── ECR login ────────────────────────────────────────────────────────────────
step "Logging in to ECR"
ECR_HOST="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_HOST"
ok "ECR login successful"

# ── build & push Docker images ───────────────────────────────────────────────
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local-$(date +%s)")

if [[ "$SKIP_BACKEND" == false ]]; then
  step "Building backend image  →  $BACKEND_ECR:$SHA"
  cp "$ENV_FILE" backend/.env
  docker build -f backend/Dockerfile.prod \
    -t "$BACKEND_ECR:$SHA" \
    -t "$BACKEND_ECR:latest" \
    backend
  docker push "$BACKEND_ECR:$SHA"
  docker push "$BACKEND_ECR:latest"
  ok "Backend image pushed"
else
  warn "Skipping backend image build (--skip-backend)"
fi

if [[ "$SKIP_MASTRA" == false ]]; then
  step "Building Mastra image  →  $MASTRA_ECR:$SHA"
  docker build -f backend/Dockerfile.mastra \
    -t "$MASTRA_ECR:$SHA" \
    -t "$MASTRA_ECR:latest" \
    backend
  docker push "$MASTRA_ECR:$SHA"
  docker push "$MASTRA_ECR:latest"
  ok "Mastra image pushed"
else
  warn "Skipping Mastra image build (--skip-mastra)"
fi

# ── deploy frontend → S3 + CloudFront ────────────────────────────────────────
if [[ "$SKIP_FRONTEND" == false ]]; then
  step "Building frontend"
  (
    cd frontend
    VITE_API_URL="$BACKEND_API_URL" npm ci --prefer-offline
    VITE_API_URL="$BACKEND_API_URL" npm run build
  )

  step "Syncing frontend to S3: s3://$FRONTEND_BUCKET/"
  aws s3 sync frontend/dist/ "s3://$FRONTEND_BUCKET/" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --region "$REGION"
  aws s3 cp frontend/dist/index.html \
    "s3://$FRONTEND_BUCKET/index.html" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --region "$REGION"
  ok "Frontend synced to S3"

  step "Invalidating CloudFront distribution: $CF_DISTRIBUTION_ID"
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DISTRIBUTION_ID" \
    --paths "/*" \
    --output text --query 'Invalidation.Id'
  ok "CloudFront invalidation created"
else
  warn "Skipping frontend deploy (--skip-frontend)"
fi

# ── deploy backend App Runner ─────────────────────────────────────────────────
if [[ "$SKIP_BACKEND" == false ]]; then
  step "Updating backend App Runner service"
  aws apprunner update-service \
    --service-arn "$BACKEND_SERVICE_ARN" \
    --region "$REGION" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"$BACKEND_ECR:$SHA\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"9191\",
          \"RuntimeEnvironmentVariables\": {
            \"DATABASE_URL\":                       \"$(get DATABASE_URL)\",
            \"ANTHROPIC_API_KEY\":                  \"$(get ANTHROPIC_API_KEY)\",
            \"MASTRA_MODEL\":                       \"$(get MASTRA_MODEL)\",
            \"MASTRA_FAST_MODEL\":                  \"$(get MASTRA_FAST_MODEL)\",
            \"BUNQ_API_KEY\":                       \"$(get BUNQ_API_KEY)\",
            \"BUNQ_INSTALLATION_TOKEN\":             \"$(get BUNQ_INSTALLATION_TOKEN)\",
            \"BUNQ_PRIVATE_KEY\":                   \"$(get BUNQ_PRIVATE_KEY)\",
            \"BUNQ_SESSION_TOKEN\":                  \"$SESSION_TOKEN\",
            \"BUNQ_USER_ID\":                       \"$(get BUNQ_USER_ID)\",
            \"BUNQ_DEFAULT_MONETARY_ACCOUNT_ID\":   \"$(get BUNQ_DEFAULT_MONETARY_ACCOUNT_ID)\",
            \"BUNQ_USE_MOCK\":                      \"false\",
            \"FRONTEND_ORIGIN\":                    \"$FRONTEND_ORIGIN\",
            \"STORAGE_ENDPOINT\":                   \"\",
            \"STORAGE_ACCESS_KEY\":                 \"$(get STORAGE_ACCESS_KEY)\",
            \"STORAGE_SECRET_KEY\":                 \"$(get STORAGE_SECRET_KEY)\",
            \"STORAGE_BUCKET\":                     \"$(get STORAGE_BUCKET)\",
            \"STORAGE_PUBLIC_URL\":                 \"$(get STORAGE_PUBLIC_URL)\",
            \"STORAGE_FORCE_PATH_STYLE\":           \"false\",
            \"STORAGE_REGION\":                     \"$REGION\",
            \"PORT\":                               \"9191\",
            \"NODE_ENV\":                           \"production\"
          }
        }
      }
    }" > /dev/null
  ok "Backend App Runner updated"
fi

if [[ "$SKIP_MASTRA" == false ]]; then
  step "Updating Mastra App Runner service"
  aws apprunner update-service \
    --service-arn "$MASTRA_SERVICE_ARN" \
    --region "$REGION" \
    --source-configuration "{
      \"ImageRepository\": {
        \"ImageIdentifier\": \"$MASTRA_ECR:$SHA\",
        \"ImageRepositoryType\": \"ECR\",
        \"ImageConfiguration\": {
          \"Port\": \"4111\",
          \"RuntimeEnvironmentVariables\": {
            \"DATABASE_URL\":      \"$(get DATABASE_URL)\",
            \"ANTHROPIC_API_KEY\": \"$(get ANTHROPIC_API_KEY)\",
            \"MASTRA_MODEL\":      \"$(get MASTRA_MODEL)\",
            \"MASTRA_FAST_MODEL\": \"$(get MASTRA_FAST_MODEL)\",
            \"NODE_ENV\":          \"production\"
          }
        }
      }
    }" > /dev/null
  ok "Mastra App Runner updated"
fi

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  🚀 Deploy complete!${RESET}"
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
[[ "$SKIP_FRONTEND" == false ]] && echo -e "  Frontend : https://<your-cloudfront-url>"
[[ "$SKIP_BACKEND"  == false ]] && echo -e "  Backend  : $BACKEND_API_URL"
echo ""
