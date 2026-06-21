import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { isBlockedDomain } from '@/lib/blocked-domains'
import { isConsumerDomain } from '@/lib/consumer-domains'

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
  const { email, password, confirmPassword, orgName, hp } = await request.json()

  // Honeypot check
  if (hp) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Password strength
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters with letters and numbers' },
      { status: 400 }
    )
  }

  // Confirm passwords match
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  // Org name
  if (!orgName || !orgName.trim()) {
    return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 })
  }

  // Block disposable email domains
  if (isBlockedDomain(email)) {
    return NextResponse.json(
      { error: 'This email provider is not supported. Use a permanent email address.' },
      { status: 400 }
    )
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ipLimit = await checkRateLimit(`signup:${ip}`, 'signup')
  if (!ipLimit.allowed) {
    return rateLimitResponse()
  }

  // Rate limit by email domain
  const domain = email.split('@')[1]?.toLowerCase() ?? 'unknown'
  const domainLimit = await checkRateLimit(`signup_domain:${domain}`, 'signup_domain')
  if (!domainLimit.allowed) {
    return rateLimitResponse()
  }

  // Validate email domain
  if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return NextResponse.json({ error: 'Invalid email domain' }, { status: 400 })
  }

  // Generate verification token
  const verificationToken = generateToken()

  // Create user — confirmed in Supabase, but marked unverified in metadata
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      email_verified: false,
      verification_token: verificationToken,
      org_name: orgName.trim(),
    },
  })

  if (createError) {
    console.error('[signup] createUser error:', createError)
    return NextResponse.json({ error: 'Account could not be created. Try again later.' }, { status: 400 })
  }

  const userId = userData.user?.id

  // Send verification email via Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verifyUrl = `${appUrl}/auth/verify?email=${encodeURIComponent(email)}&token=${verificationToken}`

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
          Thanks for signing up! Click the button below to verify your email and activate your account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px;
                    text-decoration: none; font-weight: 600; display: inline-block;">
            Verify email
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
          Or copy this link into your browser:<br>
          <span style="color: #059669; word-break: break-all;">${verifyUrl}</span>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('[signup] Resend error:', emailError)
  }

  return NextResponse.json({
    message: 'Account created. Check your email for a verification link.',
    user: { id: userId, email },
  })
}
