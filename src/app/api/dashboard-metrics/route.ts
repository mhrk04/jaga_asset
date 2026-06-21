import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireVerifiedEmail } from '@/lib/org'
import { getOrgPlan, PLAN_LIMITS } from '@/lib/plan'
import type { DashboardMetrics } from '@/types'

// GET /api/dashboard-metrics
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const verifiedError = requireVerifiedEmail(user)
  if (verifiedError) return verifiedError

  const org_id = await resolveOrgId(user.email!)
  if (!org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  try {
    // Run all queries in parallel for performance
    const [assetsRes, employeesRes, custodyRes, expiringRes, offboardedRes, newAssetsRes] =
      await Promise.all([
        // All assets for total/assigned/available counts and total value
        supabaseAdmin
          .from('assets')
          .select('status, purchase_price')
          .eq('org_id', org_id),

        // All employees for active count + orphan seats check
        supabaseAdmin
          .from('employees')
          .select('id, status')
          .eq('org_id', org_id),

        // Count all custody events (on-chain events)
        supabaseAdmin
          .from('custody_events')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org_id),

        // Assets expiring within 90 days
        supabaseAdmin
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org_id)
          .gte('warranty_end_date', new Date().toISOString().split('T')[0])
          .lte(
            'warranty_end_date',
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          ),

        // Employees offboarded this calendar month
        supabaseAdmin
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org_id)
          .eq('status', 'Offboarded')
          .gte('offboarding_date', getStartOfMonth()),

        // New assets registered this calendar month
        supabaseAdmin
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org_id)
          .gte('created_at', getStartOfMonth()),
      ])

    const assets = assetsRes.data ?? []
    const employees = employeesRes.data ?? []

    const totalAssets = assets.length
    const assignedAssets = assets.filter((a) => a.status === 'Assigned').length
    const availableAssets = assets.filter((a) => a.status === 'Available').length
    const totalValue = assets.reduce((sum, a) => sum + (a.purchase_price ?? 0), 0)

    const activeEmployees = employees.filter((e) => e.status === 'Active').length

    // Orphan seats: offboarded employees who somehow still have assigned assets
    const offboardedIds = employees.filter((e) => e.status === 'Offboarded').map((e) => e.id)
    let orphanSeats = 0
    if (offboardedIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('status', 'Assigned')
        .in('assigned_to', offboardedIds)
      orphanSeats = count ?? 0
    }

    const planName = await getOrgPlan(org_id)
    const limits = PLAN_LIMITS[planName]

    // Fetch subscription dates for billing awareness
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('subscription_status, trial_ends_at, current_period_end')
      .eq('id', org_id)
      .maybeSingle()

    const metrics: DashboardMetrics = {
      totalAssets,
      assignedAssets,
      availableAssets,
      totalValue,
      orphanSeats,
      expiringSoon: expiringRes.count ?? 0,
      onChainEvents: custodyRes.count ?? 0,
      activeEmployees,
      newAssetsThisMonth: newAssetsRes.count ?? 0,
      offboardedThisMonth: offboardedRes.count ?? 0,
      plan: {
        name: planName,
        assetLimit: limits.assets,
        employeeLimit: limits.employees,
        subscriptionStatus: org?.subscription_status ?? null,
        trialEndsAt: org?.trial_ends_at ?? null,
        currentPeriodEnd: org?.current_period_end ?? null,
      },
    }

    return NextResponse.json(metrics, { status: 200 })
  } catch (err) {
    console.error('[GET /api/dashboard-metrics] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getStartOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}
