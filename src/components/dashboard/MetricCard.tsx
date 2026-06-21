import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  alert?: boolean
  accent?: boolean
  className?: string
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  alert,
  accent,
  className,
}: MetricCardProps) {
  const cardStyle = alert
    ? 'border-destructive/20 bg-destructive/10'
    : accent
    ? 'border-secondary/20 bg-secondary/5'
    : 'border-border bg-card'

  const textStyle = alert
    ? 'text-destructive'
    : accent
    ? 'text-secondary'
    : 'text-muted-foreground'

  const iconStyle = alert
    ? 'bg-destructive/10 text-destructive'
    : accent
    ? 'bg-secondary/10 text-secondary'
    : 'bg-primary/10 text-primary'

  const valueStyle = alert ? 'text-destructive' : accent ? 'text-secondary' : 'text-foreground'

  return (
    <div className={cn('rounded-md border shadow-sm p-5 flex flex-col gap-3', cardStyle, className)}>
      <div className="flex items-start justify-between">
        <p className={cn('text-sm font-medium', textStyle)}>{title}</p>
        {icon && <div className={cn('w-9 h-9 rounded-md flex items-center justify-center', iconStyle)}>{icon}</div>}
      </div>

      <div>
        <p className={cn('text-2xl font-bold', valueStyle)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {trend && trendLabel && (
        <div className="flex items-center gap-1 text-xs">
          {trend === 'up' && (
            <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          {trend === 'down' && (
            <svg className="h-3 w-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          <span className={cn('font-medium', trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  )
}
