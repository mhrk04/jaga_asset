import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'

// GET /api/assets/[id] — single asset with full custody log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  // Fetch the asset
  const { data: asset, error: assetError } = await supabaseAdmin
    .from('assets')
    .select(
      `
      *,
      employee:employees!assets_assigned_to_fkey (
        id, name, email, status
      )
    `
    )
    .eq('id', id)
    .eq('org_id', org_id)
    .single()

  if (assetError || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  // Fetch full custody event log for this asset
  const { data: custodyEvents, error: custodyError } = await supabaseAdmin
    .from('custody_events')
    .select(
      `
      *,
      from_employee:employees!custody_events_from_employee_id_fkey (
        id, name, email
      ),
      to_employee:employees!custody_events_to_employee_id_fkey (
        id, name, email
      )
    `
    )
    .eq('asset_id', id)
    .eq('org_id', org_id)
    .order('occurred_at', { ascending: true })

  if (custodyError) {
    console.error('[GET /api/assets/[id]] Custody fetch error:', custodyError)
  }

  return NextResponse.json(
    { ...asset, custody_events: custodyEvents ?? [] },
    { status: 200 }
  )
}

// POST /api/assets/[id] — decommission or mark asset as available
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  // Role check
  if (user.email) {
    const { errorResponse } = await requireWriteAccess(user.email)
    if (errorResponse) return errorResponse
  }

  const { action } = await request.json()

  if (!action || !['decommission', 'mark-available'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Verify asset belongs to org
  const { data: asset, error: fetchError } = await supabaseAdmin
    .from('assets')
    .select('id, status, assigned_to')
    .eq('id', id)
    .eq('org_id', org_id)
    .single()

  if (fetchError || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  if (action === 'decommission') {
    if (asset.status === 'Decommissioned') {
      return NextResponse.json({ error: 'Asset is already decommissioned' }, { status: 422 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('assets')
      .update({ status: 'Decommissioned', assigned_to: null })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record custody event
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-event`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          asset_id: id,
          event_type: 'Decommissioned',
          from_employee_id: asset.assigned_to ?? null,
          to_employee_id: null,
        }),
      }
    )
  }

  if (action === 'mark-available') {
    if (asset.status === 'Available') {
      return NextResponse.json({ error: 'Asset is already available' }, { status: 422 })
    }
    if (asset.status === 'Decommissioned') {
      return NextResponse.json({ error: 'Cannot mark a decommissioned asset as available' }, { status: 422 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('assets')
      .update({ status: 'Available', assigned_to: null })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record custody event
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-event`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          asset_id: id,
          event_type: 'Transferred',
          from_employee_id: asset.assigned_to ?? null,
          to_employee_id: null,
        }),
      }
    )
  }

  // Return updated asset
  const { data: updated } = await supabaseAdmin
    .from('assets')
    .select('*, employee:employees!assets_assigned_to_fkey (id, name, email, status)')
    .eq('id', id)
    .single()

  return NextResponse.json(updated, { status: 200 })
}
