# JagaAsset — IT Asset Management on Solana

IT asset management for Malaysian SMEs with 10–50 staff. Scan invoices, track custody on Solana, and offboard employees in one click.

## Features

- **AI Invoice Ingestion** — Upload a receipt photo; Gemini AI extracts merchant, model, serial number, price, and warranty automatically.
- **Chain of Custody** — Every asset movement (register, assign, transfer, decommission) generates a SHA-256 hash written to Solana Devnet via the Memo Program. Tamper-proof, publicly verifiable.
- **Employee Offboarding** — One click returns all assigned assets, records custody transfers on-chain, flags the user in Notion workspace, and sends a confirmation email.
- **Notion Integration** — Configure your Notion API key to auto-provision employee pages on add and revoke access on offboarding.
- **Multi-tenant** — Per-organisation isolation via email domain. Owner/manager role-based access.
- **On-chain Audit Log** — Full event history with links to Solana Explorer.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| AI | Google Gemini API |
| On-chain | Solana Web3.js (Memo Program, Devnet) |
| Billing | Stripe (test/sandbox mode) |
| Email | Resend |
| Integrations | Notion API |
| UI | Tailwind CSS v4 + shadcn/ui |
| Fonts | Geist via next/font |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- A Solana Devnet fee-payer wallet
- Stripe test keys
- Resend API key
- Google Gemini API key
- Notion integration token (optional)

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Solana (Devnet)
SOLANA_FEE_PAYER_PRIVATE_KEY=

# Stripe (test mode)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=

# Resend
RESEND_API_KEY=

# Google Gemini
GOOGLE_AI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Dev Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages (dashboard, assets, employees, etc.)
│   ├── (auth)/         # Login page
│   ├── api/            # All API routes (auth, stripe, notion, employees, etc.)
│   └── pricing/         # Public pricing page
├── components/
│   ├── dashboard/      # Dashboard metric cards
│   ├── employees/      # Employee table, offboarding modal
│   └── ui/             # shadcn/ui components (Modal, Alert, Table, Badge, etc.)
└── lib/
    ├── supabase/       # Supabase client (server, client, admin)
    ├── solana.ts       # Solana connection + fee payer
    ├── gemini.ts       # Google Gemini AI integration
    ├── org.ts          # Org resolution + role checks
    ├── plan.ts         # Plan/limit enforcement
    └── utils.ts        # Formatting, hashing utilities
```

## Sandbox Notice

This app is in development. Stripe is in test mode. **Do not enter real credit card details.**
Use the test card `4242 4242 4242 4242` with any future expiry and any CVC.

## On-chain Recording

Asset custody events are hashed via SHA-256 and written to Solana Devnet using the [Memo Program](https://spl.solana.com/memo). Each event stores:

- App identifier (`jagaasset`)
- Asset ID
- Event type (Registered, Assigned, Transferred, Decommissioned)
- SHA-256 hash
- Timestamp

View any event on [Solana Explorer](https://explorer.solana.com/?cluster=devnet) by its transaction signature.
