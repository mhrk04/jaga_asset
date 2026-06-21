import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireVerifiedEmail } from '@/lib/org'

export async function DELETE(request: NextRequest) {
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

  try {
    const org_id = await resolveOrgId(user.email!)
    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('notion_configs')
      .delete()
      .eq('org_id', org_id)

    if (deleteError) {
      console.error('[notion/disconnect] delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect Notion' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notion disconnected successfully' })
  } catch (err) {
    console.error('[DELETE /api/org/notion/disconnect] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}