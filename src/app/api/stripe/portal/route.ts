import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrgMembership } from '@/lib/org'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL('/pricing', APP_URL))
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.redirect(new URL('/login', APP_URL))
  }

  const membership = await getOrgMembership(user.email)
  if (!membership?.org_id) {
    return NextResponse.redirect(new URL('/pricing', APP_URL))
  }

  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('stripe_customer_id')
    .eq('id', membership.org_id)
    .maybeSingle()

  if (!org?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/pricing', APP_URL))
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    })

    return NextResponse.redirect(session.url)
  } catch (err) {
    console.error('[stripe/portal] Error:', err)
    return NextResponse.redirect(new URL('/dashboard', APP_URL))
  }
}