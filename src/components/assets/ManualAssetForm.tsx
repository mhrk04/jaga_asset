'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import type { AssetCategory, Employee } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface Form {
  item_name: string
  merchant: string
  serial_number: string
  purchase_date: string
  purchase_price: string
  category: AssetCategory | ''
  warranty_period_months: string
  assigned_to: string
  quantity: string
}

const INITIAL: Form = {
  item_name: '',
  merchant: '',
  serial_number: '',
  purchase_date: '',
  purchase_price: '',
  category: '',
  warranty_period_months: '',
  assigned_to: '',
  quantity: '1',
}

export default function ManualAssetForm({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<Form>(INITIAL)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(INITIAL)
    setError(null)
    fetch('/api/employees')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data.filter((e: Employee) => e.status === 'Active'))
      })
      .catch(() => {})
  }, [open])

  const set = (key: keyof Form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const qty = Math.max(1, parseInt(form.quantity) || 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_name.trim() || !form.merchant.trim() || !form.category) {
      setError('Item name, merchant, and category are required.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const base = {
        item_name: form.item_name.trim(),
        merchant: form.merchant.trim(),
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0,
        category: form.category,
        warranty_period_months: form.warranty_period_months ? parseInt(form.warranty_period_months) : undefined,
        assigned_to: form.assigned_to || undefined,
      }

      // Single asset — use normal endpoint (supports custody event)
      if (qty === 1) {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...base,
            serial_number: form.serial_number.trim() || 'N/A',
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to create asset')
          return
        }
      } else {
        // Multiple assets — build CSV-style rows for bulk endpoint
        const serial = form.serial_number.trim()
        const assets = Array.from({ length: qty }, (_, i) => ({
          item_name: base.item_name,
          merchant: base.merchant,
          serial_number: serial ? `${serial}-${i + 1}` : `N/A-${i + 1}`,
          purchase_date: base.purchase_date ?? '',
          purchase_price: String(base.purchase_price),
          category: base.category,
          warranty_period_months: base.warranty_period_months ? String(base.warranty_period_months) : '',
        }))

        const res = await fetch('/api/assets/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to create assets')
          return
        }
        if (data.failed > 0 && data.success === 0) {
          setError(data.errors?.[0]?.message ?? 'All rows failed')
          return
        }
      }

      setForm(INITIAL)
      onCreated()
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'block w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground'
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <Modal open={open} onClose={onClose} title="Add Asset Manually" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Item Name *</label>
          <input
            type="text"
            value={form.item_name}
            onChange={(e) => set('item_name', e.target.value)}
            placeholder="e.g. MacBook Pro 14-inch"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Merchant / Vendor *</label>
          <input
            type="text"
            value={form.merchant}
            onChange={(e) => set('merchant', e.target.value)}
            placeholder="e.g. DirectD IT Mall"
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              min="1"
              max="500"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Serial Number</label>
            <input
              type="text"
              value={form.serial_number}
              onChange={(e) => set('serial_number', e.target.value)}
              placeholder={qty > 1 ? 'e.g. C02X1234 (becomes C02X1234-1, -2, …)' : 'e.g. C02X1234HKDD'}
              className={inputClass}
            />
            {qty > 1 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {qty} assets will be created. Serial: {form.serial_number.trim() ? `${form.serial_number.trim()}-1 … -${qty}` : `N/A-1 … -${qty}`}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select…</option>
              {['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Purchase Date</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => set('purchase_date', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Purchase Price per Unit (RM)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_price}
              onChange={(e) => set('purchase_price', e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
            {qty > 1 && form.purchase_price && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Total: RM {(parseFloat(form.purchase_price) * qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Warranty Period</label>
            <select
              value={form.warranty_period_months}
              onChange={(e) => set('warranty_period_months', e.target.value)}
              className={inputClass}
            >
              <option value="">No Warranty</option>
              <option value="12">12 Months</option>
              <option value="24">24 Months</option>
              <option value="36">36 Months</option>
            </select>
          </div>
        </div>

        {qty === 1 && (
          <div>
            <label className={labelClass}>Assign To</label>
            <select
              value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)}
              className={inputClass}
            >
              <option value="">— Unassigned —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-card border border-border hover:bg-muted text-muted-foreground text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-foreground text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Spinner size="sm" className="text-foreground" />
                Saving…
              </>
            ) : (
              qty === 1 ? 'Add Asset' : `Add ${qty} Assets`
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
