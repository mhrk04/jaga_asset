'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import type { Employee } from '@/types'

interface OffboardResult {
  assets_returned: number
  returned_assets: { id: string; item_name: string; category: string }[]
  notion_user_id: string | null
  notion_error: string | null
  notion_event_hash: string | null
  notion_solana_signature: string | null
  onchain_recorded: boolean
  email_sent: boolean
}

interface OffboardingModalProps {
  employee: Employee | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OffboardingModal({ employee, open, onClose, onSuccess }: OffboardingModalProps) {
  const [step, setStep] = useState<'confirm' | 'loading' | 'done'>('confirm')
  const [result, setResult] = useState<OffboardResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!employee) return
    setStep('loading')
    setError(null)

    try {
      const res = await fetch('/api/offboard-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Offboarding failed')
        setStep('confirm')
      } else {
        setResult(data)
        setStep('done')
        onSuccess()
      }
    } catch {
      setError('Network error. Please try again.')
      setStep('confirm')
    }
  }

  const handleClose = () => {
    setStep('confirm')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!employee) return null

  return (
    <Modal
      open={open}
      onClose={step === 'loading' ? () => {} : handleClose}
      title={step === 'done' ? 'Offboarding Complete' : `Offboard ${employee.name}`}
      size="md"
    >
      {step === 'confirm' && (
        <div className="space-y-4">
          <Alert variant="warning">
            You are about to offboard <strong>{employee.name}</strong>. This will:
            <ul className="list-disc ml-4 mt-2 space-y-1 text-sm">
              <li>Return all assigned assets to Available</li>
              <li>Record custody transfers on Solana</li>
              <li>Revoke Notion workspace access (if configured)</li>
              <li>Record Notion deprovisioning on-chain</li>
              <li>Send a confirmation email</li>
            </ul>
          </Alert>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="border border-border bg-card hover:bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Confirm Offboarding
            </button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="py-6 text-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Processing offboarding...</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Returning assets...</p>
            <p>Recording custody events on-chain...</p>
            <p>Revoking Notion workspace access...</p>
            <p>Sending confirmation email...</p>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <Alert variant="success">
            <strong>{employee.name}</strong> has been successfully offboarded.
          </Alert>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">
                Assets Returned ({result.assets_returned})
              </p>
              {result.returned_assets.length > 0 ? (
                <ul className="space-y-1">
                  {result.returned_assets.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {a.item_name} <span className="text-muted-foreground">({a.category})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No assets were assigned.</p>
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className={result.notion_user_id ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {result.notion_user_id ? '✓' : '○'}
                </span>
                <span className="text-muted-foreground">
                  Notion {result.notion_user_id ? 'workspace access revoked' : result.notion_error ? `failed (${result.notion_error})` : 'not configured'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={result.onchain_recorded ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {result.onchain_recorded ? '✓' : '○'}
                </span>
                <span className="text-muted-foreground">
                  On-chain record {result.onchain_recorded ? 'recorded' : 'not recorded'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={result.email_sent ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {result.email_sent ? '✓' : '○'}
                </span>
                <span className="text-muted-foreground">
                  Confirmation email {result.email_sent ? 'sent' : 'not sent'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
