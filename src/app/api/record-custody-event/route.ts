import { NextRequest, NextResponse } from 'next/server'
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { connection, getFeePayer, getFeePayerBalance, MIN_SOL, LOW_SOL_THRESHOLD } from '@/lib/solana'
import { generateEventHash } from '@/lib/utils'
import type { CustodyEventType } from '@/types'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Simple in-memory guard to avoid spamming low-SOL emails (resets on cold start)
let lastLowSolWarningAt: number = 0
const LOW_SOL_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

async function sendLowSolEmail(balance: number) {
  if (!resend) return
  const now = Date.now()
  if (now - lastLowSolWarningAt < LOW_SOL_COOLDOWN_MS) return
  lastLowSolWarningAt = now

  try {
    await resend.emails.send({
      from: 'JagaAsset <noreply@jaga-asset.mhaziqrk.uk>',
      to: 'haziqrohaizan@gmail.com',
      subject: `⚠️ JagaAsset: Solana wallet low — ${balance.toFixed(4)} SOL remaining`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Solana Wallet Low</h2>
          <p>Your JagaAsset fee payer wallet is running low on SOL.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #dc2626; margin: 0;">${balance.toFixed(4)} SOL</p>
            <p style="color: #991b1b; font-size: 12px; margin: 4px 0 0 0;">Remaining balance</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            On-chain custody event recording may fail if the balance drops below ${MIN_SOL} SOL.
            Please airdrop more SOL at <a href="https://faucet.solana.com" style="color: #059669;">faucet.solana.com</a>.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Fee payer: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">6rZvLVfbk8G5FaDCEnHxsB2CnCiVGVHqwy98ZDJayWmn</code>
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[record-custody-event] Failed to send low-SOL email:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      org_id,
      asset_id,
      event_type,
      from_employee_id,
      to_employee_id,
    }: {
      org_id: string
      asset_id: string
      event_type: CustodyEventType
      from_employee_id?: string
      to_employee_id?: string
    } = body

    if (!org_id || !asset_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, asset_id, event_type' },
        { status: 400 }
      )
    }

    const validEventTypes: CustodyEventType[] = [
      'Registered',
      'Assigned',
      'Transferred',
      'Decommissioned',
    ]
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json({ error: `Invalid event_type: ${event_type}` }, { status: 400 })
    }

    // Check SOL balance before proceeding
    const balance = await getFeePayerBalance()

    if (balance === null) {
      // Can't reach Solana — block registration
      return NextResponse.json(
        { error: 'Unable to verify Solana wallet balance. Network may be down. Please try again later.' },
        { status: 503 }
      )
    }

    if (balance < MIN_SOL) {
      // Not enough SOL — block registration
      return NextResponse.json(
        {
          error: `Insufficient SOL balance (${balance.toFixed(4)} SOL). Minimum required: ${MIN_SOL} SOL. Please airdrop SOL at https://faucet.solana.com`,
          balance,
          min_required: MIN_SOL,
        },
        { status: 503 }
      )
    }

    // Low balance warning — send email but still proceed
    if (balance < LOW_SOL_THRESHOLD) {
      sendLowSolEmail(balance)
    }

    const timestamp = new Date().toISOString()

    // Compute SHA-256 event hash
    const event_hash = generateEventHash(
      asset_id,
      event_type,
      timestamp,
      from_employee_id,
      to_employee_id
    )

    // Write hash to Solana Devnet via Memo Program
    let solana_signature: string | null = null
    try {
      const feePayer = getFeePayer()
      const memoData = JSON.stringify({
        app: 'jagaasset',
        asset_id,
        event_type,
        hash: event_hash,
        ts: timestamp,
      })

      const instruction = new TransactionInstruction({
        keys: [{ pubkey: feePayer.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      })

      const transaction = new Transaction().add(instruction)
      solana_signature = await sendAndConfirmTransaction(connection, transaction, [feePayer], {
        commitment: 'confirmed',
      })
    } catch (solanaErr) {
      console.warn('[record-custody-event] Solana write failed (non-fatal):', solanaErr)
    }

    // Insert custody event into Supabase
    const { data, error } = await supabaseAdmin
      .from('custody_events')
      .insert({
        org_id,
        asset_id,
        event_type,
        from_employee_id: from_employee_id ?? null,
        to_employee_id: to_employee_id ?? null,
        event_hash,
        solana_signature,
        occurred_at: timestamp,
      })
      .select()
      .single()

    if (error) {
      console.error('[record-custody-event] DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { event_hash, solana_signature, event: data, balance },
      { status: 201 }
    )
  } catch (err) {
    console.error('[record-custody-event] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
