import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ipLimit = await checkRateLimit(`reset:${ip}`, 'reset_password')
  if (!ipLimit.allowed) {
    return rateLimitResponse()
  }

  // Find user by email via RPC
  const { data: userId, error: lookupError } = await supabaseAdmin
    .rpc('get_user_id_by_email', { user_email: email })

  if (lookupError) {
    console.error('[reset-password] lookup error:', lookupError)
    return NextResponse.json({ error: 'Database error. Try again.' }, { status: 500 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'No account found with that email' }, { status: 404 })
  }

  if (password) {
    // Get current metadata and clear temp_password flag
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const existingMeta = existingUser?.user?.user_metadata ?? {}
    const cleanMeta: Record<string, unknown> = {}
    for (const k of Object.keys(existingMeta)) {
      if (k !== 'temp_password') cleanMeta[k] = existingMeta[k]
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password,
        user_metadata: cleanMeta,
      }
    )
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ message: 'Password updated' })
  }

  // Generate temp password and update user with metadata flag
  const tempPassword = generateTempPassword()

  // Get current user metadata (preserve any existing fields)
  const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const existingMeta = existingUser?.user?.user_metadata ?? {}

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      password: tempPassword,
      user_metadata: { ...existingMeta, temp_password: true },
    }
  )
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send email via Resend SDK
  const { error: emailError } = await resend.emails.send({
    from: 'JagaAsset <noreply@jaga-asset.mhaziqrk.uk>',
    to: email,
    subject: 'Your temporary password for JagaAsset',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #059669;">JagaAsset — Password Reset</h2>
        <p>Here is your temporary password:</p>
        <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-size: 18px; font-family: monospace; letter-spacing: 2px; text-align: center;">
          ${tempPassword}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Sign in with this password, then change it in your account settings.
        </p>
        <p style="color: #6b7280; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('[reset-password] Resend error:', emailError)
    return NextResponse.json({ error: 'Failed to send email. Try again later.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Temporary password sent to your email' })
}
