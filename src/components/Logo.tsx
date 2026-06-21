interface LogoProps {
  className?: string
  iconOnly?: boolean
  iconClassName?: string
}

export default function Logo({ className = '', iconOnly, iconClassName }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 100 100" className={iconClassName ?? 'w-8 h-8'} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
        <path d="M50 5 L85 20 L85 55 C85 75 50 95 50 95 C50 95 15 75 15 55 L15 20 L50 5Z" fill="url(#brand-grad)" />
        <path d="M42 30 H58 V65 C58 72 52 78 45 78 C38 78 32 72 32 65" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="58" cy="30" r="5" fill="url(#accent-grad)" />
        <path d="M50 15 L78 28 L78 55" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
      </svg>
      {!iconOnly && <span className="text-lg font-bold tracking-tight text-foreground">JagaAsset</span>}
    </span>
  )
}
