import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'
import { checkAssetLimit } from '@/lib/plan'
import type { AssetCategory } from '@/types'

interface ScanItem {
  item_name: string
  serial_number?: string
  purchase_price: number
  category: string
  warranty_period_months?: number
  quantity?: number
}

const VALID_CATEGORIES: AssetCategory[] = ['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera']

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
  const { merchant, purchase_date, items }: { merchant: string; purchase_date: string; items: ScanItem[] } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  // Expand items by quantity
  const expanded: { item_name: string; merchant: string; serial_number: string; purchase_date: string; purchase_price: number; category: AssetCategory; warranty_end_date: string | null }[] = []

  for (const item of items) {
    if (!item.item_name?.trim() || !item.category) continue
    if (!VALID_CATEGORIES.includes(item.category as AssetCategory)) continue

    const qty = Math.max(1, item.quantity || 1)
    const serial = item.serial_number?.trim() || 'N/A'

    let warranty_end_date: string | null = null
    const months = item.warranty_period_months || 0
    if (purchase_date && months > 0) {
      const d = new Date(purchase_date)
      d.setMonth(d.getMonth() + months)
      warranty_end_date = d.toISOString().split('T')[0]
    }

    for (let q = 0; q < qty; q++) {
      expanded.push({
        item_name: item.item_name.trim(),
        merchant: merchant?.trim() || 'Unknown',
        serial_number: qty > 1 ? `${serial}-${q + 1}` : serial,
        purchase_date: purchase_date || '',
        purchase_price: item.purchase_price || 0,
        category: item.category as AssetCategory,
        warranty_end_date,
      })
    }
  }

  if (expanded.length === 0) {
    return NextResponse.json({ error: 'No valid items to import' }, { status: 400 })
  }

  if (expanded.length > 50) {
    return NextResponse.json(
      { error: 'Invoice scans with more than 50 assets are temporarily limited to prevent Solana RPC throttling. Please split the invoice into smaller batches or register manually.' },
      { status: 429 }
    )
  }

  // Check free tier limit
  const limitCheck = await checkAssetLimit(org_id)
  if (!limitCheck.allowed && limitCheck.plan === 'free') {
    const remaining = limitCheck.limit - limitCheck.current
    if (remaining <= 0) {
      return NextResponse.json({ error: `Asset limit reached. Free plan allows ${limitCheck.limit}. Upgrade to Pro.` }, { status: 403 })
    }
    if (expanded.length > remaining) {
      return NextResponse.json({ error: `Free plan allows ${remaining} more. You tried to add ${expanded.length}. Upgrade to Pro.` }, { status: 403 })
    }
  }

  let success = 0
  const ids: string[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < expanded.length; i++) {
    const a = expanded[i]
    const { data: asset, error: insertError } = await supabaseAdmin
      .from('assets')
      .insert({
        org_id,
        merchant: a.merchant,
        item_name: a.item_name,
        serial_number: a.serial_number,
        purchase_date: a.purchase_date || null,
        purchase_price: a.purchase_price,
        category: a.category,
        warranty_end_date: a.warranty_end_date,
        status: 'Available',
      })
      .select('id')
      .single()

    if (insertError) {
      errors.push({ row: i + 1, message: insertError.message })
    } else {
      success++
      ids.push(asset.id)

    }
  }

  if (ids.length > 0) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id,
        asset_ids: ids,
        event_type: 'Registered',
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ total: expanded.length, success, failed: errors.length, errors, ids })
}
