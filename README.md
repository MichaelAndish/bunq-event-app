# bunq Event Platform

A mobile-first event management platform that lets organisers create, manage, and sell tickets for events — with AI-assisted event setup and bunq-powered payments.

You describe your event (or drop some venue photos), the AI fills in the details, and ticket tiers are ready to sell via bunq payment links in seconds.

---

## What it does

**For organisers**
- Create events manually or let the AI analyse venue photos and generate a complete event draft
- Set multiple ticket tiers with custom pricing (EUR / USD / GBP)
- Manage live, draft, and archived events from one screen
- Track ticket sales and revenue per event

**For attendees**
- Browse and join events
- Purchase tickets via bunq.me payment links — no bunq account required

**Under the hood**
- AI agent (Claude) analyses venue images and auto-fills event name, date, location, description, and suggested ticket pricing
- Payments are routed through the bunq sandbox API with full RSA-signed request flows
- All data persists in PostgreSQL via Drizzle ORM

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│           React + TypeScript (phone frame)           │
│                   port 9292                          │
└────────────────────┬────────────────────────────────┘
                     │  /api/* (Vite proxy)
┌────────────────────▼────────────────────────────────┐
│               Hono API (Node.js)                     │
│                   port 9191                          │
│                                                      │
│  /health       liveness check                        │
│  /events       CRUD — events + ticket tiers          │
│  /agent        AI venue analysis + workflow runner   │
│  /client       bunq account balance + transactions   │
│                                                      │
│  ┌──────────────┐     ┌────────────────────────┐    │
│  │  Mastra AI   │     │   bunq Sandbox API      │    │
│  │  (Agents +   │     │   (payments, accounts,  │    │
│  │  Workflows)  │     │    request inquiries)   │    │
│  └──────────────┘     └────────────────────────┘    │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL 16                           │
│         events / ticket_tiers / tickets              │
└─────────────────────────────────────────────────────┘
```

### Service breakdown

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `frontend` | Vite + React + TypeScript | 9292 | Phone-frame UI |
| `backend` | Hono + Node.js + TypeScript | 9191 | REST API, AI, bunq integration |
| `db` | PostgreSQL 16 | 5432 | Persistent storage |

### Backend modules

```
backend/src/
├── index.ts          — server entry, CORS, route registration, migrations
├── config.ts         — env validation via Zod (exits on missing required vars)
├── db/
│   ├── schema.ts     — Drizzle schema: events, ticket_tiers, tickets
│   ├── migrate.ts    — idempotent SQL migrations run on startup
│   └── client.ts     — pg connection pool
├── routes/
│   ├── health.ts     — GET /health
│   ├── events.ts     — full CRUD with Zod validation
│   ├── agent.ts      — AI image analysis + Mastra workflow trigger
│   └── client.ts     — bunq balance + transaction proxying
└── mastra/
    ├── index.ts      — Mastra instance registration
    ├── agents/       — venue analysis agent (Claude Opus)
    ├── workflows/    — create-event workflow (validate → persist)
    └── tools/        — bunq balance, transaction, payment-request tools
```

### Frontend structure

```
frontend/src/
├── App.tsx           — history-stack navigation (no React Router)
├── App.css           — phone frame layout (390×844px)
├── api/client.ts     — typed fetch wrapper
├── components/       — shared UI: TierSheet, BottomNav, TopBar, FormCard …
└── pages/
    ├── Home.tsx           — account overview + quick actions
    ├── Events.tsx         — event discovery + your events entry
    ├── YourEvents.tsx     — tabs: Organising / Joined / Archived
    ├── CreateEvent.tsx    — manual event creation with tier editor
    ├── AICreateEvent.tsx  — AI-assisted event creation (image + voice input)
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

---

## Getting started

### Prerequisites
- Docker + Docker Compose
- (Optional) Anthropic API key — AI features fall back to mock data without it
- (Optional) bunq API key — client routes use mock data without it

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=9191
DATABASE_URL=postgresql://bunq:bunq@db:5432/bunq
ANTHROPIC_API_KEY=sk-ant-...      # optional
BUNQ_API_KEY=                     # optional
BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com/v1
FRONTEND_ORIGIN=http://localhost:9292
```

### 2. Run

```bash
make run
# or: docker compose up --build
```

| URL | What you'll see |
|-----|----------------|
| `http://localhost:9292` | Mobile app (phone frame on desktop) |
| `http://localhost:9191/health` | `{ "status": "ok" }` |

The database migrations run automatically on startup. Hot-reload is active for both services — edit files in `backend/src/` or `frontend/src/` and changes apply instantly without restarting containers.

### 3. Other commands

```bash
make stop     # docker compose down
make logs     # follow all service logs
make install  # rebuild images without starting
```

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
| `POST` | `/agent/analyze-venue` | AI venue analysis (multipart) |
| `POST` | `/agent/run` | Trigger create-event workflow |
| `GET` | `/agent/status` | List registered agents + workflows |
| `GET` | `/client/status` | bunq connection status |
| `GET` | `/client/balance` | Account balance |
| `GET` | `/client/transactions` | Recent transactions |

### Bruno test collections (`test/`)

Two collections are included:

**`test/bruno/`** — tests the internal API (run against `localhost:9191`)
```bash
bru run test/bruno --env Local
```

**`test/bunq-api/`** — calls the real bunq sandbox API directly
```bash
bru run test/bunq-api/Setup --env Sandbox --sandbox=developer
```

---

## bunq sandbox setup

The `test/bunq-api/` collection walks through the complete bunq auth flow. Run the Setup folder in order:

1. **Create Sandbox User** — generates a test user + API key (no auth needed)
2. **Generate Key Pair** — creates an RSA-2048 keypair and saves it to env vars
3. **Create Installation** — registers your public key with bunq
4. **Register Device Server** — whitelists this client
5. **Create Session** — exchanges your API key for a session token
6. **List Monetary Accounts** — saves your account ID, confirms your balance

After setup, the Accounts / Payments / Request Inquiries / bunq.me folders are ready to use. Payment endpoints are RSA-signed automatically via pre-request scripts.

> Run with `--sandbox=developer` to enable Node.js `crypto` in Bruno scripts.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, plain CSS |
| Backend | Hono, Node.js, TypeScript |
| AI | Mastra (agent framework), Claude Opus via Vercel AI SDK |
| Database | PostgreSQL 16, Drizzle ORM |
| Payments | bunq API (sandbox) |
| Infrastructure | Docker Compose |
| API testing | Bruno |
