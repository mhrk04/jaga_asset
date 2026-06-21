# AssetAgent — GitHub Repo Setup Guide

> Follow this top to bottom. Every step is required before the app will run.
> Estimated time: **45–60 minutes** on Day 1 of the sprint.

---

## Prerequisites

Make sure these are installed on your machine first:

```bash
node --version     # must be v18 or higher
npm --version      # v9 or higher
git --version      # any recent version
```

Install the Solana CLI (needed once to generate the fee payer wallet):

```bash
# macOS / Linux
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Restart terminal, then verify:
solana --version
```

---

## Step 1 — Create the GitHub Repo

Go to [github.com/new](https://github.com/new) and create a new repository:

- **Name:** `assetagent`
- **Visibility:** Private (keep your API keys safe during the hackathon)
- **Initialize with:** Add a README ✓

Then clone it locally:

```bash
git clone https://github.com/YOUR_USERNAME/assetagent.git
cd assetagent
```

---

## Step 2 — Scaffold the Next.js Project

Run this inside your cloned repo folder:

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

When prompted:
- `Would you like to use App Router?` → **Yes**
- `Would you like to customize the default import alias?` → **No** (keep `@/*`)

---

## Step 3 — Install All Dependencies

```bash
npm install \
  @anthropic-ai/sdk \
  @supabase/supabase-js \
  @supabase/ssr \
  @solana/web3.js \
  bs58 \
  resend \
  stripe \
  @stripe/stripe-js
```

```bash
npm install -D \
  @types/node \
  @types/bs58
```

Verify the key packages installed correctly:

```bash
npm list @anthropic-ai/sdk @supabase/supabase-js @solana/web3.js bs58
```

---

## Step 4 — Set Up the Folder Structure

Create all the folders and empty files the project needs:

```bash
# API routes
mkdir -p src/app/api/extract-invoice
mkdir -p src/app/api/assets
mkdir -p src/app/api/assign-asset
mkdir -p src/app/api/record-custody-event
mkdir -p src/app/api/offboard-employee
mkdir -p src/app/api/employees
mkdir -p src/app/api/dashboard-metrics
mkdir -p src/app/api/custody-log

# App pages
mkdir -p src/app/\(public\)               # landing page group (no auth)
mkdir -p src/app/\(auth\)/login           # login page
mkdir -p src/app/\(app\)/dashboard        # main dashboard
mkdir -p src/app/\(app\)/assets           # asset inventory
mkdir -p "src/app/(app)/assets/[id]"      # asset detail
mkdir -p src/app/\(app\)/assets/upload    # invoice upload
mkdir -p src/app/\(app\)/employees        # employee management
mkdir -p src/app/\(app\)/audit            # audit log

# Shared code
mkdir -p src/lib
mkdir -p src/components/ui
mkdir -p src/components/dashboard
mkdir -p src/components/assets
mkdir -p src/components/employees
mkdir -p src/types
```

---

## Step 5 — Create the `.env.local` File

Create `.env.local` in the project root (never commit this file):

```bash
touch .env.local
```

Paste this template — you will fill in each value in the steps below:

```env
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Solana
SOLANA_FEE_PAYER_PRIVATE_KEY=

# Slack
SLACK_BOT_TOKEN=
SLACK_WORKSPACE_ID=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` (create `.gitignore` if it doesn't exist):

```bash
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
echo "node_modules/" >> .gitignore
echo ".next/" >> .gitignore
```

---

## Step 6 — Set Up Supabase

### 6.1 Create the Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `assetagent`
3. Choose a strong database password (save it somewhere safe)
4. Region: **Southeast Asia (Singapore)** — closest to your users
5. Wait for the project to provision (~2 minutes)

### 6.2 Get Your Keys

In the Supabase dashboard → **Project Settings** → **API**:

Copy these three values into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ The **service role key** has full database access — never expose it to the browser. Only use it in server-side API routes.

### 6.3 Run the Database Schema

In the Supabase dashboard → **SQL Editor** → **New Query**

Paste and run this entire SQL block:

```sql
-- ─── organisations ───────────────────────────────────────────
CREATE TABLE organisations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE NOT NULL,
  plan            text        DEFAULT 'trial',
  trial_uploads   int         DEFAULT 15,
  created_at      timestamptz DEFAULT now()
);

-- ─── employees ───────────────────────────────────────────────
CREATE TABLE employees (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  email           text        UNIQUE NOT NULL,
  slack_user_id   text,
  status          text        DEFAULT 'Active',
  offboarding_date date,
  created_at      timestamptz DEFAULT now()
);

-- ─── assets ──────────────────────────────────────────────────
CREATE TABLE assets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  merchant          text        NOT NULL,
  item_name         text        NOT NULL,
  serial_number     text        UNIQUE NOT NULL,
  purchase_date     date        NOT NULL,
  purchase_price    numeric     NOT NULL,
  category          text        NOT NULL,
  warranty_end_date date,
  assigned_to       uuid        REFERENCES employees(id),
  status            text        DEFAULT 'Available',
  invoice_image_url text,
  created_at        timestamptz DEFAULT now()
);

-- ─── custody_events ──────────────────────────────────────────
CREATE TABLE custody_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  asset_id          uuid        REFERENCES assets(id) ON DELETE CASCADE,
  event_type        text        NOT NULL,
  from_employee_id  uuid        REFERENCES employees(id),
  to_employee_id    uuid        REFERENCES employees(id),
  event_hash        text        NOT NULL,
  solana_signature  text,
  occurred_at       timestamptz DEFAULT now()
);

-- ─── saas_events ─────────────────────────────────────────────
CREATE TABLE saas_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        REFERENCES organisations(id) ON DELETE CASCADE,
  employee_id     uuid        REFERENCES employees(id) ON DELETE CASCADE,
  action          text        NOT NULL,
  service         text        NOT NULL,
  performed_at    timestamptz DEFAULT now(),
  details         jsonb
);

-- ─── Row-Level Security ───────────────────────────────────────
ALTER TABLE organisations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_events    ENABLE ROW LEVEL SECURITY;

-- Policy helper: get the org_id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM employees WHERE email = auth.email()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apply the same isolation policy to every table
CREATE POLICY "org_isolation" ON organisations  USING (id = get_user_org_id());
CREATE POLICY "org_isolation" ON employees      USING (org_id = get_user_org_id());
CREATE POLICY "org_isolation" ON assets         USING (org_id = get_user_org_id());
CREATE POLICY "org_isolation" ON custody_events USING (org_id = get_user_org_id());
CREATE POLICY "org_isolation" ON saas_events    USING (org_id = get_user_org_id());
```

Click **Run** — you should see "Success. No rows returned."

### 6.4 Enable Auth

In Supabase dashboard → **Authentication** → **Providers**:

- **Email** → Enable, turn on **Magic Links**, turn off passwords
- **Google** (optional) → Enable and fill in OAuth credentials from Google Cloud Console

In **Authentication** → **URL Configuration**:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

---

## Step 7 — Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → **Create Key**
3. Name it `assetagent-hackathon`
4. Copy the key (it starts with `sk-ant-`)

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Step 8 — Set Up the Solana Fee Payer Wallet

This is the server keypair that signs all on-chain transactions. Users never see it.

### 8.1 Generate the Keypair

```bash
# Generate a new keypair and save to file
solana-keygen new --outfile ~/.config/solana/assetagent-fee-payer.json --no-bip39-passphrase

# Output will show the public key — save it somewhere
# Example: Pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### 8.2 Fund with Devnet SOL (free)

```bash
# Set CLI to Devnet
solana config set --url devnet

# Airdrop 2 SOL to your fee payer (free on Devnet)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/assetagent-fee-payer.json) --url devnet

# Confirm balance
solana balance $(solana-keygen pubkey ~/.config/solana/assetagent-fee-payer.json) --url devnet
# Should show: 2 SOL
```

### 8.3 Export the Private Key as Base58

```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const keyFile = require(process.env.HOME + '/.config/solana/assetagent-fee-payer.json');
const keypair = Keypair.fromSecretKey(new Uint8Array(keyFile));
console.log('Private key (base58):');
console.log(bs58.encode(keypair.secretKey));
console.log('Public key:');
console.log(keypair.publicKey.toBase58());
"
```

Copy the base58 private key output into `.env.local`:

```env
SOLANA_FEE_PAYER_PRIVATE_KEY=5K3mP...the long base58 string...Xq2
```

> ⚠️ Never commit this key to GitHub. It controls real SOL on Mainnet.

---

## Step 9 — Set Up Slack Bot

### 9.1 Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name: `AssetAgent`
3. Workspace: select your **test workspace** (create a free one at slack.com if needed)

### 9.2 Add Bot Scopes

In the app dashboard → **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**:

Add these scopes:
- `admin.users:write` — required for deactivating accounts
- `users:read` — to look up users by email
- `users:read.email` — to find Slack user ID from email

### 9.3 Install the App

In **OAuth & Permissions** → **Install to Workspace** → Allow

Copy the **Bot User OAuth Token** (starts with `xoxb-`):

```env
SLACK_BOT_TOKEN=xoxb-1234567890-...
```

### 9.4 Get Your Workspace ID

In Slack desktop app:
- Right-click your workspace name in the top left
- **Copy link** — the URL format is `https://app.slack.com/client/T0XXXXXXX/...`
- `T0XXXXXXX` is your Workspace ID

```env
SLACK_WORKSPACE_ID=T0XXXXXXX
```

### 9.5 Create a Test Employee in Slack

Create a test user in your Slack workspace (e.g. `sarah.test@yourteam.com`) — this is the account you'll deactivate during the demo.

---

## Step 10 — Set Up Resend (Email Alerts)

1. Go to [resend.com](https://resend.com) → Sign Up (free)
2. **API Keys** → **Create API Key**
3. Name it `assetagent`

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## Step 11 — Create the Supabase Client Helpers

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/admin.ts` (service role — server only):

```typescript
import { createClient } from '@supabase/supabase-js'

// Only use this in API routes — never in client components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

---

## Step 12 — Create the Auth Middleware

Create `src/middleware.ts` in the project root (not inside `src/app`):

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect all /dashboard, /assets, /employees, /audit routes
  const protectedPaths = ['/dashboard', '/assets', '/employees', '/audit']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from /login
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

---

## Step 13 — Create the Auth Callback Route

Create `src/app/auth/callback/route.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set(name, value, options) { cookieStore.set({ name, value, ...options }) },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

---

## Step 14 — Create the TypeScript Types

Create `src/types/index.ts`:

```typescript
export type AssetCategory =
  | 'Laptop'
  | 'Monitor'
  | 'Peripherals'
  | 'Mobile Device'
  | 'Camera'

export type AssetStatus = 'Available' | 'Assigned' | 'Decommissioned'

export type EmployeeStatus = 'Active' | 'Offboarded'

export type CustodyEventType =
  | 'Registered'
  | 'Assigned'
  | 'Transferred'
  | 'Decommissioned'

export interface Organisation {
  id: string
  name: string
  slug: string
  plan: 'trial' | 'pro'
  trial_uploads: number
  created_at: string
}

export interface Employee {
  id: string
  org_id: string
  name: string
  email: string
  slack_user_id?: string
  status: EmployeeStatus
  offboarding_date?: string
  created_at: string
}

export interface Asset {
  id: string
  org_id: string
  merchant: string
  item_name: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  category: AssetCategory
  warranty_end_date?: string
  assigned_to?: string
  status: AssetStatus
  invoice_image_url?: string
  created_at: string
  // Joined fields
  employee?: Employee
}

export interface CustodyEvent {
  id: string
  org_id: string
  asset_id: string
  event_type: CustodyEventType
  from_employee_id?: string
  to_employee_id?: string
  event_hash: string
  solana_signature?: string
  occurred_at: string
  // Joined
  asset?: Asset
  from_employee?: Employee
  to_employee?: Employee
}

export interface SaasEvent {
  id: string
  org_id: string
  employee_id: string
  action: 'Deprovisioned' | 'ProvisionFailed'
  service: string
  performed_at: string
  details?: Record<string, unknown>
}

export interface DashboardMetrics {
  totalAssets: number
  assignedAssets: number
  availableAssets: number
  totalValue: number
  orphanSeats: number
  expiringSoon: number
  onChainEvents: number
  activeEmployees: number
  newAssetsThisMonth: number
  offboardedThisMonth: number
}

export interface ExtractedAsset {
  merchant: string
  item_name: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  category: AssetCategory
  warranty_period_months?: number
}
```

---

## Step 15 — Verify Everything Runs

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the default Next.js page (we haven't built the UI yet).

Check for errors in the terminal. Common issues:

| Error | Fix |
|---|---|
| `Cannot find module '@supabase/ssr'` | Run `npm install @supabase/ssr` |
| `NEXT_PUBLIC_SUPABASE_URL is not defined` | Check `.env.local` is in the project root, not inside `src/` |
| `Cannot find module 'bs58'` | Run `npm install bs58 && npm install -D @types/bs58` |
| Port 3000 already in use | Run `npm run dev -- --port 3001` |

---

## Step 16 — Push to GitHub

```bash
git add .
git commit -m "feat: initial project setup — Next.js 14, Supabase, types, middleware"
git push origin main
```

---

## Step 17 — Deploy to Vercel

### 17.1 Connect Repo

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `assetagent` GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Root directory: leave as `/`

### 17.2 Add Environment Variables

In the Vercel project → **Settings** → **Environment Variables**

Add every variable from your `.env.local` — one by one:

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SOLANA_FEE_PAYER_PRIVATE_KEY
SLACK_BOT_TOKEN
SLACK_WORKSPACE_ID
RESEND_API_KEY
NEXT_PUBLIC_APP_URL       ← set this to your Vercel URL, e.g. https://assetagent.vercel.app
```

For each variable, set **Environment** to: ✓ Production ✓ Preview ✓ Development

### 17.3 Deploy

Click **Deploy**. First deploy takes ~2 minutes.

After deploying, update Supabase auth settings:

- **Authentication** → **URL Configuration**
- Site URL: `https://assetagent.vercel.app`
- Redirect URLs: add `https://assetagent.vercel.app/auth/callback`

---

## Step 18 — Confirm End-to-End Setup

Run these checks to confirm every integration is wired up correctly before you start building features:

### Check 1 — Supabase tables exist

```bash
# In Supabase dashboard → Table Editor
# You should see 5 tables: organisations, employees, assets, custody_events, saas_events
```

### Check 2 — Anthropic API key works

```bash
node -e "
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'Say OK' }]
}).then(r => console.log('Anthropic ✅', r.content[0].text))
  .catch(e => console.error('Anthropic ❌', e.message));
" 
# Run with: ANTHROPIC_API_KEY=your_key node check.js
```

### Check 3 — Solana Devnet wallet has SOL

```bash
solana balance $(solana-keygen pubkey ~/.config/solana/assetagent-fee-payer.json) --url devnet
# Should show: 2 SOL
```

### Check 4 — Slack bot token works

```bash
curl -s https://slack.com/api/auth.test \
  -H "Authorization: Bearer YOUR_SLACK_BOT_TOKEN" | python3 -m json.tool
# Should show: "ok": true
```

---

## Final Folder Structure

After completing all steps, your repo should look like this:

```
assetagent/
├── .env.local                          ← never commit this
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── src/
│   ├── middleware.ts                   ← auth protection
│   │
│   ├── app/
│   │   ├── auth/callback/route.ts     ← Supabase magic link handler
│   │   │
│   │   ├── api/
│   │   │   ├── extract-invoice/route.ts
│   │   │   ├── assets/route.ts
│   │   │   ├── assets/[id]/route.ts
│   │   │   ├── assign-asset/route.ts
│   │   │   ├── record-custody-event/route.ts
│   │   │   ├── offboard-employee/route.ts
│   │   │   ├── employees/route.ts
│   │   │   ├── dashboard-metrics/route.ts
│   │   │   └── custody-log/route.ts
│   │   │
│   │   ├── (public)/
│   │   │   └── page.tsx               ← landing page
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   │
│   │   └── (app)/
│   │       ├── layout.tsx             ← sidebar + nav shell
│   │       ├── dashboard/page.tsx
│   │       ├── assets/
│   │       │   ├── page.tsx           ← asset inventory
│   │       │   ├── [id]/page.tsx      ← asset detail + custody log
│   │       │   └── upload/page.tsx    ← invoice upload flow
│   │       ├── employees/page.tsx
│   │       └── audit/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                        ← buttons, inputs, modals, badges
│   │   ├── dashboard/                 ← metric cards, activity feed, alerts
│   │   ├── assets/                    ← asset table, upload form, custody timeline
│   │   └── employees/                 ← employee table, offboarding flow
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts
│   │   │   ├── client.ts
│   │   │   └── admin.ts
│   │   ├── anthropic.ts               ← Anthropic client singleton
│   │   ├── solana.ts                  ← Solana connection + fee payer loader
│   │   └── utils.ts                   ← formatCurrency, formatDate, etc.
│   │
│   └── types/
│       └── index.ts                   ← all shared TypeScript types
```

---

## Quick Reference — Key Commands

```bash
npm run dev          # start local dev server at localhost:3000
npm run build        # production build (run before submitting)
npm run lint         # check for TypeScript/ESLint errors
git add . && git commit -m "feat: ..." && git push   # push to GitHub (Vercel auto-deploys)
solana airdrop 2 PUBKEY --url devnet                 # top up Devnet SOL before demo
```

---

## Day 1 Checklist

Before you start writing any feature code, every item below must be ✅:

- [ ] `npm run dev` runs without errors
- [ ] Supabase: 5 tables visible in Table Editor
- [ ] Supabase: Magic Link auth enabled
- [ ] Supabase: Redirect URL set for localhost and Vercel
- [ ] Anthropic: API key test returns a response
- [ ] Solana: Fee payer wallet has 2 SOL on Devnet
- [ ] Slack: Bot token passes `auth.test`
- [ ] Slack: Test employee account exists in workspace
- [ ] Vercel: Project deployed and accessible at live URL
- [ ] Vercel: All 9 environment variables added
- [ ] `.env.local`: Not committed to GitHub (check `git status`)

Once all 11 boxes are checked, move to Day 2 and start building `POST /api/extract-invoice`.
