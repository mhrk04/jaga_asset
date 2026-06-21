import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'
import { checkAssetLimit } from '@/lib/plan'
import type { AssetCategory } from '@/types'

const VALID_CATEGORIES: AssetCategory[] = ['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera']

interface CsvAsset {
  item_name: string
  merchant: string
  serial_number?: string
  purchase_date?: string
  purchase_price?: string
  category: string
  warranty_period_months?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const verifiedError = requireVerifiedEmail(user)
  if (verifiedError) return verifiedError

  const { errorResponse } = await requireWriteAccess(user.email)
  if (errorResponse) return errorResponse

  const org_id = await resolveOrgId(user.email)
  if (!org_id) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }

  const body = await request.json()
  const assets: CsvAsset[] = body.assets
  if (!Array.isArray(assets) || assets.length === 0) {
    return NextResponse.json({ error: 'No assets provided' }, { status: 400 })
  }

  if (assets.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 assets per import' }, { status: 400 })
  }

  if (assets.length > 50) {
    return NextResponse.json(
      { error: 'CSV imports over 50 rows are temporarily limited to prevent Solana RPC throttling. Please split the file into smaller batches.' },
      { status: 429 }
    )
  }

  // Check free tier limit
  const limitCheck = await checkAssetLimit(org_id)
  if (!limitCheck.allowed && limitCheck.plan === 'free') {
    const remaining = limitCheck.limit - limitCheck.current
    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Asset limit reached. Your free plan allows ${limitCheck.limit} assets. Upgrade to Pro for unlimited.` },
        { status: 403 }
      )
    }
    // Truncate to what's allowed
    if (assets.length > remaining) {
      return NextResponse.json(
        { error: `Free plan allows ${remaining} more asset(s). You tried to import ${assets.length}. Upgrade to Pro for unlimited.` },
        { status: 403 }
      )
    }
  }

  let success = 0
  let failed = 0
  const errors: { row: number; message: string }[] = []
  const inserted: { id: string }[] = []

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]

    if (!a.item_name?.trim() || !a.merchant?.trim() || !a.category) {
      errors.push({ row: i + 2, message: 'Missing required fields (item_name, merchant, category)' })
      failed++
      continue
    }

    if (!VALID_CATEGORIES.includes(a.category as AssetCategory)) {
      errors.push({ row: i + 2, message: `Invalid category: "${a.category}"` })
      failed++
      continue
    }

    let warranty_end_date: string | null = null
    const months = a.warranty_period_months ? parseInt(a.warranty_period_months) : 0
    if (a.purchase_date && months > 0) {
      const d = new Date(a.purchase_date)
      d.setMonth(d.getMonth() + months)
      warranty_end_date = d.toISOString().split('T')[0]
    }

    const price = a.purchase_price ? parseFloat(a.purchase_price) : 0

    const { data: asset, error: insertError } = await supabaseAdmin
      .from('assets')
      .insert({
        org_id,
        item_name: a.item_name.trim(),
        merchant: a.merchant.trim(),
        serial_number: a.serial_number?.trim() || 'N/A',
        purchase_date: a.purchase_date || null,
        purchase_price: isNaN(price) ? 0 : price,
        category: a.category,
        warranty_end_date,
        status: 'Available',
      })
      .select('id')
      .single()

    if (insertError) {
      errors.push({ row: i + 2, message: insertError.message })
      failed++
    } else {
      success++
      inserted.push(asset)
    }
  }

  // Record one batch custody event instead of one Solana tx per asset.
  if (inserted.length > 0) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id,
        asset_ids: inserted.map((asset) => asset.id),
        event_type: 'Registered',
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ total: assets.length, success, failed, errors })
}
