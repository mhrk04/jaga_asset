import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireWriteAccess, getOrgMembership } from '@/lib/org'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name) {
          cookieStore.delete(name)
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return null
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Block users who signed up but haven't verified email yet
  if (user.user_metadata?.email_verified === false) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }

  const membership = await getOrgMembership(user.email)

  let org = null
  if (membership?.org_id) {
    const { data } = await supabaseAdmin
      .from('organisations')
      .select('id, name, plan, subscription_status')
      .eq('id', membership.org_id)
      .maybeSingle()
    org = data
  }

  return NextResponse.json({
    email: user.email,
    role: membership?.role ?? null,
    org,
  })
}

export async function PUT(request: NextRequest) {
  const user = await getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Block unverified users
  if (user.user_metadata?.email_verified === false) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }

  const { orgName } = await request.json()
  if (!orgName?.trim()) {
    return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 })
  }

  // Role check — only owner/manager can update org settings
  if (user.email) {
    const { errorResponse } = await requireWriteAccess(user.email)
    if (errorResponse) return errorResponse
  }

  const membership = await getOrgMembership(user.email)
  if (!membership?.org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('organisations')
    .update({ name: orgName.trim() })
    .eq('id', membership.org_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Organisation updated' })
}
