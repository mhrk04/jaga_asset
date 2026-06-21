import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { createHash } from 'crypto'

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency — defaults to MYR (RM)
export function formatCurrency(amount: number, currency = 'MYR'): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Human-readable date, e.g. "19 Jun 2026"
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Relative time, e.g. "2 hours ago"
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  return formatDate(dateString)
}

// SHA-256 event hash for custody chain-of-custody records
export function generateEventHash(
  assetId: string,
  eventType: string,
  timestamp: string,
  fromEmployeeId?: string,
  toEmployeeId?: string
): string {
  const payload = [assetId, eventType, timestamp, fromEmployeeId ?? '', toEmployeeId ?? ''].join(
    '|'
  )
  return createHash('sha256').update(payload).digest('hex')
}

// SHA-256 batch event hash for multi-asset custody events
export function generateBatchEventHash(
  assetIds: string[],
  eventType: string,
  timestamp: string
): string {
  const payload = [assetIds.join(','), eventType, timestamp].join('|')
  return createHash('sha256').update(payload).digest('hex')
}
