import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { CustodyEvent } from '@/types'

interface CustodyTimelineProps {
  events: (CustodyEvent & {
    from_employee?: { id: string; name: string; email: string } | null
    to_employee?: { id: string; name: string; email: string } | null
  })[]
}

const eventColors: Record<string, string> = {
  Registered: 'bg-emerald-500',
  Assigned: 'bg-blue-500',
  Transferred: 'bg-purple-500',
  Decommissioned: 'bg-gray-500',
}

const eventBadge: Record<string, string> = {
  Registered: 'bg-emerald-500/10 text-emerald-600',
  Assigned: 'bg-blue-500/10 text-blue-600',
  Transferred: 'bg-purple-500/10 text-purple-600',
  Decommissioned: 'bg-muted text-muted-foreground',
}

export default function CustodyTimeline({ events }: CustodyTimelineProps) {
  if (events.length === 0) {
    return     <p className="text-sm text-muted-foreground">No custody events recorded.</p>
  }

  return (
    <ol className="relative border-l border-border space-y-6 pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          {/* Dot */}
          <span
            className={`absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${eventColors[event.event_type] ?? 'bg-gray-400'}`}
          />

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventBadge[event.event_type] ?? 'bg-muted text-muted-foreground'}`}>
                {event.event_type}
              </span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(event.occurred_at)} · {formatDate(event.occurred_at)}</span>
            </div>

            {(event.from_employee || event.to_employee) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {event.from_employee && (
                  <span className="font-medium">{event.from_employee.name}</span>
                )}
                {event.from_employee && event.to_employee && (
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
                {event.to_employee && (
                  <span className="font-medium">{event.to_employee.name}</span>
                )}
              </div>
            )}

            {event.event_hash && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                Hash: {event.event_hash}
              </p>
            )}

            {event.solana_signature && (
              <a
                href={`https://explorer.solana.com/tx/${event.solana_signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-600 hover:underline"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Solana Explorer
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
