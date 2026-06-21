import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireVerifiedEmail } from '@/lib/org'

export async function GET(request: NextRequest) {
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

    const { data: config, error } = await supabaseAdmin
      .from('notion_configs')
      .select('workspace_id, database_id, parent_page_id, api_key')
      .eq('org_id', org_id)
      .single()

    if (error || !config) {
      return NextResponse.json({ error: 'Notion not configured' }, { status: 404 })
    }

    // Fetch workspace info to validate key still works
    let workspace_name = 'Connected'
    let user_count = 0
    try {
      const userResponse = await fetch('https://api.notion.com/v1/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Notion-Version': '2022-06-28',
        },
      })
      if (userResponse.ok) {
        const data = await userResponse.json()
        workspace_name = data.results?.[0]?.object ?? 'Notion Workspace'
        user_count = data.results?.length ?? 0
      }
    } catch {
      // API key might be invalid — return config as-is
    }

    return NextResponse.json({
      connected: true,
      workspace_name,
      user_count,
      parent_page_id: config.parent_page_id || null,
    })
  } catch (err) {
    console.error('[GET /api/org/notion/config] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}