"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

const STATS = [
  { value: "100%", label: "On-chain audit trail" },
  { value: "< 30s", label: "Invoice to asset" },
  { value: "1-click", label: "Employee offboarding" },
  { value: "RM 0", label: "To get started" },
];

const FEATURES = [
  {
    tag: "01 — Ingestion",
    title: "Snap. Extract. Done.",
    desc: "Upload any invoice photo. Gemini AI reads the merchant, model, serial number, price, and warranty — and creates the asset record in under 30 seconds. No spreadsheet. No manual entry.",
    bullets: [
      "Supports JPEG, PNG, WebP invoices",
      "AI corrects OCR errors automatically",
      "Editable before saving",
    ],
    image: "/screenshots/ingestion.avif",
    dark: false,
  },
  {
    tag: "02 — Chain of Custody",
    title: "Every move, on-chain.",
    desc: "When an asset is registered, assigned, transferred, or decommissioned, a SHA-256 hash is written to Solana. Your auditor can verify it independently — no need to trust JagaAsset.",
    bullets: [
      "Solana Devnet — publicly verifiable",
      "Tamper-proof event log",
      "Links to Solana Explorer per event",
    ],
    image: "/screenshots/blockchain.avif",
    dark: true,
  },
  {
    tag: "03 — Offboarding",
    title: "One click to offboard.",
    desc: "When an employee leaves, JagaAsset returns all their assets, records custody transfers on-chain, and emails an offboarding summary. No forgotten laptops. No orphan SaaS seats.",
    bullets: [
      "All assets returned automatically",
      "Confirmation email via Resend",
      "Orphan seat detection dashboard",
    ],
    image: "/screenshots/offboarding.avif",
    dark: false,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Sign up free",
    desc: "Email & password. Your org is created from your email domain.",
  },
  {
    step: "02",
    title: "Add employees",
    desc: "Enter name and email. Takes 10 seconds each.",
  },
  {
    step: "03",
    title: "Upload invoices",
    desc: "Drop in a photo of any purchase receipt. AI extracts everything.",
  },
  {
    step: "04",
    title: "Assign & track",
    desc: "Assign assets to employees. Every movement is hashed on Solana.",
  },
  {
    step: "05",
    title: "Offboard instantly",
    desc: "One click returns all assets, emails the employee, and closes the loop.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold px-4 py-2 rounded-md transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Built for Malaysian & SEA SMEs
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl">
          Jaga aset syarikat
          <br />
          <span className="text-primary">dengan blockchain.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-10">
          IT asset management for SMEs with 10–50 staff. Scan invoices, track
          custody on Solana, and offboard employees in one click — all without a
          spreadsheet.
        </p>

        <div className="flex flex-wrap gap-4 mb-20">
          <Link
            href="/login?mode=signup"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 py-3 rounded-md transition-colors text-sm"
          >
            Cuba percuma sekarang →
          </Link>
          <Link
            href="/pricing"
            className="border border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground font-medium px-6 py-3 rounded-md transition-colors text-sm"
          >
            See pricing
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-md overflow-hidden border border-border">
          {STATS.map((s) => (
            <div key={s.label} className="bg-card px-6 py-5">
              <p className="text-2xl font-black text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="border-t border-border">
        {FEATURES.map((f) => (
          <div
            key={f.tag}
            className={`border-b border-border ${f.dark ? "bg-muted/30" : "bg-background"}`}
          >
            <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
                  {f.tag}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-5">
                  {f.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">{f.desc}</p>
                <ul className="space-y-3">
                  {f.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-3 text-sm text-foreground/70"
                    >
                      <svg
                        className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature visual */}
              <div className="rounded-md border border-border bg-card overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  className="w-full h-full object-cover opacity-90"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground/20 text-xs font-mono uppercase tracking-widest">
                    {f.title} Screenshot
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-b border-border py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-16 max-w-xl">
            From zero to full asset control in under 10 minutes.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border rounded-md overflow-hidden border border-border">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-card px-5 py-6">
                <p className="text-3xl font-black text-muted-foreground/20 mb-4">
                  {s.step}
                </p>
                <p className="text-sm font-bold text-foreground mb-2">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section className="py-24 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
              Pricing
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              Free for up to 10 assets.
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              No credit card required to start. Upgrade when you grow.
            </p>
          </div>
          <Link
            href="/pricing"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 py-3 rounded-md transition-colors text-sm whitespace-nowrap flex-shrink-0"
          >
            View pricing plans →
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Dah cuba belum?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-md mx-auto text-sm leading-relaxed">
            Join SMEs across Malaysia using JagaAsset to eliminate spreadsheets,
            prevent asset loss, and stay audit-ready.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Mula sekarang — percuma
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <p className="text-xs text-muted-foreground/60 mt-4">
            Free up to 10 assets · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Logo iconClassName="w-6 h-6" />
            <span className="text-muted-foreground/50 text-sm">
              — Guard your assets. Own your data.
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground/50">
            <Link
              href="/pricing"
              className="hover:text-foreground/60 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hover:text-foreground/60 transition-colors"
            >
              Sign in
            </Link>
            <span>© {new Date().getFullYear()} JagaAsset</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
