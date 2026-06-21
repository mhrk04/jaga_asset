import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type LimitConfig = {
  max: number
  windowSeconds: number
}

const LIMITS: Record<string, LimitConfig> = {
  signup: { max: 3, windowSeconds: 900 },       // 3 per 15 min per IP
  signup_domain: { max: 5, windowSeconds: 3600 }, // 5 per hour per domain
  reset_password: { max: 3, windowSeconds: 900 }, // 3 per 15 min per IP
  resend_verify: { max: 3, windowSeconds: 900 },   // 3 per 15 min per IP
  resend_verify_email: { max: 3, windowSeconds: 3600 }, // 3 per hour per email
}

export async function checkRateLimit(
  key: string,
  type: string = 'signup'
): Promise<{ allowed: boolean; remaining: number }> {
  const config = LIMITS[type]
  if (!config) return { allowed: true, remaining: Infinity }

  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_key: key,
    p_window_seconds: config.windowSeconds,
  })

  if (error || data === null || data === undefined) {
    console.error('[rate-limit] error:', error)
    return { allowed: true, remaining: 1 }
  }

  const count = typeof data === 'number' ? data : Number(data)
  return {
    allowed: count <= config.max,
    remaining: Math.max(0, config.max - count),
  }
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Try again later.' },
    { status: 429 }
  )
}
