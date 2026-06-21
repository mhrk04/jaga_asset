import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Stripe requires the raw body to verify webhook signatures
export const runtime = 'nodejs'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    console.error('[webhook] Missing signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Payment succeeded → upgrade org to Pro ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const userEmail = session.customer_email

        if (!userEmail) break

        // Fetch the subscription to get trial end and current period end
        let trialEnd: string | null = null
        let periodEnd: string | null = null
        try {
          const stripe = getStripe()
          const sub: Record<string, unknown> = await stripe.subscriptions.retrieve(subscriptionId as string) as unknown as Record<string, unknown>
          trialEnd = sub.trial_end ? new Date((sub.trial_end as number) * 1000).toISOString() : null
          periodEnd = new Date((sub.current_period_end as number) * 1000).toISOString()
        } catch { /* non-fatal */ }

        await supabaseAdmin
          .from('organisations')
          .update({
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            plan_expires_at: null,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
          })
          .eq('owner_email', userEmail)

        console.log(`[webhook] Upgraded org for ${userEmail} to Pro`)
        break
      }

      // ── Subscription renewed successfully ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subDetails = invoice.parent?.subscription_details
        const subscriptionId = typeof subDetails?.subscription === 'string'
          ? subDetails.subscription
          : subDetails?.subscription?.id

        if (!subscriptionId) break

        let periodEnd: string | null = null
        try {
          const stripe = getStripe()
          const sub: Record<string, unknown> = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Record<string, unknown>
          periodEnd = new Date((sub.current_period_end as number) * 1000).toISOString()
        } catch { /* non-fatal */ }

        await supabaseAdmin
          .from('organisations')
          .update({
            plan: 'pro',
            subscription_status: 'active',
            plan_expires_at: null,
            current_period_end: periodEnd,
          })
          .eq('stripe_subscription_id', subscriptionId)

        break
      }

      // ── Payment failed → mark as past_due but keep access briefly ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subDetails = invoice.parent?.subscription_details
        const subscriptionId = typeof subDetails?.subscription === 'string'
          ? subDetails.subscription
          : subDetails?.subscription?.id

        if (!subscriptionId) break

        await supabaseAdmin
          .from('organisations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)

        console.warn(`[webhook] Payment failed for subscription ${subscriptionId}`)
        break
      }

      // ── Subscription cancelled → downgrade to free ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        // cancel_at is set when scheduled; otherwise use now
        const expiresAt = sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : new Date().toISOString()

        await supabaseAdmin
          .from('organisations')
          .update({
            plan: 'free',
            subscription_status: 'cancelled',
            plan_expires_at: expiresAt,
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', sub.id)

        console.log(`[webhook] Subscription ${sub.id} cancelled — downgraded to free`)
        break
      }

      // ── Subscription updated (e.g. plan change) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const status = sub.status === 'active' ? 'active' : sub.status

        await supabaseAdmin
          .from('organisations')
          .update({ subscription_status: status })
          .eq('stripe_subscription_id', sub.id)

        break
      }

      default:
        // Ignore unhandled events
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
