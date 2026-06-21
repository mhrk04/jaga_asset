# JagaAsset — Implementation Plan

> **Project:** JagaAsset (`jaga_asset`)
> **Tagline:** Autonomous, Web3-secured IT asset and SaaS lifecycle coordinator for Southeast Asian SMEs
> **Stack:** Next.js 14 · Supabase · Claude Sonnet 4.6 · Solana Devnet · Slack API · Resend
> **Target:** SMEs with 10–50 employees across Southeast Asia

---

## How to Use This Document

- Work **top to bottom**, phase by phase
- Each task has a checkbox `[ ]` — tick it when done
- Sub-tasks inside each step are **atomic** — one person, one commit each
- Do not start Phase N+1 until every box in Phase N is checked

---

## Phase 0 — Prerequisites & Repo Init

**Goal:** Local environment ready, repo cloned, toolchain verified.

### 0.1 Verify Local Toolchain

- [x] `node --version` returns v18 or higher — **v24.15.0** ✓
- [x] `npm --version` returns v9 or higher — **v11.12.1** ✓
- [x] `git --version` returns any recent version — **2.50.1** ✓
- [x] Solana CLI installed — **solana-cli 3.1.12** ✓
- [x] `solana --version` works after terminal restart ✓

### 0.2 Create & Clone GitHub Repo

- [x] Create new **private** repo on GitHub named `jaga_asset` ✓
- [x] Add a README during creation ✓
- [x] Repo cloned locally at `/Users/haziqrohaizan/Documents/jaga_asset` ✓
- [x] Remote origin: `git@github.com:mhrk04/jaga_asset.git` ✓

---

## Phase 1 — Project Scaffold

**Goal:** Next.js 14 app scaffolded with TypeScript, Tailwind, App Router, and all npm dependencies installed.

### 1.1 Scaffold Next.js 14

- [x] Run `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` ✓
- [x] App Router enabled ✓
- [x] Default import alias `@/*` kept ✓
- [x] `src/app/page.tsx` exists ✓

### 1.2 Install Runtime Dependencies

- [x] `@anthropic-ai/sdk@0.105.0` ✓
- [x] `@supabase/supabase-js@2.108.2` + `@supabase/ssr@0.12.0` ✓
- [x] `@solana/web3.js@1.98.4` ✓
- [x] `bs58@6.0.0` ✓
- [x] `resend@6.14.0` ✓
- [x] `stripe` + `@stripe/stripe-js` ✓
- [x] `clsx` + `tailwind-merge` ✓
- [x] Verified: `npm list @anthropic-ai/sdk @supabase/supabase-js @solana/web3.js bs58` ✓

### 1.3 Install Dev Dependencies

- [x] `@types/node` + `@types/bs58` installed ✓

### 1.4 Create Folder Structure

- [x] Create API route folders:
  - [x] `src/app/api/extract-invoice/` ✓
  - [x] `src/app/api/assets/` ✓
  - [x] `src/app/api/assign-asset/` ✓
  - [x] `src/app/api/record-custody-event/` ✓
  - [x] `src/app/api/offboard-employee/` ✓
  - [x] `src/app/api/employees/` ✓
  - [x] `src/app/api/dashboard-metrics/` ✓
  - [x] `src/app/api/custody-log/` ✓
- [x] Create app page folders:
  - [x] `src/app/(public)/` ✓
  - [x] `src/app/(auth)/login/` ✓
  - [x] `src/app/(app)/dashboard/` ✓
  - [x] `src/app/(app)/assets/` ✓
  - [x] `src/app/(app)/assets/[id]/` ✓
  - [x] `src/app/(app)/assets/upload/` ✓
  - [x] `src/app/(app)/employees/` ✓
  - [x] `src/app/(app)/audit/` ✓
- [x] Create shared code folders:
  - [x] `src/lib/` ✓
  - [x] `src/components/ui/` ✓
  - [x] `src/components/dashboard/` ✓
  - [x] `src/components/assets/` ✓
  - [x] `src/components/employees/` ✓
  - [x] `src/types/` ✓

---

## Phase 2 — Environment & Secrets

**Goal:** All third-party services connected, `.env.local` fully populated, `.gitignore` correct.

### 2.1 Create `.env.local`

- [x] `.env.local` created in project root ✓
- [x] All 9 variables added (blanks — to be filled per service below) ✓
- [x] `.env*.local`, `node_modules/`, `.next/` already in `.gitignore` from create-next-app ✓
- [x] `git status` confirms `.env.local` is NOT tracked ✓

### 2.2 Set Up Supabase

- [ ] Create new Supabase project named `jagaasset` at [supabase.com](https://supabase.com)
- [ ] Region: **Southeast Asia (Singapore)**
- [ ] Save database password securely (password manager)
- [ ] Go to **Project Settings → API** — copy:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` → paste into `.env.local`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste into `.env.local`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` → paste into `.env.local`
- [ ] Open **SQL Editor → New Query** and run the full schema SQL:
  - [ ] `organisations` table created
  - [ ] `employees` table created
  - [ ] `assets` table created
  - [ ] `custody_events` table created
  - [ ] `saas_events` table created
  - [ ] Row-Level Security enabled on all 5 tables
  - [ ] `get_user_org_id()` function created
  - [ ] `org_isolation` policy applied to all 5 tables
- [ ] Enable Magic Link auth: **Authentication → Providers → Email → Enable Magic Links**
- [ ] Disable password auth (keep only Magic Link)
- [ ] Set redirect URLs: `http://localhost:3000` (Site URL), `http://localhost:3000/auth/callback` (Redirect)

### 2.3 Get Anthropic API Key

- [ ] Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key**
- [ ] Name it `jagaasset-dev`
- [ ] Copy the key (starts with `sk-ant-`) → paste into `.env.local` as `ANTHROPIC_API_KEY`
- [ ] Keep billing credits topped up for hackathon usage

### 2.4 Set Up Solana Fee Payer Wallet

- [ ] Generate keypair: `solana-keygen new --outfile ~/.config/solana/jagaasset-fee-payer.json --no-bip39-passphrase`
- [ ] Save the displayed public key in a safe note
- [ ] Switch to Devnet: `solana config set --url devnet`
- [ ] Airdrop 2 SOL: `solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/jagaasset-fee-payer.json) --url devnet`
- [ ] Confirm balance shows `2 SOL`
- [ ] Export Base58 private key using the node script from the setup guide
- [ ] Paste Base58 private key into `.env.local` as `SOLANA_FEE_PAYER_PRIVATE_KEY`

### 2.5 Set Up Slack Bot

- [ ] Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**
- [ ] Name: `JagaAsset`, attach to test workspace
- [ ] Add bot scopes: `admin.users:write`, `users:read`, `users:read.email`
- [ ] Install to workspace → copy **Bot User OAuth Token** (`xoxb-...`) → paste into `.env.local`
- [ ] Get Workspace ID from Slack desktop app URL → paste into `.env.local` as `SLACK_WORKSPACE_ID`
- [ ] Create a test employee account in Slack (e.g. `test.employee@yourteam.com`)
- [ ] Verify bot token: `curl -s https://slack.com/api/auth.test -H "Authorization: Bearer YOUR_BOT_TOKEN"` returns `"ok": true`

### 2.6 Set Up Resend (Email)

- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Create API Key named `jagaasset` → paste into `.env.local` as `RESEND_API_KEY`
- [ ] Note: free tier sufficient for hackathon/validation

---

## Phase 3 — Core Infrastructure Code

**Goal:** Auth, Supabase clients, middleware, types, and utility helpers in place. App boots without errors.

### 3.1 Supabase Client Helpers

- [x] `src/lib/supabase/server.ts` created — SSR server client ✓
- [x] `src/lib/supabase/client.ts` created — browser client ✓
- [x] `src/lib/supabase/admin.ts` created — service role admin client ✓

### 3.2 Auth Middleware

- [x] `src/middleware.ts` created ✓
- [x] Protects `/dashboard`, `/assets`, `/employees`, `/audit` ✓
- [x] Redirects authenticated users away from `/login` ✓
- [x] `config.matcher` excludes static assets and API routes ✓

### 3.3 Auth Callback Route

- [x] `src/app/auth/callback/route.ts` created ✓
- [x] Handles `?code=` query param ✓
- [x] Exchanges code for session via `exchangeCodeForSession` ✓
- [x] Redirects to `/dashboard` on success ✓

### 3.4 TypeScript Types

- [x] `src/types/index.ts` created with all shared types:
  - [x] `AssetCategory` union type ✓
  - [x] `AssetStatus` union type ✓
  - [x] `EmployeeStatus` union type ✓
  - [x] `CustodyEventType` union type ✓
  - [x] `Organisation` interface ✓
  - [x] `Employee` interface ✓
  - [x] `Asset` interface (with joined `employee` field) ✓
  - [x] `CustodyEvent` interface (with joined asset/employee fields) ✓
  - [x] `SaasEvent` interface ✓
  - [x] `DashboardMetrics` interface ✓
  - [x] `ExtractedAsset` interface ✓

### 3.5 Utility Helpers

- [x] `src/lib/utils.ts` created:
  - [x] `formatCurrency()` — MYR default ✓
  - [x] `formatDate()` — human-readable date ✓
  - [x] `formatRelativeTime()` — "2 hours ago" style ✓
  - [x] `generateEventHash()` — SHA-256 custody hash ✓
  - [x] `cn()` — Tailwind class merge utility ✓

### 3.6 Anthropic Client Singleton

- [x] `src/lib/anthropic.ts` created — exports `anthropic` singleton ✓

### 3.7 Solana Connection Helper

- [x] `src/lib/solana.ts` created:
  - [x] `connection` — Devnet with confirmed commitment ✓
  - [x] `getFeePayer()` — loads keypair from Base58 env var ✓

### 3.8 Verify Dev Server Boots

- [x] `npm run build` — production build passes, zero type errors ✓
- [x] `npm run lint` — zero ESLint warnings or errors ✓
- [ ] Run `npm run dev` locally and open `http://localhost:3000` — confirm page loads (manual step)

---

## Phase 4 — API Routes

**Goal:** All 9 backend API routes implemented, tested with curl/Postman.

### 4.1 `POST /api/extract-invoice`

- [ ] Accept `multipart/form-data` with an `image` file field
- [ ] Encode image to base64
- [ ] Call Claude Sonnet 4.6 Vision with a structured extraction prompt
- [ ] Use **prompt caching** — pad system prompt past 1024 tokens with validation taxonomies
- [ ] Return structured JSON matching `ExtractedAsset` type:
  - `merchant`, `item_name`, `serial_number`, `purchase_date`, `purchase_price`, `category`, `warranty_period_months`
- [ ] Handle extraction errors gracefully (return 422 with error message)
- [ ] Test: upload a sample invoice image, confirm correct JSON response

### 4.2 `GET /api/assets`

- [ ] Require authenticated session (check Supabase auth cookie)
- [ ] Return all assets for the user's `org_id` with joined `employee` name
- [ ] Support query params: `?status=Available`, `?category=Laptop`, `?search=macbook`
- [ ] Return array of `Asset[]`

### 4.3 `POST /api/assets`

- [ ] Accept JSON body matching `ExtractedAsset` + `org_id`, `invoice_image_url`
- [ ] Insert into `assets` table
- [ ] Automatically call `POST /api/record-custody-event` with `event_type: 'Registered'`
- [ ] Return created `Asset`

### 4.4 `GET /api/assets/[id]`

- [ ] Return single asset with full custody event log (joined with employee names)
- [ ] Return 404 if asset not found or not in user's org

### 4.5 `POST /api/assign-asset`

- [ ] Accept `{ asset_id, employee_id }` body
- [ ] Update `assets.assigned_to` and `assets.status = 'Assigned'`
- [ ] Call `/api/record-custody-event` with `event_type: 'Assigned'`
- [ ] Return updated asset

### 4.6 `POST /api/record-custody-event`

- [ ] Accept `{ org_id, asset_id, event_type, from_employee_id?, to_employee_id? }`
- [ ] Compute `event_hash` using SHA-256 of `asset_id + event_type + timestamp + employee_ids`
- [ ] Call Solana Memo Program via `getFeePayer()` and `connection` — write the hash as a memo transaction
- [ ] Save `solana_signature` returned from the transaction
- [ ] Insert row into `custody_events` table
- [ ] Return `{ event_hash, solana_signature }`

### 4.7 `POST /api/offboard-employee`

- [ ] Accept `{ employee_id }` body
- [ ] Fetch employee from DB (get `slack_user_id`, `email`)
- [ ] Set all their assigned assets to `status: 'Available'`, `assigned_to: null`
- [ ] Record a `Transferred` custody event for each returned asset
- [ ] Call Slack API `admin.users.setInactive` using `SLACK_BOT_TOKEN`
- [ ] Insert row into `saas_events` table (action: `'Deprovisioned'`, service: `'Slack'`)
- [ ] Update `employees.status = 'Offboarded'`
- [ ] Send offboarding confirmation email via Resend
- [ ] Return `{ assets_returned, slack_deactivated, email_sent }`

### 4.8 `GET /api/employees`

- [ ] Return all employees for the user's `org_id`
- [ ] Include asset count per employee (joined query)

### 4.9 `POST /api/employees`

- [ ] Accept `{ name, email, slack_user_id? }`
- [ ] Insert into `employees` table with `org_id` from auth session
- [ ] Return created `Employee`

### 4.10 `GET /api/dashboard-metrics`

- [ ] Return `DashboardMetrics` object:
  - [ ] `totalAssets` — COUNT assets in org
  - [ ] `assignedAssets` — COUNT assets WHERE status = 'Assigned'
  - [ ] `availableAssets` — COUNT assets WHERE status = 'Available'
  - [ ] `totalValue` — SUM purchase_price of all assets
  - [ ] `orphanSeats` — COUNT employees with status = 'Offboarded' where assets still assigned (should be 0 normally, indicates leak)
  - [ ] `expiringSoon` — COUNT assets where `warranty_end_date` is within next 90 days
  - [ ] `onChainEvents` — COUNT total custody_events
  - [ ] `activeEmployees` — COUNT employees WHERE status = 'Active'
  - [ ] `newAssetsThisMonth` — COUNT assets created this calendar month
  - [ ] `offboardedThisMonth` — COUNT employees offboarded this calendar month

### 4.11 `GET /api/custody-log`

- [ ] Return paginated list of all custody events for the org
- [ ] Join with asset name and employee names
- [ ] Support `?asset_id=` filter
- [ ] Support `?limit=20&offset=0` pagination

---

## Phase 5 — Authentication UI

**Goal:** Users can log in via Magic Link and are redirected correctly.

### 5.1 Login Page

- [ ] Create `src/app/(auth)/login/page.tsx`
- [ ] Build form with single email input field
- [ ] On submit: call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/auth/callback' } })`
- [ ] Show "Check your email for a magic link" success state
- [ ] Show error state if email fails to send
- [ ] Style with Tailwind — JagaAsset branding (use primary color `#10b981` — emerald green for Jaga/guard theme)

### 5.2 Landing Page

- [ ] Create `src/app/(public)/page.tsx`
- [ ] Hero section: JagaAsset name, tagline ("Guard your assets. Own your data."), CTA button to `/login`
- [ ] Features section: 3 pillars (Zero-Friction Ingestion, Immutable Chain of Custody, Agentic Deprovisioning)
- [ ] Tech stack section: logos/badges for Next.js, Supabase, Solana, Claude
- [ ] Footer: tagline and link to login

---

## Phase 6 — Core Dashboard UI

**Goal:** Authenticated users see a useful, real-data dashboard.

### 6.1 App Layout Shell

- [ ] Create `src/app/(app)/layout.tsx`
- [ ] Sidebar navigation with links: Dashboard, Assets, Employees, Audit
- [ ] Top bar: org name, logged-in user email, sign-out button
- [ ] Responsive: sidebar collapses to hamburger on mobile
- [ ] Brand colors: emerald green (`#10b981`) as primary accent

### 6.2 Dashboard Metric Cards Component

- [ ] Create `src/components/dashboard/MetricCard.tsx`
  - [ ] Props: `title`, `value`, `subtitle`, `icon`, `trend?`
  - [ ] Display large value number, title, optional trend arrow

### 6.3 Dashboard Page

- [ ] Create `src/app/(app)/dashboard/page.tsx`
- [ ] Fetch from `GET /api/dashboard-metrics`
- [ ] Render metric cards:
  - [ ] Total Assets (with total value in RM)
  - [ ] Assigned Assets
  - [ ] Available Assets
  - [ ] Active Employees
  - [ ] On-Chain Events (with Solana icon)
  - [ ] Orphan Seats (alert style if > 0)
  - [ ] Expiring Warranties (within 90 days)
  - [ ] New Assets This Month
- [ ] Activity feed: last 5 custody events with timestamps
- [ ] Alerts section: highlight warranties expiring soon and orphan accounts

---

## Phase 7 — Asset Management UI

**Goal:** Full asset lifecycle — view, register via invoice upload, assign, and view custody history.

### 7.1 Asset Table Component

- [ ] Create `src/components/assets/AssetTable.tsx`
  - [ ] Columns: Item Name, Category, Serial Number, Status (badge), Assigned To, Purchase Price, Warranty End
  - [ ] Status badge colors: green (Available), blue (Assigned), gray (Decommissioned)
  - [ ] Click row → navigate to `/assets/[id]`
  - [ ] Sortable columns

### 7.2 Asset List Page

- [ ] Create `src/app/(app)/assets/page.tsx`
- [ ] Fetch from `GET /api/assets`
- [ ] Render `<AssetTable />` with data
- [ ] Filter bar: by Status, by Category, search box
- [ ] "Upload Invoice" button → navigates to `/assets/upload`

### 7.3 Invoice Upload Flow

- [ ] Create `src/components/assets/InvoiceUploadForm.tsx`:
  - [ ] Drag-and-drop image upload zone (accept JPEG, PNG, WebP)
  - [ ] Preview uploaded image
  - [ ] "Extract with AI" button → calls `POST /api/extract-invoice`
  - [ ] Loading state: spinner with "Jaga is reading your invoice..."
  - [ ] Display extracted fields in editable form (user can correct AI errors)
  - [ ] Employee assignment dropdown (fetched from `GET /api/employees`)
  - [ ] "Register Asset" button → calls `POST /api/assets`
  - [ ] Success state: show asset ID + Solana tx link
- [ ] Create `src/app/(app)/assets/upload/page.tsx` — wraps the form component

### 7.4 Asset Detail Page

- [ ] Create `src/app/(app)/assets/[id]/page.tsx`
- [ ] Fetch from `GET /api/assets/[id]`
- [ ] Asset info card: all fields displayed cleanly
- [ ] "Assign to Employee" button → dropdown modal → calls `POST /api/assign-asset`
- [ ] Custody Timeline component (`src/components/assets/CustodyTimeline.tsx`):
  - [ ] Vertical timeline of all custody events
  - [ ] Each event: event type badge, date, from/to employee, Solana tx hash (links to Solana Explorer)
  - [ ] Color-coded event types

---

## Phase 8 — Employee Management UI

**Goal:** View employees, add new ones, trigger offboarding workflow.

### 8.1 Employee Table Component

- [ ] Create `src/components/employees/EmployeeTable.tsx`
  - [ ] Columns: Name, Email, Status (badge), Assets Held, Slack ID, Added Date
  - [ ] Status badge: green (Active), red (Offboarded)
  - [ ] "Offboard" action button on each Active row

### 8.2 Employee List Page

- [ ] Create `src/app/(app)/employees/page.tsx`
- [ ] Fetch from `GET /api/employees`
- [ ] Render `<EmployeeTable />`
- [ ] "Add Employee" button → inline form or modal:
  - [ ] Fields: Name, Email, Slack User ID (optional)
  - [ ] Submit → `POST /api/employees`
- [ ] Offboarding modal (`src/components/employees/OffboardingModal.tsx`):
  - [ ] Confirm dialog: "You are about to offboard [Name]. This will return all assigned assets and deactivate their Slack account."
  - [ ] Confirm button → `POST /api/offboard-employee`
  - [ ] Progress states: "Returning assets...", "Deactivating Slack...", "Done"
  - [ ] Results summary: list of returned assets, Slack deactivation status

---

## Phase 9 — Audit Log UI

**Goal:** Full tamper-evident audit log view with blockchain verification links.

### 9.1 Audit Log Page

- [ ] Create `src/app/(app)/audit/page.tsx`
- [ ] Fetch from `GET /api/custody-log`
- [ ] Table with columns: Timestamp, Event Type, Asset, From Employee, To Employee, On-Chain Hash, Solana Link
- [ ] Solana signature links to `https://explorer.solana.com/tx/[signature]?cluster=devnet`
- [ ] Pagination controls (20 per page)
- [ ] Filter by: asset, event type, date range
- [ ] "What is this?" info section explaining the immutable ledger concept

---

## Phase 10 — Shared UI Components

**Goal:** Reusable, consistent UI primitives across all pages.

### 10.1 Base UI Components (`src/components/ui/`)

- [ ] `Button.tsx` — variants: primary, secondary, danger, ghost
- [ ] `Badge.tsx` — variants: green, blue, red, gray, yellow
- [ ] `Input.tsx` — text input with label, error state
- [ ] `Modal.tsx` — accessible dialog with backdrop
- [ ] `Spinner.tsx` — loading indicator
- [ ] `Card.tsx` — white rounded card with optional header
- [ ] `Table.tsx` — styled table wrapper with responsive scroll
- [ ] `Alert.tsx` — info, warning, error, success variants
- [ ] `Dropdown.tsx` — select component with search

---

## Phase 11 — Verification & Testing

**Goal:** Every integration works end-to-end before demo.

### 11.1 Integration Checks

- [ ] **Supabase:** 5 tables visible in Table Editor
- [ ] **Supabase:** Magic Link auth works — receive email, click link, land on `/dashboard`
- [ ] **Anthropic:** Upload a real invoice image → extracted JSON is correct
- [ ] **Solana:** After any asset registration, a valid `solana_signature` appears in DB and is visible on Solana Explorer Devnet
- [ ] **Slack:** Trigger offboarding for test employee → Slack account deactivates
- [ ] **Resend:** Offboarding email received in inbox
- [ ] **RLS:** Log in as two different orgs — each org sees only their own data

### 11.2 Full User Journey Walkthrough

- [ ] Start as new user: land on `/`, click CTA → `/login`
- [ ] Enter email → receive magic link → click → land on `/dashboard`
- [ ] Add first employee via `/employees`
- [ ] Upload invoice at `/assets/upload` → confirm AI extraction → register asset
- [ ] Assign asset to employee → check asset detail page → verify custody event in timeline with Solana link
- [ ] Trigger offboarding → assets return to Available → Slack deactivates → email received
- [ ] Visit `/audit` → see complete immutable log with blockchain links

### 11.3 Performance & Quality

- [ ] `npm run build` — production build succeeds with no errors
- [ ] `npm run lint` — zero ESLint or TypeScript errors
- [ ] Mobile responsive: test dashboard, asset list, and upload flow on 375px viewport
- [ ] Lighthouse score: target 85+ Performance, 90+ Accessibility

---

## Phase 12 — Deployment

**Goal:** Live on Vercel, Supabase pointing to production URLs.

### 12.1 Push to GitHub

- [ ] `git add .`
- [ ] `git commit -m "feat: initial project setup — Next.js 14, Supabase, types, middleware"`
- [ ] `git push origin main`
- [ ] Confirm `.env.local` is NOT in the push (check `git status` before push)

### 12.2 Deploy to Vercel

- [ ] Go to [vercel.com](https://vercel.com) → **Add New Project** → import `jaga_asset` repo
- [ ] Framework: **Next.js** (auto-detected)
- [ ] Add all 9 environment variables in Vercel project settings:
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SOLANA_FEE_PAYER_PRIVATE_KEY`
  - [ ] `SLACK_BOT_TOKEN`
  - [ ] `SLACK_WORKSPACE_ID`
  - [ ] `RESEND_API_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL` (set to `https://jagaasset.vercel.app`)
- [ ] Set all variables to: Production + Preview + Development
- [ ] Click **Deploy** — wait ~2 minutes
- [ ] Confirm live URL loads

### 12.3 Update Supabase Auth for Production

- [ ] In Supabase → **Authentication → URL Configuration**:
  - [ ] Site URL: `https://jagaasset.vercel.app`
  - [ ] Add Redirect URL: `https://jagaasset.vercel.app/auth/callback`
- [ ] Test Magic Link on production URL

### 12.4 Final Preflight Checks

- [ ] Production URL loads without errors
- [ ] Magic Link login works on production
- [ ] Invoice upload and AI extraction works on production
- [ ] Solana custody event recorded on Devnet from production
- [ ] Slack offboarding works from production
- [ ] Solana wallet still has sufficient SOL (`solana airdrop 2 PUBKEY --url devnet` if needed)

---

## Day-by-Day Sprint Plan

| Day | Focus | Phases |
|-----|-------|--------|
| **Day 1** | Environment setup, scaffold, all secrets wired | 0 → 1 → 2 → 3 |
| **Day 2** | All 11 API routes implemented and curl-tested | 4 |
| **Day 3** | Auth UI, Dashboard, Asset Management | 5 → 6 → 7 |
| **Day 4** | Employee Management, Audit Log, Shared UI | 8 → 9 → 10 |
| **Day 5** | End-to-end testing, bug fixes, deployment | 11 → 12 |

---

## Quick Reference — Key Commands

```bash
npm run dev                              # start local dev server at localhost:3000
npm run build                            # production build (run before submitting)
npm run lint                             # TypeScript/ESLint check
git add . && git commit -m "feat: ..." && git push   # push to GitHub

solana airdrop 2 PUBKEY --url devnet     # top up Devnet SOL if low

# Verify Anthropic key:
ANTHROPIC_API_KEY=sk-ant-... node -e "
const Anthropic = require('@anthropic-ai/sdk');
const a = new Anthropic();
a.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 10, messages: [{ role: 'user', content: 'OK' }] })
  .then(r => console.log('OK:', r.content[0].text));
"

# Verify Slack bot:
curl -s https://slack.com/api/auth.test -H "Authorization: Bearer YOUR_SLACK_BOT_TOKEN"
```

---

## Day 1 Checklist (Must be ALL green before writing feature code)

- [ ] `npm run dev` runs without errors
- [ ] Supabase: 5 tables visible in Table Editor
- [ ] Supabase: Magic Link auth enabled
- [ ] Supabase: Redirect URLs set for localhost and Vercel
- [ ] Anthropic: API key test returns a response
- [ ] Solana: Fee payer wallet has 2 SOL on Devnet
- [ ] Slack: Bot token passes `auth.test`
- [ ] Slack: Test employee account exists in workspace
- [ ] Vercel: Project deployed and accessible at live URL
- [ ] Vercel: All 9 environment variables added
- [ ] `.env.local`: Not committed to GitHub (`git status` shows clean)
