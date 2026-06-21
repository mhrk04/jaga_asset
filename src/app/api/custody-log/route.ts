import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireVerifiedEmail } from '@/lib/org'
import { generateEventHash } from '@/lib/utils'

// GET /api/custody-log — paginated, filterable custody event log
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

  const { searchParams } = new URL(request.url)
  const asset_id = searchParams.get('asset_id')
  const event_type = searchParams.get('event_type')
  const from_date = searchParams.get('from_date')
  const to_date = searchParams.get('to_date')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  let query = supabaseAdmin
    .from('custody_events')
    .select(
      `
      *,
      asset:assets (
        id, item_name, category, serial_number
      ),
      from_employee:employees!custody_events_from_employee_id_fkey (
        id, name, email
      ),
      to_employee:employees!custody_events_to_employee_id_fkey (
        id, name, email
      )
    `,
      { count: 'exact' }
    )
    .eq('org_id', org_id)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (asset_id) query = query.eq('asset_id', asset_id)
  if (event_type) query = query.eq('event_type', event_type)
  if (from_date) query = query.gte('occurred_at', from_date)
  if (to_date) query = query.lte('occurred_at', to_date + 'T23:59:59Z')

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/custody-log] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Integrity Check: Re-calculate hash for each event and compare with stored hash
  const events = (data ?? []).map((event) => {
    try {
      // Reconstruct timestamp in ISO format as it was originally hashed
      const timestamp = new Date(event.occurred_at).toISOString()
      
      const computedHash = generateEventHash(
        event.asset_id,
        event.event_type,
        timestamp,
        event.from_employee_id ?? undefined,
        event.to_employee_id ?? undefined
      )

      return {
        ...event,
        is_tampered: computedHash !== event.event_hash,
      }
    } catch (err) {
      return { ...event, is_tampered: false }
    }
  })

  return NextResponse.json(
    {
      events,
      total: count ?? 0,
      limit,
      offset,
      has_more: (count ?? 0) > offset + limit,
    },
    { status: 200 }
  )
}
