# bunq events

Imagine you are a festival organizer. 

Your biggest problem is ticketing companies hide your customer data. 

You sold 10,000 tickets and have no idea who bought them, who spent the most or when did they buy most. 

With bunq events, you tap a button on the home screen of the bunq app and you are in control of events. 

Build an event page with AI, invite people, gather attendee data and understand their behaviour. 

Now, you can optimise your next event for the best clients, price, and behaviours.

The idea works also for casual events.

Create a pizza night event, invite your friends and split exenses fairly with AI.

bunq events give you financial intelligence to create impactful events.

---

## Benefits

For Business Organizers
- Simplify events & payments. 
- Understand your best buyers.
- Make you best buyers come back. 

For People Organizers
- Plan events with friends.
- Split costs fairly, automatically. 
- See which friends pay fairly. 

For Event Attendee
- Lower event fees for bunq users.
- Get in events with one scan (QR or receipt). 
- Find cool new events near you.

For bunq
- Grow user base with viral loop.
- Tap into the $100B events market (Grand View Research).
- Create business lock-in (organizers rely on data & intelligence).
- Increase user retention and transactions.
- Nudge non-bunq users to get app to access events and get discounts.
- Scale events, from tiny parties to giant festivals.
- Leverage multimodal AI, from photos and videos, to text and voice.
- Tap on existing UX/UI and API, making innovation easier.

---

## How it works

**For organisers**
- Create events manually or let the AI analyse venue photos and generate a complete event draft
- Set multiple ticket tiers with custom pricing (EUR / USD / GBP)
- Manage live, draft, and archived events from one screen
- Track ticket sales and revenue per event

**For attendees**
- Browse and join events
- Purchase tickets via bunq.me payment links — no bunq account required

**Under the hood**
- AI agent (Claude) analyses venue images, auto-fills event details, and suggests ticket pricing
- Uploaded venue images are stored in MinIO (local) or S3 (production) and become the event banner
- Payments are routed through the bunq sandbox API with full RSA-signed request flows
- All data persists in PostgreSQL via Drizzle ORM
- Mastra Studio (port 4111) provides a live UI to test agents, inspect workflow runs, and iterate on prompts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│              React + TypeScript (phone frame)                │
│                       port 9292                              │
└──────────────────────┬──────────────────────────────────────┘
                       │  /api/* (Vite proxy)
┌──────────────────────▼──────────────────────────────────────┐
│                  Hono API  (Node.js)                         │
│                      port 9191                               │
│                                                              │
│  /health     liveness check                                  │
│  /events     CRUD — events + ticket tiers                    │
│  /agent      AI venue analysis + Mastra workflow trigger     │
│  /client     bunq account balance + transactions             │
│                                                              │
│  ┌─────────────────┐   ┌──────────────────────────────┐    │
│  │   Mastra 1.x    │   │      bunq Sandbox API         │    │
│  │  Agents +       │   │  payments, accounts,           │    │
│  │  Workflows +    │   │  request inquiries, bunq.me    │    │
│  │  PG Storage     │   └──────────────────────────────┘    │
│  └────────┬────────┘                                        │
└───────────┼─────────────────────────┬───────────────────────┘
            │                         │
┌───────────▼─────────────┐  ┌────────▼───────────────────────┐
│      PostgreSQL 16       │  │   MinIO  (S3-compatible)        │
│  events / ticket_tiers   │  │   venue images + event banners  │
│  tickets / mastra state  │  │   port 9000 (API)               │
└──────────────────────────┘  │   port 9001 (console)           │
                               └────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              Mastra Studio  (separate container)              │
│                       port 4111                               │
│   test agents · inspect workflow runs · iterate on prompts   │
└──────────────────────────────────────────────────────────────┘
```

### Service breakdown

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `frontend` | Vite + React + TypeScript | 9292 | Phone-frame UI |
| `backend` | Hono + Node.js + TypeScript | 9191 | REST API, AI, bunq integration |
| `mastra` | Mastra CLI dev server | 4111 | Agent Studio UI |
| `db` | PostgreSQL 16 | 5432 | App data + Mastra state |
| `minio` | MinIO (S3-compatible) | 9000 / 9001 | File storage (images) |

### Backend modules

```
backend/src/
├── index.ts           — server entry, CORS, migrations, bucket init
├── config.ts          — env validation via Zod (exits on bad config)
├── db/
│   ├── schema.ts      — Drizzle schema: events, ticket_tiers, tickets
│   ├── migrate.ts     — idempotent SQL migrations run on startup
│   └── client.ts      — pg connection pool
├── storage/
│   └── client.ts      — S3Client factory (MinIO ↔ AWS S3), uploadFile()
├── routes/
│   ├── health.ts      — GET /health
│   ├── events.ts      — full CRUD with Zod validation
│   ├── agent.ts       — multipart image upload → storage → Claude → draft
│   └── client.ts      — bunq balance + transaction proxying
└── mastra/
    ├── index.ts       — Mastra instance (storage, server config)
    ├── agents/        — venue-analysis agent (Claude Opus)
    ├── workflows/     — create-event workflow (validate → persist)
    └── tools/         — bunq balance, transactions, payment-request tools
                         events: create + get
```

### Frontend structure

```
frontend/src/
├── App.tsx            — history-stack navigation (no React Router)
├── App.css            — phone frame layout (390×844px)
├── api/client.ts      — typed fetch wrapper
├── components/        — TierSheet, BottomNav, TopBar, FormCard …
└── pages/
    ├── Home.tsx           — account overview + quick actions
    ├── Events.tsx         — event discovery + your events entry
    ├── YourEvents.tsx     — tabs: Organising / Joined / Archived
    ├── CreateEvent.tsx    — manual event creation with tier editor
    ├── AICreateEvent.tsx  — AI-assisted creation (image + text input)
    ├── ManageEvent.tsx    — live event management
    ├── GuestPreview.tsx   — attendee event view
    ├── BuyTicket.tsx      — ticket purchase + bunq.me payment
    ├── Analytics.tsx      — event revenue and sales stats
    └── TransactionHistory.tsx
```

### Database schema

```
events
  id (uuid pk) · name · date · location · description
  banner_url · status (draft|live|archived) · created_at

ticket_tiers
  id (uuid pk) · event_id → events · name
  price (numeric) · currency (EUR|USD|GBP) · quantity

tickets
  id (uuid pk) · tier_id → ticket_tiers
  buyer_name · buyer_email
  payment_status (pending|paid|failed) · bunq_payment_id · purchased_at
```

Mastra uses the same PostgreSQL instance for its own state (agent run history, prompt blocks, workflow runs) via `@mastra/pg`.

---

## Getting started

### Prerequisites
- Docker + Docker Compose
- (Optional) Anthropic API key — AI features fall back to mock data without it
- (Optional) bunq API key — client routes return mock data without it

### 1. Configure environment

Copy and edit `.env`:

```bash
cp .env .env.local   # or just edit .env directly
```

```env
# Required
NODE_ENV=development
PORT=9191
DATABASE_URL=postgresql://bunq:bunq@localhost:5432/bunq

# AI (optional — mock data used when empty)
ANTHROPIC_API_KEY=sk-ant-...

# bunq (optional — mock data used when empty)
BUNQ_API_KEY=
BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com/v1

# Storage — MinIO runs automatically via docker compose
# Switch to S3 in production by changing these four vars (see Storage section)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=bunq-events
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=us-east-1
STORAGE_PUBLIC_URL=http://localhost:9000/bunq-events
STORAGE_FORCE_PATH_STYLE=true
```

### 2. Run

```bash
make run        # starts all services in the background
make status     # shows container health + all URLs
```

All services come up in the right order (MinIO and Postgres healthy before backend starts). The storage bucket is created automatically on first run.

| URL | What's there |
|-----|-------------|
| `http://localhost:9292` | Mobile app (phone frame on desktop) |
| `http://localhost:9191/health` | `{ "status": "ok" }` |
| `http://localhost:4111` | Mastra Studio — test agents + workflows |
| `http://localhost:9001` | MinIO console (minioadmin / minioadmin) |

Hot-reload is active across all services — edit files in `backend/src/` or `frontend/src/` and changes apply instantly. The Mastra dev server also watches `src/mastra/` and restarts on changes.

### 3. All make commands

```bash
make run              # docker compose up -d  (detached)
make stop             # docker compose down
make restart          # docker compose restart
make logs             # follow all service logs
make status           # container health + URL list
make install          # rebuild all images (run after adding npm packages)
make provision        # provision bunq sandbox (company user, default)
make provision-person # provision bunq sandbox (personal user)
make refresh-session  # refresh an expired session token
```

> After adding a new npm package to the backend, run `make install` then `make run` to pick it up inside Docker.

---

## Storage

Images uploaded during AI venue analysis are stored in MinIO locally, and can be switched to AWS S3 for production with only env var changes — no code changes needed.

### Local (MinIO)
MinIO runs as a Docker service. The backend connects to it internally via `http://minio:9000` and the browser loads images via `http://localhost:9000`.

### Production (AWS S3)
```env
STORAGE_ENDPOINT=              # empty = use AWS S3 defaults
STORAGE_BUCKET=my-bucket
STORAGE_ACCESS_KEY=AKIA...
STORAGE_SECRET_KEY=...
STORAGE_REGION=eu-west-1
STORAGE_PUBLIC_URL=https://my-bucket.s3.eu-west-1.amazonaws.com
STORAGE_FORCE_PATH_STYLE=false
```

---

## Mastra Studio

Open `http://localhost:4111` to access the Mastra Studio — a live UI for the AI layer.

From the Studio you can:
- **Test the venue-analysis agent** — send text or images, see the structured response
- **Trigger the create-event workflow** — run validate → persist end-to-end
- **Inspect run history** — step-by-step output, timing, errors
- **Iterate on prompts** — edit instructions and re-run without redeploying

The Studio talks to a separate `mastra` container that hot-reloads when you edit anything in `backend/src/mastra/`. Agent state (run history, prompt blocks) is persisted in PostgreSQL via `@mastra/pg`.

---

## API reference

### Internal API (`localhost:9191`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/events` | List all events |
| `POST` | `/events` | Create event + tiers |
| `GET` | `/events/:id` | Get event with tiers |
| `PUT` | `/events/:id` | Update event (partial) |
| `DELETE` | `/events/:id` | Delete event |
| `POST` | `/agent/analyze-venue` | Upload images → storage → Claude → event draft |
| `POST` | `/agent/run` | Trigger create-event workflow |
| `GET` | `/agent/status` | Agent + workflow registry |
| `GET` | `/client/status` | bunq connection status |
| `GET` | `/client/balance` | Account balance |
| `GET` | `/client/transactions` | Recent transactions |

### Bruno test collections (`test/`)

**`test/bruno/`** — tests the internal API

```bash
bru run test/bruno --env Local
```

**`test/bunq-api/`** — calls the real bunq sandbox API directly

```bash
bru run test/bunq-api/Setup --env Sandbox --sandbox=developer
```

> Put `privateKeyPem` / `publicKeyPem` in the Sandbox environment **before** step 3 (see Step 2 — OpenSSL). `--sandbox=developer` is still required for Payment scripts that sign with `require('crypto')`.

---

## Configuring bunq

The app works without a bunq key — all client routes return mock data. When you're ready to connect to the real sandbox, use **either** the automated provisioner (recommended) **or** the manual Bruno flow in `test/bunq-api/`.

### One-command sandbox setup (recommended)

From the repository root, with Node 18+:

```bash
make provision
```

Default is a **company** sandbox user (`POST /sandbox-user-company`). For a **personal** user:

```bash
make provision-person
```

Or run directly:

```bash
node scripts/bunq-provision.mjs
node scripts/bunq-provision.mjs --user-type person
```

This calls the public sandbox API to create a test user, generates an RSA-2048 key pair under `.bunq/`, runs installation → device-server → session-server, and **merges** the following into the repository root `.env` (override the path with `--write-env <file>`; avoid `--env-file` — it is reserved by Node 20+):

- `BUNQ_API_KEY`, `BUNQ_SESSION_TOKEN`, `BUNQ_INSTALLATION_TOKEN`
- `BUNQ_USER_ID`, `BUNQ_DEFAULT_MONETARY_ACCOUNT_ID`
- `BUNQ_API_BASE_URL`, `BUNQ_PRIVATE_KEY_PATH`, `BUNQ_PUBLIC_KEY_PATH`, `BUNQ_SERVER_PUBLIC_KEY_PATH`

The backend uses `BUNQ_SESSION_TOKEN` for user-scoped API calls (falls back to `BUNQ_API_KEY` if needed). **Session tokens expire**; refresh with:

```bash
make refresh-session
# or: node scripts/bunq-provision.mjs --refresh-session
```

(Requires `BUNQ_API_KEY`, `BUNQ_INSTALLATION_TOKEN`, and the private key on disk or via `BUNQ_PRIVATE_KEY` in `.env`.)

**AWS / production:** use `--print-env --inline-private-key` to emit all values (including the PEM inline) as `KEY=value` lines without writing local files, then store them in AWS Secrets Manager or SSM Parameter Store:

```bash
node scripts/bunq-provision.mjs --print-env --inline-private-key
```

> **Do not use `--print-env` alone for server deployments** — it prints key file paths that do not exist on the server. `--inline-private-key` embeds the PEM directly as `BUNQ_PRIVATE_KEY` so no file mount is needed.

Schedule `make refresh-session` (for example in CI or a small cron) before tokens expire. For the live API (`https://api.bunq.com/v1`), create an API key in the bunq app first; the default script targets the **sandbox** base URL.

Flags: `--user-type person` (default is **company**), `--key-dir <path>`, `--dry-run`, `--print-env`, `--inline-private-key` (embed PEM in env — required for server/CI deployments without file mounts).

### Prerequisites (manual Bruno path only)

Install Bruno CLI if you don't have it:

```bash
npm install -g @usebruno/cli
```

Open the collection in Bruno desktop (`test/bunq-api/`) and select the **Sandbox** environment, or run everything from the terminal as shown below.

---

### Step 1 — Create a sandbox user and get an API key

bunq's sandbox lets you create a fake user instantly, no registration needed.

**Run in Bruno:**
```
Setup / 1 - Create Sandbox User Person
```

**What it calls:**
```
POST https://public-api.sandbox.bunq.com/v1/sandbox-user-person
(no auth, no body required)
```

**What you get back:** an `ApiKey` object (sandbox) with `api_key` (and a nested `user`).

The pre-request script saves the key into the **Sandbox** environment. Copy it into your `.env` as `BUNQ_API_KEY` if you are not using `npm run bunq:provision`.

---

### Step 2 — Generate an RSA key pair

bunq requires you to prove ownership of your client using public-key cryptography. You generate a key pair once and keep the private key secret.

Bruno’s safe script runtime cannot use Node’s `crypto` module, so generate PEMs locally and paste them into the **Sandbox** environment as `privateKeyPem` and `publicKeyPem`:

```bash
openssl genrsa -out bunq-client-private.pem 2048
openssl rsa -in bunq-client-private.pem -pubout -out bunq-client-public.pem
```

**Optional — run in Bruno:** `Setup / 3 - Generate Key Pair` calls `GET /v1/installation` (expect **403** without auth) to confirm the sandbox is up, and checks that those env vars look like PEM keys.

---

### Step 3 — Register your public key with bunq (Installation)

Tell bunq who you are by registering your public key. This gives you an `installation_token` used in the next two steps.

**Run in Bruno:**
```
Setup / 4 - Create Installation
```

**What it calls:**
```
POST /v1/installation
Body: { "client_public_key": "-----BEGIN PUBLIC KEY-----\n..." }
```

The collection does **not** put `{{publicKeyPem}}` inside `body:json` — a multiline env value would break JSON. A short pre-request script (no `crypto` module) calls `req.setBody({ client_public_key: … })` so newlines are escaped correctly.

**What you get back:** an `installation_token` (a long string). Saved automatically as `installationToken`.

---

### Step 4 — Register this device

Tell bunq that this machine is allowed to use the installation token. Only needs to be done once per device.

**Run in Bruno:**
```
Setup / 5 - Register Device Server
```

**What it calls:**
```
POST /v1/device-server
Header: X-Bunq-Client-Authentication: <installationToken>
Body: { "description": "Bunq Bruno Collection", "secret": "<apiKey>", "permitted_ips": ["*"] }
```

Returns an `Id` — nothing to save, just needs to succeed (200).

---

### Step 5 — Create a session

Exchange your API key for a short-lived `session_token`. This is what you use for all actual API calls.

**Run in Bruno:**
```
Setup / 6 - Create Session
```

**What it calls:**
```
POST /v1/session-server
Header: X-Bunq-Client-Authentication: <installationToken>
Body: { "secret": "<apiKey>" }
```

**What you get back:** a `session_token` and your `userId`. Both saved automatically into the Sandbox environment.

---

### Step 6 — Find your account ID

List your monetary accounts to get the `accountId` needed for balance and payment calls.

**Run in Bruno:**
```
Accounts / 1 - List Monetary Accounts
```

**What it calls:**
```
GET /v1/user/<userId>/monetary-account-bank
Header: X-Bunq-Client-Authentication: <sessionToken>
```

Saves the first account's ID as `accountId`. You can also top up your sandbox balance here using `Accounts / 3 - Add Sandbox Funds` (requests money from the built-in Sugar Daddy account).

---

### Step 7 — Update your .env

After running all six steps, add the values Bruno saved to your `.env`:

```env
BUNQ_API_KEY=sandbox_abc123...
BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com/v1
```

Restart the backend (`make restart`) and the `/client/balance` and `/client/transactions` routes will return live sandbox data instead of mock responses.

---

### Run the full setup in one command

```bash
bru run test/bunq-api/Setup --env Sandbox --sandbox=developer
```

> `--sandbox=developer` is required — it enables Node.js `crypto` in pre-request scripts for RSA key generation and payment signing.

---

### What's available after setup

| Folder | What you can do |
|--------|----------------|
| `Accounts/` | List accounts, check balance, top up via Sugar Daddy |
| `Payments/` | Send payments (auto RSA-signed), batch payments |
| `Request Inquiries/` | Create, list, and accept payment requests |
| `bunq.me/` | Create and manage public payment tabs |

Payment requests are signed automatically — the pre-request script reads `privateKeyPem` from the environment, signs the request body with SHA-256/RSA, and sets the `X-Bunq-Client-Signature` header.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, plain CSS |
| Backend | Hono, Node.js, TypeScript |
| AI agents | Mastra 1.x, Claude Opus via Vercel AI SDK |
| Agent Studio | Mastra Studio (built into `mastra dev`) |
| Database | PostgreSQL 16, Drizzle ORM |
| File storage | MinIO (local) / AWS S3 (production) |
| Payments | bunq API (sandbox) |
| Infrastructure | Docker Compose |
| API testing | Bruno |
