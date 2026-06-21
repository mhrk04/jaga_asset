import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'

// POST /api/assign-asset — assign an asset to an employee
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
    const { asset_id, employee_id }: { asset_id: string; employee_id: string } = body

    if (!asset_id || !employee_id) {
      return NextResponse.json(
        { error: 'asset_id and employee_id are required' },
        { status: 400 }
      )
    }

    const org_id = await resolveOrgId(user.email!)
    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Role check — only owner/manager can assign assets
    if (user.email) {
      const { errorResponse } = await requireWriteAccess(user.email)
      if (errorResponse) return errorResponse
    }

    // Fetch current asset state to record the "from" employee
    const { data: currentAsset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, assigned_to, status, org_id')
      .eq('id', asset_id)
      .eq('org_id', org_id)
      .single()

    if (fetchError || !currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Verify employee belongs to same org
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, org_id, status')
      .eq('id', employee_id)
      .eq('org_id', org_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    if (employee.status === 'Offboarded') {
      return NextResponse.json(
        { error: 'Cannot assign assets to an offboarded employee' },
        { status: 422 }
      )
    }

    // Update asset
    const { data: updatedAsset, error: updateError } = await supabaseAdmin
      .from('assets')
      .update({
        assigned_to: employee_id,
        status: 'Assigned',
      })
      .eq('id', asset_id)
      .select(
        `
        *,
        employee:employees!assets_assigned_to_fkey (
          id, name, email, status
        )
      `
      )
      .single()

    if (updateError) {
      console.error('[POST /api/assign-asset] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record custody event
    const eventType = currentAsset.assigned_to ? 'Transferred' : 'Assigned'
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/record-custody-event`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          asset_id,
          event_type: eventType,
          from_employee_id: currentAsset.assigned_to ?? null,
          to_employee_id: employee_id,
        }),
      }
    )

    return NextResponse.json(updatedAsset, { status: 200 })
  } catch (err) {
    console.error('[POST /api/assign-asset] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
