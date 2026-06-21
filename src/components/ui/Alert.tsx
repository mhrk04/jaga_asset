import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const config = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: 'text-blue-500',
      path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      icon: 'text-yellow-500',
      path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    },
    error: {
      bg: 'bg-destructive/10 border-destructive/20 text-destructive',
      icon: 'text-destructive',
      path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    success: {
      bg: 'bg-primary/10 border-primary/20 text-primary',
      icon: 'text-primary',
      path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  }

  const c = config[variant]

  return (
    <div className={cn('flex gap-3 rounded-md border p-4', c.bg, className)}>
      <div className="flex-shrink-0 mt-0.5">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={c.path} />
        </svg>
      </div>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
