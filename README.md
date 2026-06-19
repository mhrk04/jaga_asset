# 🛡️ jaga_asset

> **Autonomous, Web3-secured IT asset and SaaS lifecycle coordinator for Southeast Asian SMEs.**

jaga_asset (derived from the Malay word *Jaga*, meaning "to guard" or "watch") is an intelligent, low-friction operations dashboard designed to rescue growing businesses from "The Spreadsheet Trap". By merging **Claude Sonnet 4.6 Vision** with an invisible **Solana Chain of Custody ledger**, JagaAsset eliminates manual data entry, secures hardware accountability, and plugs SaaS cost leaks autonomously.

---

## 🚀 The Real-World Pain We Solve

Small and Medium Enterprises (SMEs) with 10–50 employees rarely have dedicated IT departments. Instead, operations managers handle tracking using fragile, easily alterable spreadsheets, leading to two major leaks:

1. **The Accountability Gap (Internal Loss & Tampering):** Spreadsheet rows can be silently deleted or altered. When an employee or admin departs, high-value devices (such as RM 7,000 MacBooks) can vanish without an immutable, traceable trail of who possessed what and when.


2. **The SaaS Cost Bleed (Orphan Accounts):** Offboarding staff manually across 15+ SaaS tools is tedious. Administrators routinely forget to revoke access to tools like Figma or Canva, leaving the business paying monthly fees for inactive "orphan" accounts.



---

## ✨ Features & Pillars

* **📸 Zero-Friction Ingestion:** Snap a photo of a hardware invoice. Claude Sonnet 4.6 Vision extracts the merchant, specifications, serial number, and warranty details into a standardized, validated JSON payload.


* **🔗 Immutable Chain of Custody:** Every asset registration, assignment, or return triggers a server-signed transaction to the Solana Devnet. Serialized state parameters are written to the ledger using the Solana Memo Program. If the database is tampered with, comparison against the blockchain instantly flags the discrepancy.


* **🤖 Agentic Deprovisioning:** Upon employee offboarding, the agent calls a type-safe Slack API tool to automatically deactivate the employee's account from the corporate workspace—instantly reclaiming the licensed seat.



---

## 🛠️ Zero-Maintenance Tech Stack

Designed to cost **$0.00/month** during validation and maintain a 90%+ gross margin in production:

| Layer | Service | Phase Cost | Role |
| --- | --- | --- | --- |
| **Frontend** | Next.js 15 + Tailwind CSS | $0 (Free) | Dashboard & timeline visualization.| 
| **Backend & API** | Vercel (Hobby Tier) | $0 (Free) | Hosting client & edge API routes.|
| **Database & Auth** | Supabase Free Tier | $0 (Free) | Postgres DB & Row-Level Security.|
| **AI Engine** | Claude Sonnet 4.6 (subject to change) | $0 (Credits) | Invoice vision extraction & tool use. |
| **Trust Ledger** | Solana Devnet | $0 (Free) | Public, tamper-evident audit anchoring.|
| **SaaS Gateway** | Slack Web API | $0 (Free) | Automated workspace deactivation.|

---

## ⚙️ How It Works (The Caching and Security Loop)
```
[User Uploads Invoice Image]
│
▼
[Serverless Next.js Route]
│
▼
[Claude Sonnet 4.6 API Engine] (Prompt Caching enabled for 90% cost reduction)
│
┌───────┴─────────────────────────────────┐
▼ (Structured JSON Output)                ▼ (Agentic Intent Tracking)
[Create Cryptographic State Hash]      [Query Supabase Roster for New Hires]
│                                         │
▼                                         ▼
[Server Signs to Solana Memo Program]  [Secure Webhook: Assign and Route Gear]
│                                         │
▼                                         ▼
[On-Chain Immutability Confirmed]      [Auto-Deactivate Slack Seats on Exit]

```

### 1. Cost-Optimized Structured Extraction
jaga_asset leverages **Explicit Prompt Caching** to bypass full-token compilation fees. By padding the system instruction block with comprehensive validation taxonomies to exceed 1024 tokens, repeated parses receive a **90% discount** .

### 2. Sponsoring Devnet Gasless UX
To bypass Web3 onboarding barriers (wallets, seed phrases, gas fees), JagaAsset utilizes a **Serverless Signing Pattern** . The Next.js API route signs transactions using an internal `SYSTEM_FEE_PAYER` keypair, writing hashes directly to Solana Devnet .

---

## 💎 Project Operational Unit Economics

Let $C_{\text{action}}$ represent the cumulative cost of a single invoice lifecycle parse, including Vision parsing ($R_{\text{base}}$), Prompt Caching hits ($R_{\text{hit}}$), and Solana on-chain state registration ($R_{\text{sol}}$) :

$$C_{\text{action}} = (I_{\text{cached}} \times R_{\text{hit}}) + (I_{\text{new}} \times R_{\text{base}}) + (O \times R_{\text{out}}) + R_{\text{sol}}$$

Based on typical regional operational volumes (100 actions/month) :
* **API Cost Profile (Sonnet 4.6 with Caching):**
  * Input with 90% Cache Hits: $5,000 \times \$0.30/ \text{MTok} = \$0.0015$ .
  * Output generation: $400 \times \$15.00/\text{MTok} = \$0.0060$ .
* **On-Chain Solana Fee:** $0.000005$ SOL per Memo $\approx \$0.00025$ .
* **Total Cost to Serve (per month/client):** **~$0.775** (RM 3.40) .
* **Subscription Price Charged:** **$9.00/month** (RM 39.00) .
* **Gross Profit Margin:** **~91.3%** .

---

## 🛠️ Environment Variables Setup

Create a `.env.local` file in your root folder:

```env
# Anthropic
ANTHROPIC_API_KEY=your_claude_api_key

# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Solana Backend Fee Payer (Base58 encoded private key)
SOLANA_FEE_PAYER_PRIVATE_KEY=your_base58_private_key

# Slack Bot Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_WORKSPACE_ID=your_slack_workspace_id

# Email
RESEND_API_KEY=your_resend_api_key

```

---
