import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  header?: React.ReactNode
  footer?: React.ReactNode
}

export default function Card({ children, className, header, footer }: CardProps) {
  return (
    <div className={cn('bg-card text-card-foreground rounded-md border shadow-sm overflow-hidden', className)}>
      {header && (
        <div className="px-6 py-4 border-b border-border bg-muted/50">{header}</div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-border bg-muted/50">{footer}</div>
      )}
    </div>
  )
}
