import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, getOrgMembership, requireVerifiedEmail } from '@/lib/org'

// GET /api/org/members — list org members (only owner/manager)
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

  const { data: members } = await supabaseAdmin
    .from('org_members')
    .select('id, email, role, created_at')
    .eq('org_id', org_id)
    .order('created_at', { ascending: true })

  return NextResponse.json(members ?? [])
}

// PUT /api/org/members — update a member's role (owner only)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, role } = await request.json()

  if (!email || !role || !['manager', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'email and role (manager|member) required' },
      { status: 400 }
    )
  }

  if (email === user.email) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    )
  }

  // Only the org owner can change roles
  const callerMembership = await getOrgMembership(user.email!)
  if (!callerMembership || callerMembership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the org owner can manage member roles' },
      { status: 403 }
    )
  }

  const { error: updateError } = await supabaseAdmin
    .from('org_members')
    .update({ role })
    .eq('org_id', callerMembership.org_id)
    .eq('email', email)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Role updated' })
}
