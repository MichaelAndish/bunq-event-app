# bunq Platform — AWS Deployment Guide

This guide covers the one-time AWS infrastructure setup and ongoing CI/CD pipeline. After completing it, every push to `main` automatically builds, deploys, and refreshes credentials.

---

## Architecture

```
GitHub push → Actions CI/CD
                 ├── backend image  → ECR → App Runner  (port 9191)
                 ├── mastra image   → ECR → App Runner  (port 4111)
                 └── frontend build → S3  → CloudFront

Aurora Serverless v2 (PostgreSQL 16) ← App Runner VPC connector
S3 media bucket ← backend uploads via AWS SDK
```

---

## Prerequisites

- AWS CLI v2 installed and configured (`aws configure`)
- Admin IAM credentials for the bootstrap (a CI-scoped user is created after)
- Node.js 20+ (for `bunq-provision.mjs`)
- Docker Desktop (for local development)

---

## Step 1 — One-time Infrastructure Bootstrap

Run from the repository root with admin credentials:

```bash
AWS_REGION=eu-west-1 APP_NAME=bunq bash infra/bootstrap.sh
```

This creates (all idempotent — safe to re-run):
- Two ECR repositories: `bunq-backend`, `bunq-mastra`
- S3 bucket for frontend static files
- S3 bucket for event media (replaces MinIO in production)
- VPC with two private subnets (for App Runner ↔ Aurora connectivity)
- Aurora Serverless v2 PostgreSQL cluster (`bunq-db`) — **save the password shown**
- App Runner VPC connector
- IAM role for App Runner ECR access
- App Runner service: `bunq-backend`
- App Runner service: `bunq-mastra`
- CloudFront distribution pointed at the frontend S3 bucket

At the end, the script prints all the values you need as GitHub secrets.

---

## Step 2 — Create CI IAM User

Create a dedicated IAM user for GitHub Actions (do NOT use admin credentials in CI):

```bash
aws iam create-user --user-name bunq-github-actions

aws iam attach-user-policy \
  --user-name bunq-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name bunq-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name bunq-github-actions \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

aws iam attach-user-policy \
  --user-name bunq-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess

aws iam create-access-key --user-name bunq-github-actions
```

Save the `AccessKeyId` and `SecretAccessKey` — these become `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub secrets.

---

## Step 3 — bunq Sandbox Provisioning

Run this once to create the sandbox user, RSA key pair, installation, device, and session:

```bash
# Create a sandbox company account
node scripts/bunq-provision.mjs

# Or a personal account
node scripts/bunq-provision.mjs --user-type person
```

This writes credentials to `.env` automatically. Copy the following values from `.env` into GitHub secrets:

| `.env` key | GitHub secret name |
|---|---|
| `BUNQ_API_KEY` | `BUNQ_API_KEY` |
| `BUNQ_INSTALLATION_TOKEN` | `BUNQ_INSTALLATION_TOKEN` |
| `BUNQ_SESSION_TOKEN` | `BUNQ_SESSION_TOKEN` |
| `BUNQ_USER_ID` | `BUNQ_USER_ID` |
| `BUNQ_DEFAULT_MONETARY_ACCOUNT_ID` | `BUNQ_ACCOUNT_ID` |
| `BUNQ_PRIVATE_KEY` (inline PEM from `.bunq/client-private.pem`) | `BUNQ_PRIVATE_KEY` |

To get the inline private key value:
```bash
cat .bunq/client-private.pem
```

> **Session token expiry:** bunq sandbox session tokens expire after ~24 hours. The CI workflow includes a `refresh-session` job that runs automatically on every deploy and can also be triggered manually from the Actions tab.

---

## Step 4 — GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

### AWS

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | CI IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | CI IAM user secret key |
| `BACKEND_ECR_REPO` | e.g. `123456789.dkr.ecr.eu-west-1.amazonaws.com/bunq-backend` |
| `MASTRA_ECR_REPO` | e.g. `123456789.dkr.ecr.eu-west-1.amazonaws.com/bunq-mastra` |
| `S3_FRONTEND_BUCKET` | e.g. `bunq-frontend-123456789` |
| `CLOUDFRONT_DISTRIBUTION_ID` | e.g. `E1ABCDEF12345` |
| `BACKEND_APP_RUNNER_SERVICE_ARN` | From `aws apprunner list-services` |
| `MASTRA_APP_RUNNER_SERVICE_ARN` | From `aws apprunner list-services` |
| `BACKEND_API_URL` | App Runner backend URL, e.g. `https://abc123.eu-west-1.awsapprunner.com` |

### Database

| Secret | Value |
|---|---|
| `DATABASE_URL` | `postgresql://bunq:<password>@<aurora-endpoint>:5432/bunq` |

Get the Aurora endpoint:
```bash
aws rds describe-db-clusters --db-cluster-identifier bunq-db \
  --query 'DBClusters[0].Endpoint' --output text
```

### bunq

| Secret | Value |
|---|---|
| `BUNQ_API_KEY` | From `.env` after provisioning |
| `BUNQ_INSTALLATION_TOKEN` | From `.env` after provisioning |
| `BUNQ_SESSION_TOKEN` | From `.env` after provisioning |
| `BUNQ_USER_ID` | From `.env` after provisioning |
| `BUNQ_ACCOUNT_ID` | From `.env` (`BUNQ_DEFAULT_MONETARY_ACCOUNT_ID`) |
| `BUNQ_PRIVATE_KEY` | Contents of `.bunq/client-private.pem` |

### Storage (S3 media bucket)

| Secret | Value |
|---|---|
| `STORAGE_ENDPOINT` | Leave empty to use AWS S3 (no custom endpoint) |
| `STORAGE_BUCKET` | e.g. `bunq-media-123456789` |
| `STORAGE_ACCESS_KEY` | Same as `AWS_ACCESS_KEY_ID` (or a separate media-only IAM user) |
| `STORAGE_SECRET_KEY` | Same as `AWS_SECRET_ACCESS_KEY` |
| `STORAGE_PUBLIC_URL` | e.g. `https://bunq-media-123456789.s3.eu-west-1.amazonaws.com` |

### AI

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |

### Optional GitHub variable (not secret)

Go to **Settings → Secrets and variables → Actions → Variables**:

| Variable | Value |
|---|---|
| `AWS_REGION` | `eu-west-1` (or your preferred region) |

---

## Step 5 — First Deploy

Push to `main` to trigger the full pipeline:

```bash
git push origin main
```

The workflow will:
1. Build and push `backend` Docker image to ECR
2. Build and push `mastra` Docker image to ECR
3. Build the frontend with `VITE_API_URL` injected and sync to S3
4. Invalidate the CloudFront cache
5. Update both App Runner services with the new image
6. **Auto-generate `.env`** from secrets and refresh the bunq session token

Watch the progress at **Actions** tab in your GitHub repository.

---

## Session Token Refresh

The bunq session token expires after ~24 hours. The workflow refreshes it automatically on every deploy. You can also trigger it manually:

1. Go to **Actions** tab
2. Select **Deploy to AWS**
3. Click **Run workflow** → **Run workflow**

Or run locally and re-upload:
```bash
node scripts/bunq-provision.mjs --refresh-session
```
Then update the `BUNQ_SESSION_TOKEN` GitHub secret with the new value from `.env`.

---

## Ongoing Operations

### Check deployment status
```bash
aws apprunner describe-service \
  --service-arn <BACKEND_APP_RUNNER_SERVICE_ARN> \
  --query 'Service.Status' --output text
```

### View backend logs
```bash
aws logs tail /aws/apprunner/bunq-backend/<service-id>/application --follow
```

### Scale App Runner
```bash
aws apprunner update-service \
  --service-arn <ARN> \
  --instance-configuration "Cpu=2 vCPU,Memory=4 GB"
```

### Rollback
```bash
# Re-deploy a previous image
aws apprunner update-service \
  --service-arn <ARN> \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"<ECR_REPO>:<PREVIOUS_SHA>\",
      \"ImageRepositoryType\": \"ECR\",
      \"ImageConfiguration\": { \"Port\": \"9191\" }
    }
  }"
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App Runner `OPERATION_IN_PROGRESS` | Deployment in flight | Wait 2–3 min |
| `MODULE_NOT_FOUND` in container | Package added locally, image not rebuilt | Push to `main` to rebuild |
| `bunq session expired` | Token >24h old | Trigger workflow or run `--refresh-session` |
| CloudFront returning stale index.html | Cache not invalidated | Workflow does this automatically; force: `aws cloudfront create-invalidation ...` |
| Aurora connection refused | VPC connector misconfigured | Re-run `infra/bootstrap.sh` |
| `STORAGE_FORCE_PATH_STYLE` error | MinIO path-style vs S3 | Ensure `STORAGE_FORCE_PATH_STYLE=false` for AWS S3 |

---

## Local Development

```bash
# First time
cp .env.production.example .env
# Fill in bunq credentials from sandbox provisioning
node scripts/bunq-provision.mjs

make install   # Build Docker images
make run       # Start all services

# After changing npm packages
make install && make run

# Refresh bunq session
make refresh-session
```
