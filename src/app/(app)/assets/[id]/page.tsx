'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CustodyTimeline from '@/components/assets/CustodyTimeline'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Asset, CustodyEvent, Employee } from '@/types'

type AssetDetail = Asset & { custody_events: CustodyEvent[] }

function statusVariant(status: string): 'green' | 'blue' | 'gray' {
  if (status === 'Available') return 'green'
  if (status === 'Assigned') return 'blue'
  return 'gray'
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Decommission / mark-available
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/assets/${id}`)
        if (!res.ok) throw new Error(res.status === 404 ? 'Asset not found' : 'Failed to load asset')
        const data = await res.json()
        setAsset(data)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const openAssign = async () => {
    if (employees.length === 0) {
      const res = await fetch('/api/employees')
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data.filter((e: Employee) => e.status === 'Active') : [])
    }
    setAssignOpen(true)
    setAssignError(null)
    setSelectedEmployee('')
  }

  const handleAssign = async () => {
    if (!selectedEmployee) return
    setAssigning(true)
    setAssignError(null)
    try {
      const res = await fetch('/api/assign-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: id, employee_id: selectedEmployee }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAssignError(data.error ?? 'Failed to assign asset')
      } else {
        setAssignOpen(false)
        // Refresh
        const refreshRes = await fetch(`/api/assets/${id}`)
        if (refreshRes.ok) setAsset(await refreshRes.json())
      }
    } catch {
      setAssignError('Network error. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error ?? 'Asset not found'}</Alert>
        <button onClick={() => router.back()} className="text-sm text-emerald-400 hover:underline">
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/assets" className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-foreground truncate">{asset.item_name}</h1>
        <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
      </div>

      {/* Info card */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Asset Details</h2>
          <div className="flex items-center gap-2">
            {asset.status !== 'Decommissioned' && (
              <>
                <button
                  onClick={openAssign}
                  className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {asset.status === 'Assigned' ? 'Reassign' : 'Assign'}
                </button>
                {asset.status === 'Assigned' && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Unassign this asset and mark it as Available?')) return
                      setActionLoading(true)
                      setActionError(null)
                      const res = await fetch(`/api/assets/${id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'mark-available' }),
                      })
                      if (!res.ok) {
                        const d = await res.json()
                        setActionError(d.error ?? 'Failed to update')
                      } else {
                        const refreshed = await (await fetch(`/api/assets/${id}`)).json()
                        setAsset(refreshed)
                      }
                      setActionLoading(false)
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 text-sm border border-border hover:bg-muted text-muted-foreground px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Unassign
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!window.confirm('Decommission this asset? This can be reversed.')) return
                    setActionLoading(true)
                    setActionError(null)
                    const res = await fetch(`/api/assets/${id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'decommission' }),
                    })
                    if (!res.ok) {
                      const d = await res.json()
                      setActionError(d.error ?? 'Failed to decommission')
                    } else {
                      const refreshed = await (await fetch(`/api/assets/${id}`)).json()
                      setAsset(refreshed)
                    }
                    setActionLoading(false)
                  }}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 text-sm border border-red-500/20 hover:bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  Decommission
                </button>
              </>
            )}
            {asset.status === 'Decommissioned' && (
              <span className="text-xs text-muted-foreground">Decommissioned assets cannot be modified</span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            { label: 'Merchant', value: asset.merchant },
            { label: 'Category', value: asset.category },
            { label: 'Serial Number', value: <span className="font-mono">{asset.serial_number}</span> },
            { label: 'Purchase Date', value: formatDate(asset.purchase_date) },
            { label: 'Purchase Price', value: <span className="font-semibold">{formatCurrency(asset.purchase_price)}</span> },
            {
              label: 'Warranty Ends',
              value: asset.warranty_end_date ? (
                <span className={new Date(asset.warranty_end_date) < new Date() ? 'text-red-400 font-medium' : ''}>
                  {formatDate(asset.warranty_end_date)}
                </span>
              ) : '—'
            },
            {
              label: 'Assigned To',
              value: asset.employee ? `${asset.employee.name} (${asset.employee.email})` : '—',
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>

        {actionError && (
          <div className="mt-4">
            <Alert variant="error">{actionError}</Alert>
          </div>
        )}
      </div>

      {/* Custody timeline */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-5">Chain of Custody</h2>
        <CustodyTimeline events={asset.custody_events as Parameters<typeof CustodyTimeline>[0]['events']} />
      </div>

      {/* Assign modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign to Employee">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Select Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="block w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-background"
            >
              <option value="">— Select employee —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
              ))}
            </select>
          </div>
          {assignError && <Alert variant="error">{assignError}</Alert>}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setAssignOpen(false)}
              className="border border-border bg-card hover:bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedEmployee || assigning}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {assigning && <Spinner size="sm" className="text-white" />}
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
