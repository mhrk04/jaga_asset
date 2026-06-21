import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireVerifiedEmail } from '@/lib/org'

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { api_key, parent_page_id } = body

    if (!api_key) {
      return NextResponse.json({ error: 'Notion API key is required' }, { status: 400 })
    }

    const org_id = await resolveOrgId(user.email!)
    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Validate API key by listing users
    const userResponse = await fetch('https://api.notion.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!userResponse.ok) {
      const notionErr = await userResponse.json()
      return NextResponse.json({ error: notionErr.message ?? 'Invalid Notion API key' }, { status: 400 })
    }

    const userData = await userResponse.json()
    const workspaceName = userData.results?.[0]?.object ?? 'Notion Workspace'

    // Extract page ID from URL if a full URL was provided
    let resolvedParentPageId = parent_page_id || ''
    if (resolvedParentPageId.includes('notion.so/')) {
      const parts = resolvedParentPageId.split('notion.so/')[1]?.split('?')[0]?.split('#')[0] ?? ''
      const idParts = parts.split('-')
      resolvedParentPageId = idParts[idParts.length - 1] ?? parts
    }

    // Save configuration
    const { error: insertError } = await supabaseAdmin
      .from('notion_configs')
      .upsert({
        org_id,
        workspace_id: '',
        database_id: '',
        parent_page_id: resolvedParentPageId,
        api_key,
      })

    if (insertError) {
      console.error('[notion/connect] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save Notion configuration' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Notion workspace connected successfully',
      workspace_name: workspaceName,
      workspace_id: userData.results?.[0]?.id ?? '',
    })
  } catch (err) {
    console.error('[POST /api/org/notion/connect] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}