import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ipLimit = await checkRateLimit(`resend_verify:${ip}`, 'resend_verify')
  if (!ipLimit.allowed) {
    return rateLimitResponse()
  }

  // Rate limit by email
  const emailLimit = await checkRateLimit(`resend_verify_email:${email}`, 'resend_verify_email')
  if (!emailLimit.allowed) {
    return rateLimitResponse()
  }

  // Look up user by email
  const { data: userId, error: lookupError } = await supabaseAdmin
    .rpc('get_user_id_by_email', { user_email: email })

  if (lookupError || !userId) {
    return NextResponse.json({ error: 'No account found with that email' }, { status: 404 })
  }

  // Get user
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!userData?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const meta = userData.user.user_metadata ?? {}

  // Already verified
  if (meta.email_verified === true) {
    return NextResponse.json({ message: 'Email already verified. You can sign in.' })
  }

  // Generate new token
  const newToken = generateToken()

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, verification_token: newToken },
  })

  if (updateError) {
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 })
  }

  // Send email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verifyUrl = `${appUrl}/auth/verify?email=${encodeURIComponent(email)}&token=${newToken}`

  const { error: emailError } = await resend.emails.send({
    from: 'JagaAsset <noreply@jaga-asset.mhaziqrk.uk>',
    to: email,
    subject: 'Verify your email — JagaAsset',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0;">JagaAsset</h1>
          <p style="color: #6b7280; margin: 0;">IT Asset Management on Solana</p>
        </div>
        <h2 style="color: #111827;">Verify your email address</h2>
        <p style="color: #6b7280; line-height: 1.6;">
          Click the button below to verify your email and activate your account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px;
                    text-decoration: none; font-weight: 600; display: inline-block;">
            Verify email
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
          Or copy this link: ${verifyUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('[resend-verification] error:', emailError)
    return NextResponse.json({ error: 'Failed to send email. Try again later.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Verification email sent' })
}
