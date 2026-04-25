# bunq Platform — AWS Deployment Guide

Every push to `main` builds, deploys, and rotates credentials automatically.
**No AWS credentials are stored in GitHub** — the CI/CD pipeline authenticates via OIDC.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer / GitHub Actions                                     │
│                                                                 │
│  git push main  ──▶  GitHub Actions (OIDC token)               │
│                             │                                   │
│                             ▼                                   │
│                    AWS IAM (assumes deploy role)                │
│                             │                                   │
│         ┌───────────────────┼────────────────────┐             │
│         ▼                   ▼                    ▼             │
│   Secrets Manager      ECR push             S3 sync            │
│   (bunq/production     (backend             (frontend           │
│    bunq/infra)          bunq-mastra)         static files)      │
│                             │                    │             │
│                             ▼                    ▼             │
│                     App Runner              CloudFront          │
│                     (backend :9191          (CDN cache          │
│                      mastra  :4111)          invalidated)       │
│                             │                                   │
│                             ▼                                   │
│                     Aurora Serverless v2 (PostgreSQL 16)        │
│                     (private VPC — no public endpoint)          │
└─────────────────────────────────────────────────────────────────┘
```

### How secrets reach each service

| Secret | Stored in | Reaches app via |
|--------|-----------|-----------------|
| `ANTHROPIC_API_KEY` | `bunq/production` (Secrets Manager) | Injected as App Runner env var at deploy time |
| `BUNQ_API_KEY`, `BUNQ_PRIVATE_KEY`, etc. | `bunq/production` | Injected as App Runner env var at deploy time |
| `DATABASE_URL` | `bunq/production` | Injected as App Runner env var at deploy time |
| `STORAGE_ACCESS_KEY/SECRET_KEY` | `bunq/production` | Injected as App Runner env var → backend uses AWS SDK |
| Infra IDs (ECR URLs, bucket name, ARNs) | `bunq/infra` | Read by the deploy script/workflow only |

> **Answer: Anthropic key** — `ANTHROPIC_API_KEY` is read automatically from `bunq/production` in Secrets Manager. The deploy script/workflow fetches it and injects it into the App Runner runtime environment. You only need to store it in Secrets Manager once (via `scripts/setup-aws-secrets.sh`). The app never fetches it at runtime from Secrets Manager — it arrives as a plain env var.

> **Answer: S3 for media** — The backend uses the `STORAGE_*` env vars injected at deploy time. In production: `STORAGE_ENDPOINT` is **empty** (the AWS SDK auto-routes to real S3), `STORAGE_ACCESS_KEY/SECRET_KEY` are IAM credentials for the media bucket, and `STORAGE_FORCE_PATH_STYLE=false`. In local dev: MinIO runs at `http://minio:9000` with path-style enabled — docker-compose overrides these automatically.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI v2 | ≥ 2.15 | All AWS operations |
| Docker | ≥ 24 | Build and push images |
| Node.js | ≥ 20 | bunq provisioning script |
| jq | any | JSON parsing in shell scripts |

Install check:
```bash
aws --version && docker --version && node --version && jq --version
```

---

## Step 1 — Bootstrap AWS infrastructure (one-time)

Run with **admin** credentials once per AWS account:

```bash
export AWS_DEFAULT_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

AWS_REGION=us-east-1 APP_NAME=bunq bash infra/bootstrap.sh
```

Creates (all idempotent — safe to re-run):

- Two ECR repositories: `bunq-backend`, `bunq-mastra`
- S3 bucket for frontend static files (`bunq-frontend-<account-id>`)
- S3 bucket for event media (`bunq-media-<account-id>`)
- VPC + two private subnets (App Runner ↔ Aurora)
- Aurora Serverless v2 PostgreSQL 16 cluster (`bunq-db`) — **save the printed password**
- App Runner VPC connector
- IAM role for App Runner ECR pull access
- App Runner service: `bunq-backend` (port 9191)
- App Runner service: `bunq-mastra` (port 4111)
- CloudFront distribution → frontend S3 bucket

> ⚠️ **Save the Aurora password** printed by the script — it is only shown once.

---

## Step 2 — Provision bunq sandbox credentials (one-time)

```bash
# Company sandbox account (default)
node scripts/bunq-provision.mjs

# Personal sandbox account
node scripts/bunq-provision.mjs --user-type person
```

This creates an RSA key pair, registers an installation and device server with the bunq sandbox API, opens a session, and writes all credentials to `.env`.

---

## Step 3 — Push all secrets to AWS Secrets Manager (one-time)

```bash
# Push app secrets (reads from .env)
bash scripts/setup-aws-secrets.sh

# Push infra metadata (ECR URLs, bucket names, App Runner ARNs, etc.)
# Edit this file first with values printed by infra/bootstrap.sh:
bash scripts/setup-aws-infra-secret.sh
```

After this, `bunq/production` in Secrets Manager holds:

```
ANTHROPIC_API_KEY, BUNQ_API_KEY, BUNQ_INSTALLATION_TOKEN,
BUNQ_SESSION_TOKEN, BUNQ_USER_ID, BUNQ_DEFAULT_MONETARY_ACCOUNT_ID,
BUNQ_PRIVATE_KEY, DATABASE_URL,
STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY,
STORAGE_SECRET_KEY, STORAGE_PUBLIC_URL, STORAGE_REGION
```

And `bunq/infra` holds:

```
BACKEND_ECR_REPO, MASTRA_ECR_REPO, S3_FRONTEND_BUCKET,
CLOUDFRONT_DISTRIBUTION_ID, BACKEND_APP_RUNNER_SERVICE_ARN,
MASTRA_APP_RUNNER_SERVICE_ARN, BACKEND_API_URL
```

> **No secrets live in GitHub.** All application secrets are in Secrets Manager.

---

## Step 4 — Configure GitHub Actions via OIDC (one-time)

GitHub Actions authenticates to AWS via **OIDC federation** — no static keys stored in GitHub.

### 4a. Create the OIDC trust + IAM deploy role

```bash
bash scripts/setup-github-oidc.sh \
  --github-org  <your-github-org-or-username> \
  --github-repo bunq
```

This creates:
- A GitHub OIDC identity provider in your AWS account
- An IAM role `bunq-github-deploy-role` with a least-privilege policy scoped to:
  - `secretsmanager:GetSecretValue/PutSecretValue` on `bunq/*`
  - ECR push/pull
  - S3 sync on `bunq-frontend-*`
  - CloudFront invalidations
  - App Runner `update-service`

### 4b. Add ONE variable to GitHub (not a secret)

Go to **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Variable | Value |
|----------|-------|
| `AWS_DEPLOY_ROLE_ARN` | Printed by the script above, e.g. `arn:aws:iam::479747410831:role/bunq-github-deploy-role` |
| `AWS_REGION` | `us-east-1` |

That's it. **No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in GitHub — ever.**

---

## Step 5 — First CI/CD deploy

Push to `main`:

```bash
git push origin main
```

The pipeline runs these jobs in order:

```
generate-env ──┬──▶ refresh-bunq-session ──┬──▶ build-push-backend ──▶ deploy-backend
               │                           │
               │                           └──▶ build-push-mastra  ──▶ deploy-mastra
               │
               └──▶ deploy-frontend (parallel)
```

Each job:
1. **generate-env** — assumes IAM role via OIDC, reads both Secrets Manager secrets, writes `.env`, uploads as a short-lived Actions artifact
2. **refresh-bunq-session** — downloads `.env`, refreshes the bunq session token, writes the new token back to `bunq/production`
3. **build-push-backend / build-push-mastra** — builds Docker images, pushes to ECR (tagged with `git sha` + `latest`)
4. **deploy-frontend** — `npm run build` with `VITE_API_URL` injected, `aws s3 sync`, CloudFront invalidation
5. **deploy-backend / deploy-mastra** — reads all secrets fresh from Secrets Manager, calls `aws apprunner update-service` with the full runtime env

Watch progress: **Actions** tab → **Deploy to AWS**

---

## Local deploy (one command)

Run a full production deploy from your machine without touching GitHub:

```bash
export AWS_DEFAULT_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."   # required when using temporary/SSO credentials

bash scripts/deploy.sh
# or via Make:
make deploy
```

### Partial deploys

```bash
# Only rebuild and deploy backend/mastra (skip frontend S3 sync)
bash scripts/deploy.sh --skip-frontend

# Only sync frontend (skip Docker build + App Runner update)
bash scripts/deploy.sh --skip-backend

# Skip bunq session refresh (faster if token is still valid)
bash scripts/deploy.sh --skip-session

# Combine flags
bash scripts/deploy.sh --skip-session --skip-frontend
```

The script:
1. Validates AWS credentials via `sts get-caller-identity`
2. Reads all infra metadata from `bunq/infra`
3. Reads all app secrets from `bunq/production`
4. Optionally refreshes the bunq session token and writes it back to Secrets Manager
5. Logs into ECR
6. Builds and pushes Docker images (tagged with `git rev-parse --short HEAD`)
7. Builds the frontend and syncs to S3
8. Invalidates CloudFront
9. Updates both App Runner services with the full runtime env

---

## Session token rotation

bunq sandbox session tokens expire after ~24 hours. Rotation happens **automatically** on every CI deploy. To rotate manually:

```bash
# Via the deploy script (fastest — also updates Secrets Manager)
bash scripts/deploy.sh --skip-frontend --skip-backend

# Via the GitHub Actions UI
# Actions → Deploy to AWS → Run workflow → Run workflow

# Directly via the provisioning script (writes to local .env only)
node scripts/bunq-provision.mjs --refresh-session
# Then update Secrets Manager manually:
bash scripts/setup-aws-secrets.sh
```

---

## Ongoing operations

### Check service status

```bash
# App Runner deployment status
aws apprunner describe-service \
  --service-arn <BACKEND_APP_RUNNER_SERVICE_ARN> \
  --query 'Service.Status' --output text

# Expected: RUNNING (during deploy: OPERATION_IN_PROGRESS — wait 2–3 min)
```

### View live logs

```bash
# Backend application logs
aws logs tail /aws/apprunner/bunq-backend/<service-id>/application --follow

# Mastra application logs
aws logs tail /aws/apprunner/bunq-mastra/<service-id>/application --follow

# Get <service-id>:
aws apprunner describe-service \
  --service-arn <ARN> \
  --query 'Service.ServiceId' --output text
```

### Scale App Runner

```bash
aws apprunner update-service \
  --service-arn <ARN> \
  --instance-configuration "Cpu=2 vCPU,Memory=4 GB"
```

### Rollback to a previous image

```bash
# List recent image tags in ECR
aws ecr describe-images \
  --repository-name bunq-backend \
  --query 'sort_by(imageDetails, &imagePushedAt)[-5:].imageTags' \
  --output table

# Roll back
aws apprunner update-service \
  --service-arn <BACKEND_APP_RUNNER_SERVICE_ARN> \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"<ECR_REPO>:<PREVIOUS_SHA>\",
      \"ImageRepositoryType\": \"ECR\",
      \"ImageConfiguration\": { \"Port\": \"9191\" }
    }
  }"
```

### Rotate a secret manually

```bash
# Update a single value in bunq/production
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id bunq/production --query SecretString --output text)

UPDATED=$(echo "$SECRET" | jq --arg v "new-value" '.ANTHROPIC_API_KEY = $v')

aws secretsmanager put-secret-value \
  --secret-id bunq/production \
  --secret-string "$UPDATED"

# Then redeploy to pick up the new value:
bash scripts/deploy.sh --skip-frontend --skip-session
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `OPERATION_IN_PROGRESS` on App Runner | Deployment in flight | Wait 2–3 min; check logs |
| `MODULE_NOT_FOUND` in container | npm package added but image not rebuilt | Push to `main` or run `bash scripts/deploy.sh` |
| `bunq session expired` / 401 on API | Token > 24h old | `bash scripts/deploy.sh --skip-frontend --skip-backend` |
| CloudFront returning stale `index.html` | CF cache not cleared | `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"` |
| Aurora `connection refused` | VPC connector misconfigured | Re-run `infra/bootstrap.sh` |
| `STORAGE_FORCE_PATH_STYLE` error | Path-style enabled against real S3 | Ensure `STORAGE_FORCE_PATH_STYLE=false` and `STORAGE_ENDPOINT` is empty in production |
| OIDC `Error assuming role` in CI | Role ARN wrong or repo not trusted | Re-run `bash scripts/setup-github-oidc.sh` |
| `Could not read bunq/infra secret` | Secret not yet created | Run `bash scripts/setup-aws-infra-secret.sh` |

---

## Local development

```bash
# First time only
cp .env.production.example .env
node scripts/bunq-provision.mjs  # creates .bunq/ keys and fills .env

make install   # Build Docker images
make run       # Start backend + mastra (detached)
make status    # Show container health + URLs
make logs      # Follow all logs

# After adding/updating npm packages
make install && make run

# Refresh expired bunq session
make refresh-session
```

Services when running locally:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:9292 |
| Backend API | http://localhost:9191 |
| Health check | http://localhost:9191/health |
| Mastra Studio | http://localhost:4111 |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| MinIO S3 API | http://localhost:9000/bunq-events |
