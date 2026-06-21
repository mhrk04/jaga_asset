'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [plan, setPlan] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [members, setMembers] = useState<{ id: string; email: string; role: string }[]>([])
  const [memberActionMsg, setMemberActionMsg] = useState<string | null>(null)
  const [cancelMsg, setCancelMsg] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchProfile = () => {
    fetch('/api/user/profile').then((r) => r.json()).then((data) => {
      setRole(data.role ?? null)
      if (data.org) {
        setOrgName(data.org.name)
        setPlan(data.org.plan)
        setSubscriptionStatus(data.org.subscription_status)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) { router.replace('/login'); return }
      setEmail(user.email)
      fetchProfile()
    })
  }, [supabase, router])

  useEffect(() => {
    fetch('/api/org/members').then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setMembers(data)
    })
  }, [])

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update' })
      } else {
        setMessage({ type: 'success', text: 'Organisation name updated' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setPasswordMessage(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email, password: currentPassword,
    })
    if (signInError) {
      setPasswordMessage({ type: 'error', text: 'Current password is incorrect' })
      setChangingPassword(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { temp_password: false },
    })
    if (updateError) {
      setPasswordMessage({ type: 'error', text: updateError.message || 'Failed to update password' })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' })
      setCurrentPassword('')
      setNewPassword('')
    }
    setChangingPassword(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and organisation</p>
      </div>

      {/* Profile picture */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Profile Picture</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <button
            disabled
            className="text-sm text-muted-foreground cursor-not-allowed border border-input rounded-lg px-4 py-2"
            title="Coming soon"
          >
            Upload photo
          </button>
          <span className="text-xs text-muted-foreground">Coming soon</span>
        </div>
      </div>

      {/* Email */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Account Email</h2>
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground w-full max-w-sm">
            {email}
          </div>
          <span className="text-xs text-muted-foreground">(cannot be changed)</span>
        </div>
      </div>

      {/* Organisation */}
      <form onSubmit={handleSaveOrg} className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Organisation</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Organisation name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="block w-full max-w-sm rounded-lg bg-background border border-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Plan: <span className="font-medium text-foreground/60 capitalize">{plan}</span></span>
            {role && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground/60 capitalize">
                {role}
              </span>
            )}
          </div>
          {message && (
            <div className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* Subscription (owner only, Pro plan) */}
      {role === 'owner' && plan === 'pro' && subscriptionStatus !== 'canceled' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Subscription</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You are on the <strong className="text-foreground">Pro</strong> plan. You can cancel at any time — no hidden fees, no questions asked.
          </p>

          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 font-medium border border-red-500/20 hover:border-red-500/30 rounded-lg px-4 py-2 transition-colors"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">What happens when you cancel?</p>
                <ul className="text-sm text-foreground/60 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong className="text-foreground">No charges.</strong> We will not bill you next month.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Your Pro access continues until the end of the current billing period.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>After that, your plan reverts to Free (unlimited read-only access).</span>
                  </li>
                </ul>
              </div>

              {cancelMsg && (
                <p className={`text-xs ${cancelMsg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                  {cancelMsg}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setCancelling(true)
                    setCancelMsg(null)
                    const res = await fetch('/api/stripe/cancel', { method: 'POST' })
                    const data = await res.json()
                    if (data.error) {
                      setCancelMsg(`Error: ${data.error}`)
                      setCancelling(false)
                    } else {
                      setShowCancelConfirm(false)
                      setCancelling(false)
                      fetchProfile()
                    }
                  }}
                  disabled={cancelling}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {cancelling ? 'Processing...' : 'Yes, cancel — do not charge me next month'}
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); setCancelMsg(null) }}
                  disabled={cancelling}
                  className="bg-background border border-border hover:bg-muted text-muted-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Keep my Pro plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel success / already cancelled state */}
      {subscriptionStatus === 'canceled' && (
        <div className="bg-card rounded-xl border border-emerald-500/20 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Subscription Cancelled</h2>
              <ul className="text-sm text-foreground/60 space-y-1.5">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>You will <strong className="text-foreground">not</strong> be charged next month.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Pro features remain active until your current billing period ends.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>You can resubscribe anytime from your plan settings.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Org members (owner only) */}
      {role === 'owner' && members.length > 1 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Team Members</h2>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm text-foreground">{m.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                </div>
                {m.role !== 'owner' && (
                  <button
                    onClick={async () => {
                      setMemberActionMsg(null)
                      const newRole = m.role === 'member' ? 'manager' : 'member'
                      const res = await fetch('/api/org/members', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: m.email, role: newRole }),
                      })
                      const data = await res.json()
                      if (res.ok) {
                        setMembers(members.map((x) => x.id === m.id ? { ...x, role: newRole } : x))
                      } else {
                        setMemberActionMsg(data.error || 'Failed to update')
                      }
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-400 font-medium"
                  >
                    {m.role === 'member' ? 'Make manager' : 'Remove manager'}
                  </button>
                )}
              </div>
            ))}
            {memberActionMsg && (
              <p className="text-xs text-red-400">{memberActionMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Change Password</h2>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="block w-full rounded-lg bg-background border border-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="block w-full rounded-lg bg-background border border-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {passwordMessage && (
            <div className={`text-sm ${passwordMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {passwordMessage.text}
            </div>
          )}
          <button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword || newPassword.length < 6}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
