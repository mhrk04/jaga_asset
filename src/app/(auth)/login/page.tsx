'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signedUp, setSignedUp] = useState(false)

  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') {
      setMode('signup')
      setOrgName('')
      setConfirmPassword('')
    }
    setRedirectTo(params.get('redirect') || null)
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hp] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleResendVerification = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signedUp ? email : resetEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setError('Verification email sent. Check your inbox.')
      } else {
        setError(data.error || 'Failed to resend')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectUrl = redirectTo || '/dashboard'

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, confirmPassword, orgName, hp }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Sign-up failed')
          return
        }
        setSignedUp(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setError('Please verify your email before signing in. Check your inbox for the verification link.')
            return
          }
          throw error
        }

        // Check if email is verified in metadata
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.email_verified === false) {
          await supabase.auth.signOut()
          setError('Please verify your email before signing in. Check your inbox for the verification link.')
          return
        }

        window.location.href = redirectUrl
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Reset failed')
      } else {
        setResetSent(true)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (signedUp) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-md border border-border shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account, then sign in.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder or{' '}
              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="text-primary hover:underline disabled:opacity-50"
              >
                resend the email
              </button>
            </p>
            {error && (
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm text-primary">{error}</div>
            )}
            <button
              onClick={() => { setSignedUp(false); setMode('signin'); setError(null) }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (resetMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a temporary password</p>
          </div>
          <div className="bg-card rounded-md border border-border shadow-sm p-8 space-y-5">
            {resetSent ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  A temporary password has been sent to <strong className="text-foreground">{resetEmail}</strong>.<br />
                  Check your inbox and spam folder, then sign in with that password.
                </p>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false) }}
                  className="text-sm text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-foreground mb-1">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading || !resetEmail}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-semibold h-10 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Sending...' : 'Send temporary password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(null) }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center">
          <Link href="/" className="inline-block mb-4">
            <Logo iconClassName="w-10 h-10" className="text-2xl" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin'
              ? 'Sign in with your email and password'
              : 'Create a new account to get started'}
          </p>
        </div>

        <div className="bg-card rounded-md border border-border shadow-sm p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div aria-hidden="true" className="absolute opacity-0 pointer-events-none" style={{ height: 0, overflow: 'hidden' }}>
              <input
                tabIndex={-1}
                autoComplete="off"
                type="text"
                name="hp"
                value={hp}
                readOnly
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-foreground mb-1">
                    Organisation name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setResetEmail(email); setError(null) }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className={`rounded-md p-3 text-sm ${
                error.includes('Check your inbox') || error.includes('sent')
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : error.includes('verify')
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                {error}
                {error.includes('verify') && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const btn = document.getElementById('resend-verify-btn')
                        if (btn) btn.style.display = 'inline'
                      }}
                      className="text-primary hover:underline text-xs"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || (mode === 'signup' && (!orgName || !confirmPassword))}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold h-10 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center mb-2">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setOrgName(''); setConfirmPassword('') }}
              className="block w-full text-center border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium h-10 rounded-md text-sm transition-colors"
            >
              {mode === 'signin' ? 'Create one instead' : 'Sign in instead'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
