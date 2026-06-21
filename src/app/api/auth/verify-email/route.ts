import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isConsumerDomain } from '@/lib/consumer-domains'

export async function POST(request: NextRequest) {
  const { email, token } = await request.json()

  if (!email || !token) {
    return NextResponse.json({ error: 'Email and token required' }, { status: 400 })
  }

  // Look up user by email via RPC
  const { data: userId, error: lookupError } = await supabaseAdmin
    .rpc('get_user_id_by_email', { user_email: email })

  if (lookupError || !userId) {
    return NextResponse.json({ error: 'Invalid verification link' }, { status: 404 })
  }

  // Get user to check metadata
  const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (getUserError || !userData?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const meta = userData.user.user_metadata ?? {}

  // Already verified
  if (meta.email_verified === true) {
    return NextResponse.json({ message: 'Email already verified' })
  }

  // Check token
  if (meta.verification_token !== token) {
    return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 })
  }

  // Mark as verified
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      email_verified: true,
      verification_token: null,
      verified_at: new Date().toISOString(),
    },
  })

  if (updateError) {
    console.error('[verify-email] update error:', updateError)
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 })
  }

  const domain = email.split('@')[1]?.toLowerCase()
  const orgName = (meta.org_name as string) || email.split('@')[0]

  // Create org and membership now that email is verified
  if (domain) {
    const isConsumer = isConsumerDomain(email)
    let orgId: string | null = null
    let isNewOrg = false

    if (isConsumer) {
      // Consumer-domain users each get their own org.
      // Use email as domain to satisfy the UNIQUE constraint.
      const { data: newOrg, error: insertOrgError } = await supabaseAdmin
        .from('organisations')
        .insert({
          domain: email.toLowerCase(),
          name: orgName,
          owner_email: email,
          plan: 'free',
        })
        .select('id')
        .single()

      if (insertOrgError) {
        console.error('[verify-email] consumer org insert error:', insertOrgError)
        return NextResponse.json({
          error: 'Email verified but organisation could not be created. Please contact support.',
        }, { status: 500 })
      }

      orgId = newOrg.id
      isNewOrg = true
    } else {
      const { data: existing } = await supabaseAdmin
        .from('organisations')
        .select('id')
        .eq('domain', domain)
        .maybeSingle()

      if (!existing) {
        const { data: newOrg, error: insertOrgError } = await supabaseAdmin
          .from('organisations')
          .insert({
            domain,
            name: orgName,
            owner_email: email,
            plan: 'free',
          })
          .select('id')
          .single()

        if (insertOrgError) {
          console.error('[verify-email] business org insert error:', insertOrgError)
          return NextResponse.json({
            error: 'Email verified but organisation could not be created. Please contact support.',
          }, { status: 500 })
        }

        orgId = newOrg.id
        isNewOrg = true
      } else {
        orgId = existing.id
      }
    }

    // Add user as owner (new org) or member (joining existing company org)
    const { error: memberError } = await supabaseAdmin
      .from('org_members')
      .insert({
        org_id: orgId,
        user_id: userId,
        email,
        role: isNewOrg ? 'owner' : 'member',
      })

    if (memberError) {
      console.error('[verify-email] member insert error:', memberError)
      return NextResponse.json({
        error: 'Email verified but account setup failed. Please contact support.',
      }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Email verified successfully' })
}
