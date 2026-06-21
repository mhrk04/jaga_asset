'use client'

import type { DashboardMetrics } from '@/types'

interface Props {
  metrics: DashboardMetrics
}

export default function SubscriptionBanner({ metrics }: Props) {
  const { plan } = metrics
  const isFree = plan.name === 'free'

  // Free + trial exists → user is on trial
  const trialEnd = plan.trialEndsAt ? new Date(plan.trialEndsAt) : null
  const periodEnd = plan.currentPeriodEnd ? new Date(plan.currentPeriodEnd) : null
  const now = new Date()

  // Trial ending within 7 days
  const trialEndingSoon = trialEnd && !isFree && trialEnd > now && trialEnd <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Payment past due (grace period)
  const isPastDue = plan.subscriptionStatus === 'past_due'

  if (!trialEndingSoon && !isPastDue) return null

  if (trialEndingSoon) {
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-600">
              Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Your Pro trial will end on {trialEnd.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}. Your card will be charged RM99/month afterward.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isPastDue) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">Payment failed</p>
            <p className="text-xs text-red-600 mt-0.5">
              Your latest subscription payment failed. Update your payment method to keep Pro access.
              {periodEnd && periodEnd > now && (
                <span> Access will continue until {periodEnd.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}.</span>
              )}
              {periodEnd && periodEnd <= now && (
                <span> Your access may be suspended soon.</span>
              )}
            </p>
          </div>
        </div>
        <a
          href="/api/stripe/portal"
          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          Update billing
        </a>
      </div>
    )
  }

  return null
}
