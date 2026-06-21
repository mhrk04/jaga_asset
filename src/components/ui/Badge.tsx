import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'blue' | 'red' | 'gray' | 'yellow' | 'purple'
  className?: string
}

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  const variants = {
    green: 'bg-primary/10 text-primary',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-destructive/10 text-destructive',
    gray: 'bg-muted text-muted-foreground',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-secondary/10 text-secondary',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
