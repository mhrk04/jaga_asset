import { Connection, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

export const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

export function getFeePayer(): Keypair {
  const privateKeyBase58 = process.env.SOLANA_FEE_PAYER_PRIVATE_KEY
  if (!privateKeyBase58) {
    throw new Error('SOLANA_FEE_PAYER_PRIVATE_KEY is not set in environment variables')
  }
  const secretKey = bs58.decode(privateKeyBase58)
  return Keypair.fromSecretKey(secretKey)
}

export const MIN_SOL = 0.001
export const LOW_SOL_THRESHOLD = 0.5

export async function getFeePayerBalance(): Promise<number | null> {
  try {
    const feePayer = getFeePayer()
    const balance = await connection.getBalance(feePayer.publicKey)
    return balance / 1e9
  } catch (error) {
    console.error('[solana] Failed to fetch fee payer balance:', error)
    return null
  }
}
