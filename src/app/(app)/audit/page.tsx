'use client'

import { useEffect, useState, useCallback } from 'react'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { CustodyEvent } from '@/types'

type EnrichedEvent = CustodyEvent & {
  asset?: { id: string; item_name: string; category: string; serial_number: string } | null
  from_employee?: { id: string; name: string; email: string } | null
  to_employee?: { id: string; name: string; email: string } | null
  is_tampered?: boolean
}

const eventVariant: Record<string, 'green' | 'blue' | 'purple' | 'gray'> = {
  Registered: 'green',
  Assigned: 'blue',
  Transferred: 'purple',
  Decommissioned: 'gray',
}

const PAGE_SIZE = 20

export default function AuditPage() {
  const [events, setEvents] = useState<EnrichedEvent[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)

  const fetchEvents = useCallback(async (off: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(off),
      })
      if (eventTypeFilter) params.set('event_type', eventTypeFilter)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)

      const res = await fetch(`/api/custody-log?${params}`)
      if (!res.ok) throw new Error('Failed to load audit log')
      const data = await res.json()
      setEvents(data.events ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [eventTypeFilter, fromDate, toDate])

  useEffect(() => {
    setOffset(0)
    fetchEvents(0)
  }, [fetchEvents])

  const handlePrev = () => {
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    setOffset(newOffset)
    fetchEvents(newOffset)
  }

  const handleNext = () => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchEvents(newOffset)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const pendingCount = events.filter((event) => !event.solana_signature).length

  const handleBackfill = async () => {
    setBackfilling(true)
    setBackfillMsg(null)
    try {
      const res = await fetch('/api/custody-events/backfill-pending', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backfill failed')
      setBackfillMsg(`Updated ${data.updated} event(s).`)
      fetchEvents(offset)
    } catch (err) {
      setBackfillMsg(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-solana/10 rounded-xl flex items-center justify-center">
          <svg className="h-5 w-5 text-solana-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forensic Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable chain of custody — every event hashed and anchored to Solana Devnet
          </p>
        </div>
      </div>

      {/* Info */}
      <Alert variant="info" className="border-solana/20">
        <strong>Blockchain-Verified.</strong> Every register, assign, transfer, or decommission event generates
        a SHA-256 hash stored on the Solana ledger. This tamper-evident trail cannot be altered —
        not even by JagaAsset.
      </Alert>

      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-300">{pendingCount} event{pendingCount !== 1 ? 's' : ''} waiting for Solana proof</p>
            <p className="text-xs text-amber-200/70 mt-1">These are already in the database, but the on-chain memo did not complete. Replay them now.</p>
          </div>
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {backfilling ? 'Replaying…' : 'Replay to Solana'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3">
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-background text-foreground"
        >
          <option value="">All event types</option>
          {['Registered', 'Assigned', 'Transferred', 'Decommissioned'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {(eventTypeFilter || fromDate || toDate) && (
          <button
            onClick={() => { setEventTypeFilter(''); setFromDate(''); setToDate('') }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto text-sm text-muted-foreground self-center">
          {total} total event{total !== 1 ? 's' : ''}
        </div>
      </div>

      {backfillMsg && <div className="text-sm text-muted-foreground">{backfillMsg}</div>}

      {/* Table */}
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <svg className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-medium text-foreground/70">No custody events yet</p>
          <p className="text-sm mt-1">Register your first asset to see it here.</p>
        </div>
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Event</Th>
                <Th>Asset</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>On-Chain Hash</Th>
                <Th className="text-solana-light">Solana</Th>
              </tr>
            </Thead>
            <Tbody>
              {events.map((event) => (
                <Tr key={event.id}>
                  <Td className="whitespace-nowrap">
                    <div>
                      <p className="text-foreground">{formatDate(event.occurred_at)}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(event.occurred_at)}</p>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={eventVariant[event.event_type] ?? 'gray'}>{event.event_type}</Badge>
                  </Td>
                  <Td className="max-w-xs">
                    <div>
                      <p className="text-foreground truncate">{event.asset?.item_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{event.asset?.category}</p>
                    </div>
                  </Td>
                  <Td>{event.from_employee?.name ?? '—'}</Td>
                  <Td>{event.to_employee?.name ?? '—'}</Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <span className={`font-mono text-xs truncate block max-w-[120px] ${event.is_tampered ? 'text-red-500 font-bold' : 'text-muted-foreground'}`} title={event.event_hash}>
                        {event.event_hash?.slice(0, 12)}...
                      </span>
                      {event.is_tampered && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 w-fit">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          TAMPERED
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {event.solana_signature ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-solana/10 text-solana-light">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                          LIVE
                        </span>
                        <a
                          href={`https://explorer.solana.com/tx/${event.solana_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-solana-light hover:underline"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Explorer
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 w-fit">
                          PENDING
                        </span>
                        <button
                          onClick={handleBackfill}
                          className="text-left text-[10px] text-amber-300 hover:text-amber-200 underline underline-offset-2"
                        >
                          Replay
                        </button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} events)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={offset === 0}
                  className="border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={offset + PAGE_SIZE >= total}
                  className="border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
