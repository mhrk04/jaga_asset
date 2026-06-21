'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function VerifyContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'already-verified' | 'error' | 'resent'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [email, setEmail] = useState('')
  const [orgCreated, setOrgCreated] = useState(false)

  useEffect(() => {
    const e = searchParams.get('email')
    const t = searchParams.get('token')
    if (!e || !t) {
      setErrorMsg('Invalid verification link. It may be malformed.')
      setStatus('error')
      return
    }
    setEmail(e)

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, token: t }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          if (data.message === 'Email already verified') {
            setStatus('already-verified')
          } else {
            setOrgCreated(true)
            setStatus('success')
          }
        } else {
          setErrorMsg(data.error || 'Verification failed')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('Network error. Try again.')
        setStatus('error')
      })
  }, [searchParams])

  const handleResend = async () => {
    setStatus('verifying')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('resent')
      } else {
        setErrorMsg(data.error || 'Failed to resend')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }

  return (
    <div className="w-full max-w-md">
      {(status === 'verifying') && (
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      )}

      {(status === 'success') && (
        <div className="bg-card rounded-md border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Email verified!</h2>
          <p className="text-sm text-muted-foreground">
            {orgCreated
              ? 'Your organisation has been created. You can now sign in.'
              : 'You can now sign in.'}
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-md transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      {(status === 'already-verified') && (
        <div className="bg-card rounded-md border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Already verified</h2>
          <p className="text-sm text-muted-foreground">
            Your email was already verified. You can sign in below.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-md transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      {(status === 'error') && (
        <div className="bg-card rounded-md border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Verification failed</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleResend}
              className="text-sm text-primary hover:underline"
            >
              Resend verification email
            </button>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to login
            </Link>
          </div>
        </div>
      )}

      {(status === 'resent') && (
        <div className="bg-card rounded-md border border-border shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Email sent</h2>
          <p className="text-sm text-muted-foreground">
            A new verification email has been sent to <strong>{email}</strong>.
            Check your inbox and spam folder.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-md transition-colors"
          >
            Back to login
          </Link>
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  )
}
