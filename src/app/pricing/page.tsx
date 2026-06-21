import Link from 'next/link'
import Logo from '@/components/Logo'

const PLANS = [
  {
    name: 'Free',
    price: 'RM 0',
    period: 'forever',
    desc: 'Perfect for small teams getting started with asset tracking.',
    cta: 'Start free',
    ctaHref: '/login',
    highlight: false,
    limits: '10 assets · 5 employees',
    features: [
      'Up to 10 assets',
      'Up to 5 employees',
      'AI invoice extraction',
      'On-chain custody log (Solana)',
      'Email & password login',
      'Offboarding workflow',
      'Email notifications',
    ],
    missing: [
      'Unlimited assets',
      'Priority support',
      'Custom domain email',
      'CSV / PDF export',
      'API access',
    ],
  },
  {
    name: 'Pro',
    price: 'RM 99',
    period: 'per month',
    desc: 'For growing SMEs that need full asset visibility and no limits.',
    cta: 'Start Pro trial',
    ctaHref: '/api/stripe/checkout?plan=pro',
    highlight: true,
    limits: 'Unlimited assets & employees',
    features: [
      'Unlimited assets',
      'Unlimited employees',
      'AI invoice extraction',
      'On-chain custody log (Solana)',
      'Email & password login',
      'Offboarding workflow',
      'Email notifications',
      'CSV / PDF export',
      'API access',
      'Priority email support',
      'Custom from-email domain',
    ],
    missing: [],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    desc: 'For companies with compliance requirements, SLAs, or custom integrations.',
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@jagaasset.com',
    highlight: false,
    limits: 'Everything in Pro, plus:',
    features: [
      'Everything in Pro',
      'Dedicated priority support',
      'Custom onboarding & training',
      'SSO / SAML login',
      'Custom Solana RPC endpoint',
      'On-premise / private cloud option',
      'SLA guarantee',
      'Invoice & PO billing',
    ],
    missing: [],
  },
]

const FAQ = [
  {
    q: 'What counts as an asset?',
    a: 'Any physical IT item registered via invoice — laptops, monitors, phones, cameras, peripherals. Each unique item is one asset.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Upgrading takes effect immediately. Downgrading takes effect at the end of your current billing period.',
  },
  {
    q: 'What happens when I hit the free limit of 10 assets?',
    a: 'You can still view existing assets and the audit log, but you cannot register new assets until you upgrade to Pro.',
  },
  {
    q: 'Is the Solana on-chain logging free?',
    a: 'Yes. We cover the tiny Solana transaction fees (~RM 0.002 per event) as part of the platform. You never pay gas.',
  },
  {
    q: 'Do you store invoice images?',
    a: 'Currently the AI extracts data from the image and the image itself is not stored. This will be an opt-in Pro feature.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Credit/debit card via Stripe. FPX (Malaysian online banking) and invoice billing are available on Enterprise.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
            <Link href="/login?mode=signup" className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Pricing</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
          Simple, honest pricing.
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
          Start free. Pay when you grow. No hidden fees, no per-seat traps,
          no surprise invoices.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 mb-6 text-sm text-amber-800 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong className="font-semibold">Sandbox Mode</strong> — This app is in development. Stripe is in test mode.
            Do <strong>not</strong> enter real credit card details. Use the test card <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">4242 4242 4242 4242</code> with any future expiry and any CVC.
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.highlight
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border bg-card'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{plan.name}</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground/50 text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{plan.desc}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                  {plan.limits}
                </span>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/70">
                    <svg className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/30">
                    <svg className="h-4 w-4 text-muted-foreground/20 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                  className={`w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'border border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
                  }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            All paid plans include a <span className="text-foreground/50 font-medium">14-day free trial</span> · Cancel anytime · Payments secured by Stripe
          </p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="border-t border-border py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-black tracking-tight mb-12 text-center">Full feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-6 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Free</th>
                  <th className="text-center py-3 px-4 text-emerald-600 font-bold">Pro</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Assets', '10', 'Unlimited', 'Unlimited'],
                  ['Employees', '5', 'Unlimited', 'Unlimited'],
                  ['AI invoice extraction', '✓', '✓', '✓'],
                  ['On-chain audit log', '✓', '✓', '✓'],
                  ['Offboarding workflow', '✓', '✓', '✓'],
                  ['Email notifications', '✓', '✓', '✓'],
                  ['CSV / PDF export', '—', '✓', '✓'],
                  ['API access', '—', '✓', '✓'],
                  ['Priority support', '—', 'Email', 'Email + SLA'],
                  ['SSO / SAML', '—', '—', '✓'],
                  ['Custom RPC endpoint', '—', '—', '✓'],
                  ['FPX / invoice billing', '—', '—', '✓'],
                ].map(([feature, free, pro, enterprise]) => (
                  <tr key={feature}>
                    <td className="py-3.5 pr-6 text-foreground/60">{feature}</td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground">{free}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-medium">{pro}</td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-border py-24">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-black tracking-tight mb-12 text-center">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-border pb-6">
                <p className="font-semibold text-foreground mb-2">{item.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border py-20 text-center">
        <h2 className="text-3xl font-black tracking-tight mb-3">Ready to jaga your assets?</h2>
        <p className="text-muted-foreground text-sm mb-8">Start free — no credit card needed.</p>
        <Link
          href="/login?mode=signup"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-xl transition-colors"
        >
          Mula sekarang — percuma
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

    </div>
  )
}
