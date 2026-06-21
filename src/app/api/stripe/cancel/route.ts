import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrgMembership } from '@/lib/org'

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await getOrgMembership(user.email)
  if (!membership?.org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the organisation owner can cancel the subscription' }, { status: 403 })
  }

  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('stripe_customer_id, stripe_subscription_id, plan')
    .eq('id', membership.org_id)
    .single()

  if (!org?.stripe_subscription_id || org.plan !== 'pro') {
    return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 })
  }

  // Update DB first — this is the source of truth for the app
  const { error: updateError } = await supabaseAdmin
    .from('organisations')
    .update({ subscription_status: 'canceled' })
    .eq('id', membership.org_id)

  if (updateError) {
    console.error('[stripe/cancel] DB update error:', updateError)
    return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 })
  }

  // Best effort — cancel on Stripe so they don't charge next month
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  } catch (err) {
    console.error('[stripe/cancel] Stripe API error (DB already updated):', err)
  }

  return NextResponse.json({ message: 'Cancelled. You will not be charged next month.' })
}
