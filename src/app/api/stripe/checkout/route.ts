import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Price IDs — create these in your Stripe dashboard and set them here
// Dashboard: https://dashboard.stripe.com/products
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan') ?? 'pro'

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const redirectAfter = encodeURIComponent(`/api/stripe/checkout?plan=${plan}`)
    return NextResponse.redirect(new URL(`/login?mode=signup&redirect=${redirectAfter}`, APP_URL))
  }
  const priceId = PRICE_IDS[plan]

  // Stripe not configured yet — show a clear message
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.' },
      { status: 503 }
    )
  }

  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for plan "${plan}". Set STRIPE_PRICE_PRO in your environment.` },
      { status: 400 }
    )
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?upgraded=1`,
      cancel_url: `${APP_URL}/pricing?cancelled=1`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan },
      },
    })

    return NextResponse.redirect(session.url!)
  } catch (err) {
    console.error('[stripe/checkout] Error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
