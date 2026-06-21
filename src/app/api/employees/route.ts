import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'
import { checkEmployeeLimit } from '@/lib/plan'

const NOTION_VERSION = '2022-06-28'

// GET /api/employees — list all employees for the user's org
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org_id = await resolveOrgId(user.email!)
  if (!org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  // Fetch employees with a count of their currently assigned assets
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(
      `
      *,
      asset_count:assets(count)
    `
    )
    .eq('org_id', org_id)
    .eq('assets.status', 'Assigned')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/employees] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten the count from the nested array Supabase returns
  const employees = data.map((emp) => ({
    ...emp,
    asset_count: Array.isArray(emp.asset_count)
      ? (emp.asset_count[0] as { count: number })?.count ?? 0
      : 0,
  }))

  return NextResponse.json(employees, { status: 200 })
}

// POST /api/employees — create a new employee
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
    const {
      name,
      email,
      org_id: bodyOrgId,
    }: {
      name: string
      email: string
      org_id?: string
    } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const org_id = bodyOrgId ?? (await resolveOrgId(user.email!))
    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Role check — only owner/manager can create employees
    if (user.email) {
      const { errorResponse } = await requireWriteAccess(user.email)
      if (errorResponse) return errorResponse
    }

    // Freemium limit check
    const limitCheck = await checkEmployeeLimit(org_id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Employee limit reached. Your ${limitCheck.plan} plan allows ${limitCheck.limit} active employees (currently ${limitCheck.current}). Upgrade to Pro for unlimited employees.`,
          upgrade_required: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        },
        { status: 403 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        org_id,
        name,
        email,
        status: 'Active',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An employee with this email already exists in your organisation' },
          { status: 409 }
        )
      }
      console.error('[POST /api/employees] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create a Notion page for the new employee (best-effort — non-fatal)
    let notion_page_id: string | null = null
    let notion_error: string | null = null

    const { data: notionConfig } = await supabaseAdmin
      .from('notion_configs')
      .select('api_key, parent_page_id')
      .eq('org_id', org_id)
      .single()

    if (notionConfig?.api_key && notionConfig.parent_page_id && name && email) {
      try {
        const pageResponse = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionConfig.api_key}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { type: 'page_id', page_id: notionConfig.parent_page_id },
            properties: {
              title: {
                title: [{ text: { content: name } }],
              },
            },
            children: [
              {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                  rich_text: [{ type: 'text', text: { content: name } }],
                },
              },
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: `Email: ${email}` } }],
                },
              },
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: `Role: Employee · JagaAsset` } }],
                },
              },
            ],
          }),
        })

        if (pageResponse.ok) {
          const pageData = await pageResponse.json()
          notion_page_id = pageData.id
        } else {
          const err = await pageResponse.json()
          notion_error = err.message ?? 'Failed to create Notion page'
          console.warn('[POST /api/employees] Notion page creation failed:', notion_error)
        }
      } catch (e) {
        notion_error = String(e)
        console.warn('[POST /api/employees] Notion integration failed:', e)
      }
    }

    return NextResponse.json(
      {
        ...data,
        notion_page_id,
        notion_error,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/employees] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


