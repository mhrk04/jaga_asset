'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MetricCard from '@/components/dashboard/MetricCard'
import PlanUsageCard from '@/components/dashboard/PlanUsageCard'
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner'
import TempPasswordBanner from '@/components/TempPasswordBanner'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { DashboardMetrics, CustodyEvent } from '@/types'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentEvents, setRecentEvents] = useState<CustodyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [metricsRes, eventsRes] = await Promise.all([
          fetch('/api/dashboard-metrics'),
          fetch('/api/custody-log?limit=5'),
        ])

        if (!metricsRes.ok) throw new Error('Failed to load metrics')
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setRecentEvents(eventsData.events ?? [])
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <Alert variant="error" title="Failed to load dashboard">{error}</Alert>
  }

  if (!metrics) return null

  const eventTypeBadge: Record<string, string> = {
    Registered: 'bg-emerald-500/10 text-emerald-600',
    Assigned: 'bg-blue-500/10 text-blue-600',
    Transferred: 'bg-purple-500/10 text-purple-600',
    Decommissioned: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your organisation&apos;s IT assets</p>
      </div>

      <TempPasswordBanner />

      <SubscriptionBanner metrics={metrics} />

      <PlanUsageCard
        planName={metrics.plan.name}
        assetLimit={metrics.plan.assetLimit}
        employeeLimit={metrics.plan.employeeLimit}
        totalAssets={metrics.totalAssets}
        activeEmployees={metrics.activeEmployees}
      />

      {/* Alerts */}
      {metrics.orphanSeats > 0 && (
        <Alert variant="warning" title="Orphan seats detected">
          {metrics.orphanSeats} offboarded employee(s) still have assets assigned. Go to{' '}
          <Link href="/employees" className="underline font-medium">Employees</Link> to resolve.
        </Alert>
      )}
      {metrics.expiringSoon > 0 && (
        <Alert variant="info" title="Warranties expiring soon">
          {metrics.expiringSoon} asset(s) have warranties expiring within 90 days.
        </Alert>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Assets"
          value={metrics.totalAssets}
          subtitle={formatCurrency(metrics.totalValue)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          title="Assigned"
          value={metrics.assignedAssets}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <MetricCard
          title="Available"
          value={metrics.availableAssets}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <MetricCard
          title="Active Employees"
          value={metrics.activeEmployees}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <MetricCard
          title="On-Chain Events"
          value={metrics.onChainEvents}
          subtitle="Solana Devnet"
          accent
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          }
        />
        <MetricCard
          title="Orphan Seats"
          value={metrics.orphanSeats}
          alert={metrics.orphanSeats > 0}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          title="Expiring Warranties"
          value={metrics.expiringSoon}
          subtitle="Next 90 days"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="New This Month"
          value={metrics.newAssetsThisMonth}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />
      </div>

      {/* Recent activity */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
          <Link href="/audit" className="text-sm text-emerald-400 hover:text-emerald-400 font-medium">
            View all →
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No custody events yet. Register your first asset to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentEvents.map((event) => (
              <li key={event.id} className="px-6 py-3 flex items-center gap-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventTypeBadge[event.event_type] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {event.event_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {(event as CustodyEvent & { asset?: { item_name: string } }).asset?.item_name ?? event.asset_id}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.solana_signature && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-solana/10 text-solana-light">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      CHAIN
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(event.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
