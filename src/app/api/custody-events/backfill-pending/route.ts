import { NextResponse } from 'next/server'
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveOrgId, requireWriteAccess } from '@/lib/org'
import { connection, getFeePayer, getFeePayerBalance, MIN_SOL } from '@/lib/solana'
import { generateEventHash } from '@/lib/utils'
import type { CustodyEventType } from '@/types'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

async function sendMemoWithRetry(memoData: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const feePayer = getFeePayer()
      const ix = new TransactionInstruction({
        keys: [{ pubkey: feePayer.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      })
      return await sendAndConfirmTransaction(connection, new Transaction().add(ix), [feePayer], {
        commitment: 'confirmed',
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (attempt === 3 || !/429|Too many requests|rate limit|UNAVAILABLE/i.test(msg)) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    }
  }
  throw new Error('Failed to send memo')
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { errorResponse } = await requireWriteAccess(user.email)
  if (errorResponse) return errorResponse

  const org_id = await resolveOrgId(user.email)
  if (!org_id) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const { data: pending, error } = await supabaseAdmin
    .from('custody_events')
    .select('id, asset_id, event_type, event_hash, occurred_at')
    .eq('org_id', org_id)
    .is('solana_signature', null)
    .order('occurred_at', { ascending: true })
    .limit(25)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending?.length) return NextResponse.json({ message: 'No pending custody events found', updated: 0 })

  const balance = await getFeePayerBalance()
  if (balance === null) {
    return NextResponse.json({ error: 'Unable to verify Solana wallet balance. Please try again later.' }, { status: 503 })
  }
  if (balance < MIN_SOL) {
    return NextResponse.json({ error: `Insufficient SOL balance (${balance.toFixed(4)} SOL).` }, { status: 503 })
  }

  let updated = 0
  const failures: { id: string; error: string }[] = []

  for (const row of pending) {
    try {
      const memoData = JSON.stringify({
        app: 'jagaasset',
        asset_id: row.asset_id,
        event_type: row.event_type,
        hash: row.event_hash ?? generateEventHash(row.asset_id, row.event_type as CustodyEventType, row.occurred_at),
        ts: row.occurred_at,
      })

      const signature = await sendMemoWithRetry(memoData)

      const { error: updateError } = await supabaseAdmin
        .from('custody_events')
        .update({ solana_signature: signature })
        .eq('id', row.id)

      if (updateError) {
        failures.push({ id: row.id, error: updateError.message })
      } else {
        updated++
      }
    } catch (err) {
      failures.push({ id: row.id, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return NextResponse.json({ updated, failures, balance })
}
