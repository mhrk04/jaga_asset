import { NextRequest, NextResponse } from 'next/server'
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess, requireVerifiedEmail } from '@/lib/org'
import { connection, getFeePayer, getFeePayerBalance, MIN_SOL, LOW_SOL_THRESHOLD } from '@/lib/solana'
import { generateEventHash } from '@/lib/utils'
import { Resend } from 'resend'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

// Lazy — created at request time so RESEND_API_KEY is available
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// POST /api/offboard-employee
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
    const { employee_id }: { employee_id: string } = body

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
    }

    const org_id = await resolveOrgId(user.email!)
    if (!org_id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Role check — only owner/manager can offboard employees
    if (user.email) {
      const { errorResponse } = await requireWriteAccess(user.email)
      if (errorResponse) return errorResponse
    }

    // Fetch employee
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .eq('org_id', org_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.status === 'Offboarded') {
      return NextResponse.json(
        { error: 'Employee is already offboarded' },
        { status: 422 }
      )
    }

    // Fetch all assets currently assigned to this employee
    const { data: assignedAssets } = await supabaseAdmin
      .from('assets')
      .select('id, item_name, category')
      .eq('assigned_to', employee_id)
      .eq('org_id', org_id)
      .eq('status', 'Assigned')

    const assetsToReturn = assignedAssets ?? []

    // Return all assets (set status = Available, assigned_to = null)
    if (assetsToReturn.length > 0) {
      const assetIds = assetsToReturn.map((a) => a.id)

      await supabaseAdmin
        .from('assets')
        .update({ status: 'Available', assigned_to: null })
        .in('id', assetIds)

      // Record a 'Transferred' custody event for each returned asset
      await Promise.all(
        assetIds.map((assetId) =>
          fetch(`${APP_URL}/api/record-custody-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id,
              asset_id: assetId,
              event_type: 'Transferred',
              from_employee_id: employee_id,
              to_employee_id: null,
            }),
          })
        )
      )
    }

    // Mark employee as Offboarded
    const offboardingDate = new Date().toISOString()
    await supabaseAdmin
      .from('employees')
      .update({ status: 'Offboarded', offboarding_date: offboardingDate })
      .eq('id', employee_id)

    // Notion workspace deprovisioning (best-effort — non-fatal)
    let notion_user_id: string | null = null
    let notion_error: string | null = null
    let notion_event_hash: string | null = null
    let notion_solana_signature: string | null = null

    const { data: notionConfig } = await supabaseAdmin
      .from('notion_configs')
      .select('api_key')
      .eq('org_id', org_id)
      .single()

    if (notionConfig?.api_key && employee.email) {
      try {
        const userResponse = await fetch('https://api.notion.com/v1/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${notionConfig.api_key}`,
            'Notion-Version': '2022-06-28',
          },
        })

        if (!userResponse.ok) {
          const err = await userResponse.json()
          notion_error = err.message ?? 'Failed to list Notion users'
        } else {
          const userData = await userResponse.json()
          const notionUser = userData.results?.find(
            (u: any) => u.type === 'person' && u.person?.email?.toLowerCase() === employee.email.toLowerCase()
          )

          if (!notionUser) {
            notion_error = 'User not found in Notion workspace'
          } else {
            notion_user_id = notionUser.id

            const renameResponse = await fetch(`https://api.notion.com/v1/users/${notionUser.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${notionConfig.api_key}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: `[Offboarded] ${notionUser.name || employee.name}`,
              }),
            })

            if (!renameResponse.ok) {
              const err = await renameResponse.json()
              notion_error = err.message ?? 'Failed to rename user'
            }
          }
        }
      } catch (e) {
        notion_error = String(e)
        console.warn('[offboard-employee] Notion integration failed:', e)
      }

      // Generate event hash for on-chain recording
      notion_event_hash = generateEventHash(
        employee.id,
        notion_error ? 'ProvisionFailed' : 'Deprovisioned',
        new Date().toISOString()
      )

      // Write Notion deprovisioning event to Solana via Memo Program
      try {
        const balance = await getFeePayerBalance()
        if (balance !== null && balance >= MIN_SOL) {
          const feePayer = getFeePayer()
          const memoData = JSON.stringify({
            app: 'jagaasset',
            service: 'notion',
            employee_id: employee.id,
            action: notion_error ? 'ProvisionFailed' : 'Deprovisioned',
            hash: notion_event_hash,
            ts: new Date().toISOString(),
          })

          const instruction = new TransactionInstruction({
            keys: [{ pubkey: feePayer.publicKey, isSigner: true, isWritable: false }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memoData, 'utf-8'),
          })

          const transaction = new Transaction().add(instruction)
          notion_solana_signature = await sendAndConfirmTransaction(connection, transaction, [feePayer], {
            commitment: 'confirmed',
          })
        }
      } catch (solanaErr) {
        console.warn('[offboard-employee] Solana write for Notion event failed (non-fatal):', solanaErr)
      }

      // Record SaaS event with on-chain proof
      await supabaseAdmin.from('saas_events').insert({
        org_id,
        employee_id,
        action: notion_error ? 'ProvisionFailed' : 'Deprovisioned',
        service: 'Notion',
        details: notion_error
          ? { error: notion_error, event_hash: notion_event_hash, solana_signature: notion_solana_signature }
          : { notion_user_id: notion_user_id ?? 'Unknown', event_hash: notion_event_hash, solana_signature: notion_solana_signature },
        event_hash: notion_event_hash,
        solana_signature: notion_solana_signature,
      })
    }

    // Send offboarding confirmation email via Resend (best-effort)
    let email_sent = false
    try {
      const assetListHtml = assetsToReturn.length
        ? `<ul>${assetsToReturn.map((a) => `<li>${a.item_name} (${a.category})</li>`).join('')}</ul>`
        : '<p>No assets were assigned.</p>'

      await getResend().emails.send({
        from: 'JagaAsset <noreply@jaga-asset.mhaziqrk.uk>',
        to: [employee.email],
        subject: `Offboarding Confirmation — ${employee.name}`,
        html: `
          <h2>Offboarding Complete</h2>
          <p>Hi ${employee.name},</p>
          <p>Your offboarding has been processed by JagaAsset on ${new Date(offboardingDate).toLocaleDateString('en-MY', { dateStyle: 'long' })}.</p>
          <h3>Assets Returned (${assetsToReturn.length})</h3>
          ${assetListHtml}
          <h3>Notion</h3>
          <p>${notion_user_id ? 'Access revoked (user flagged as offboarded).' : notion_error ? `Failed (${notion_error})` : 'Not configured'}</p>
          <p>All custody transfers and SaaS deprovisioning events have been recorded on-chain via Solana.</p>
          <p>— JagaAsset</p>
        `,
      })
      email_sent = true
    } catch (emailErr) {
      console.warn('[offboard-employee] Email send failed:', emailErr)
    }

    return NextResponse.json(
      {
        assets_returned: assetsToReturn.length,
        returned_assets: assetsToReturn,
        email_sent,
        offboarding_date: offboardingDate,
        notion_user_id,
        notion_error,
        notion_event_hash,
        notion_solana_signature,
        onchain_recorded: !!notion_solana_signature,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[POST /api/offboard-employee] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
