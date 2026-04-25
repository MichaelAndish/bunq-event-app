#!/usr/bin/env bash
# Push all app secrets to AWS Secrets Manager.
# Run once (or to rotate values). CI only needs AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.
#
# Usage:
#   AWS_REGION=us-east-1 bash scripts/setup-aws-secrets.sh
#   AWS_REGION=us-east-1 bash scripts/setup-aws-secrets.sh --env .env.production
set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
SECRET_NAME="bunq/production"
ENV_FILE=".env"

# Allow --env override
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV_FILE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run from the repo root."
  exit 1
fi

# Read values from .env (skip comments and blank lines)
read_env() {
  local KEY="$1"
  grep "^${KEY}=" "$ENV_FILE" | head -1 | cut -d= -f2-
}

# Read private key from PEM file if BUNQ_PRIVATE_KEY is not set directly
BUNQ_PRIVATE_KEY=$(read_env BUNQ_PRIVATE_KEY)
if [[ -z "$BUNQ_PRIVATE_KEY" ]]; then
  KEY_PATH=$(read_env BUNQ_PRIVATE_KEY_PATH)
  KEY_PATH="${KEY_PATH:-.bunq/bunq-client-private.pem}"
  if [[ -f "$KEY_PATH" ]]; then
    BUNQ_PRIVATE_KEY=$(cat "$KEY_PATH")
  else
    echo "Warning: BUNQ_PRIVATE_KEY not found in $ENV_FILE and $KEY_PATH does not exist"
    BUNQ_PRIVATE_KEY=""
  fi
fi

# Build the JSON secret payload
SECRET_JSON=$(jq -n \
  --arg anthropic_api_key     "$(read_env ANTHROPIC_API_KEY)" \
  --arg bunq_api_key          "$(read_env BUNQ_API_KEY)" \
  --arg bunq_installation_token "$(read_env BUNQ_INSTALLATION_TOKEN)" \
  --arg bunq_session_token    "$(read_env BUNQ_SESSION_TOKEN)" \
  --arg bunq_user_id          "$(read_env BUNQ_USER_ID)" \
  --arg bunq_account_id       "$(read_env BUNQ_DEFAULT_MONETARY_ACCOUNT_ID)" \
  --arg bunq_private_key      "$BUNQ_PRIVATE_KEY" \
  --arg database_url          "$(read_env DATABASE_URL)" \
  --arg storage_endpoint      "$(read_env STORAGE_ENDPOINT)" \
  --arg storage_bucket        "$(read_env STORAGE_BUCKET)" \
  --arg storage_access_key    "$(read_env STORAGE_ACCESS_KEY)" \
  --arg storage_secret_key    "$(read_env STORAGE_SECRET_KEY)" \
  --arg storage_public_url    "$(read_env STORAGE_PUBLIC_URL)" \
  --arg storage_region        "$(read_env STORAGE_REGION)" \
  '{
    ANTHROPIC_API_KEY:          $anthropic_api_key,
    BUNQ_API_KEY:               $bunq_api_key,
    BUNQ_INSTALLATION_TOKEN:    $bunq_installation_token,
    BUNQ_SESSION_TOKEN:         $bunq_session_token,
    BUNQ_USER_ID:               $bunq_user_id,
    BUNQ_DEFAULT_MONETARY_ACCOUNT_ID: $bunq_account_id,
    BUNQ_PRIVATE_KEY:           $bunq_private_key,
    DATABASE_URL:               $database_url,
    STORAGE_ENDPOINT:           $storage_endpoint,
    STORAGE_BUCKET:             $storage_bucket,
    STORAGE_ACCESS_KEY:         $storage_access_key,
    STORAGE_SECRET_KEY:         $storage_secret_key,
    STORAGE_PUBLIC_URL:         $storage_public_url,
    STORAGE_REGION:             $storage_region
  }')

# Create or update the secret
EXISTING=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query 'ARN' --output text 2>/dev/null || echo "")

if [[ -z "$EXISTING" ]]; then
  ARN=$(aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "bunq platform production secrets" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" \
    --query 'ARN' --output text)
  echo "✅ Created secret: $ARN"
else
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" > /dev/null
  echo "✅ Updated secret: $SECRET_NAME (ARN: $EXISTING)"
fi

echo ""
echo "Add these TWO GitHub secrets (Settings → Secrets and variables → Actions):"
echo "  AWS_ACCESS_KEY_ID     = <CI IAM user access key>"
echo "  AWS_SECRET_ACCESS_KEY = <CI IAM user secret key>"
echo ""
echo "Add this GitHub variable:"
echo "  AWS_REGION = $REGION"
echo ""
echo "All other secrets are now stored in AWS Secrets Manager: $SECRET_NAME"
