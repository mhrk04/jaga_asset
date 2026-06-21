import { supabaseAdmin } from '@/lib/supabase/admin'

export const PLAN_LIMITS = {
  free: { assets: 10, employees: 5 },
  pro: { assets: Infinity, employees: Infinity },
  enterprise: { assets: Infinity, employees: Infinity },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export async function getOrgPlan(org_id: string): Promise<Plan> {
  const { data } = await supabaseAdmin
    .from('organisations')
    .select('plan, subscription_status')
    .eq('id', org_id)
    .single()

  if (!data) return 'free'

  // Treat past_due as still active (grace period)
  if (data.plan === 'pro' && ['active', 'past_due', 'trialing'].includes(data.subscription_status ?? '')) {
    return 'pro'
  }
  if (data.plan === 'enterprise') return 'enterprise'
  return 'free'
}

export async function checkAssetLimit(org_id: string): Promise<{ allowed: boolean; plan: Plan; current: number; limit: number }> {
  const plan = await getOrgPlan(org_id)
  const limit = PLAN_LIMITS[plan].assets

  if (limit === Infinity) return { allowed: true, plan, current: 0, limit: Infinity }

  const { count } = await supabaseAdmin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org_id)

  const current = count ?? 0
  return { allowed: current < limit, plan, current, limit }
}

export async function checkEmployeeLimit(org_id: string): Promise<{ allowed: boolean; plan: Plan; current: number; limit: number }> {
  const plan = await getOrgPlan(org_id)
  const limit = PLAN_LIMITS[plan].employees

  if (limit === Infinity) return { allowed: true, plan, current: 0, limit: Infinity }

  const { count } = await supabaseAdmin
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org_id)
    .eq('status', 'Active')

  const current = count ?? 0
  return { allowed: current < limit, plan, current, limit }
}
