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
import { generateBatchEventHash } from '@/lib/utils'
import type { CustodyEventType } from '@/types'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

let lastLowSolWarningAt = 0
const LOW_SOL_COOLDOWN_MS = 60 * 60 * 1000

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
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2 style="color:#dc2626;">Solana Wallet Low</h2><p>Your JagaAsset fee payer wallet is running low on SOL.</p><p style="font-size:32px;font-weight:bold;color:#dc2626;">${balance.toFixed(4)} SOL</p><p>Please top up at <a href="https://faucet.solana.com">faucet.solana.com</a>.</p></div>`,
    })
  } catch (err) {
    console.error('[record-custody-batch] Failed to send low-SOL email:', err)
  }
}

function isRetryableRpcError(error: unknown) {
  return error instanceof Error && /429|Too many requests|rate limit|UNAVAILABLE/i.test(error.message)
}

async function sendMemoWithRetry(memoData: string) {
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const feePayer = getFeePayer()
      const instruction = new TransactionInstruction({
        keys: [{ pubkey: feePayer.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      })
      const transaction = new Transaction().add(instruction)
      return await sendAndConfirmTransaction(connection, transaction, [feePayer], {
        commitment: 'confirmed',
      })
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableRpcError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    }
  }
  throw new Error('Failed to send Solana memo')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, asset_ids, event_type }: { org_id: string; asset_ids: string[]; event_type: CustodyEventType } = body

    if (!org_id || !Array.isArray(asset_ids) || asset_ids.length === 0 || !event_type) {
      return NextResponse.json({ error: 'Missing required fields: org_id, asset_ids, event_type' }, { status: 400 })
    }

    const timestamp = new Date().toISOString()
    const event_hash = generateBatchEventHash(asset_ids, event_type, timestamp)

    const balance = await getFeePayerBalance()
    if (balance === null) {
      return NextResponse.json({ error: 'Unable to verify Solana wallet balance. Please try again later.' }, { status: 503 })
    }
    if (balance < MIN_SOL) {
      return NextResponse.json({ error: `Insufficient SOL balance (${balance.toFixed(4)} SOL). Please top up the fee payer wallet.` }, { status: 503 })
    }
    if (balance < LOW_SOL_THRESHOLD) sendLowSolEmail(balance)

    let solana_signature: string | null = null
    try {
      const memoData = JSON.stringify({ app: 'jagaasset', org_id, asset_ids, event_type, hash: event_hash, ts: timestamp })
      solana_signature = await sendMemoWithRetry(memoData)
    } catch (solanaErr) {
      console.warn('[record-custody-batch] Solana write failed (non-fatal):', solanaErr)
    }

    const events = []
    for (const asset_id of asset_ids) {
      const { data, error } = await supabaseAdmin
        .from('custody_events')
        .insert({
          org_id,
          asset_id,
          event_type,
          from_employee_id: null,
          to_employee_id: null,
          event_hash,
          solana_signature,
          occurred_at: timestamp,
        })
        .select()
        .single()

      if (error) {
        console.error('[record-custody-batch] DB insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      events.push(data)
    }

    return NextResponse.json({ event_hash, solana_signature, events, balance }, { status: 201 })
  } catch (err) {
    console.error('[record-custody-batch] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
