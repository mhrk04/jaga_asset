import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'
import { checkAssetLimit } from '@/lib/plan'
import type { AssetCategory, AssetStatus, ExtractedAsset } from '@/types'

// GET /api/assets — list all assets for the user's org
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

  const org_id = await resolveOrgId(user.email!)
  if (!org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  return fetchAssets(request, org_id)
}

async function fetchAssets(request: NextRequest, org_id: string) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as AssetStatus | null
  const category = searchParams.get('category') as AssetCategory | null
  const search = searchParams.get('search')

  let query = supabaseAdmin
    .from('assets')
    .select(
      `
      *,
      employee:employees!assets_assigned_to_fkey (
        id, name, email, status
      )
    `
    )
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (search) {
    query = query.or(
      `item_name.ilike.%${search}%,merchant.ilike.%${search}%,serial_number.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/assets] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 200 })
}

// POST /api/assets — register a new asset
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
      org_id: bodyOrgId,
      invoice_image_url,
      assigned_to,
      ...extracted
    }: ExtractedAsset & {
      org_id?: string
      invoice_image_url?: string
      assigned_to?: string
    } = body

    // Resolve org_id — prefer body value, else resolve from session
    let org_id = bodyOrgId
    if (!org_id || org_id === '__resolve_from_session__') {
      org_id = (await resolveOrgId(user.email!)) ?? undefined
    }
    // Auto-create org if none found
    if (!org_id) {
      const domain = user.email!.split('@')[1]
      const { data: newOrg, error: orgErr } = await supabaseAdmin
        .from('organisations')
        .insert({ name: domain, domain })
        .select()
        .single()
      if (orgErr) {
        return NextResponse.json({ error: 'Failed to create organisation' }, { status: 500 })
      }
      org_id = newOrg.id
    }

    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Role check — only owner/manager can create assets
    if (user.email) {
      const { errorResponse } = await requireWriteAccess(user.email)
      if (errorResponse) return errorResponse
    }

    // Freemium limit check
    const limitCheck = await checkAssetLimit(org_id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Asset limit reached. Your ${limitCheck.plan} plan allows ${limitCheck.limit} assets (currently ${limitCheck.current}). Upgrade to Pro for unlimited assets.`,
          upgrade_required: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        },
        { status: 403 }
      )
    }

    // Compute warranty_end_date from purchase_date + warranty_period_months
    let warranty_end_date: string | null = null
    if (extracted.purchase_date && extracted.warranty_period_months) {
      const purchaseDate = new Date(extracted.purchase_date)
      purchaseDate.setMonth(purchaseDate.getMonth() + extracted.warranty_period_months)
      warranty_end_date = purchaseDate.toISOString().split('T')[0]
    }

    const { data: asset, error: insertError } = await supabaseAdmin
      .from('assets')
      .insert({
        org_id,
        merchant: extracted.merchant,
        item_name: extracted.item_name,
        serial_number: extracted.serial_number ?? 'N/A',
        purchase_date: extracted.purchase_date,
        purchase_price: extracted.purchase_price,
        category: extracted.category,
        warranty_end_date,
        status: assigned_to ? 'Assigned' : 'Available',
        assigned_to: assigned_to ?? null,
        invoice_image_url: invoice_image_url ?? null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/assets] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Auto-record 'Registered' custody event
    const custodyRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-event`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          asset_id: asset.id,
          event_type: 'Registered',
          to_employee_id: assigned_to ?? null,
        }),
      }
    )

    const custodyData = await custodyRes.json()

    return NextResponse.json(
      { asset, custody_event: custodyData },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/assets] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
