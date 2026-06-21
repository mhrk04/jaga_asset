'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import type { AssetCategory } from '@/types'

interface ExtractedItem {
  item_name: string
  merchant: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  category: AssetCategory | ''
  warranty_period_months: number
  quantity: number
}

interface ExtractedResponse {
  merchant: string
  purchase_date: string
  items: ExtractedItem[]
}

export default function InvoiceUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [merchant, setMerchant] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [extractError, setExtractError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ count: number; ids?: string } | null>(null)

  const handleFile = useCallback((file: File) => {
    setImageFile(file)
    setItems([])
    setExtractError(null)
    setRegisterError(null)
    setSuccess(null)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) handleFile(file)
    },
    [handleFile]
  )

  const handleExtract = async () => {
    if (!imageFile) return
    setExtracting(true)
    setExtractError(null)
    setItems([])

    const formData = new FormData()
    formData.append('image', imageFile)

    try {
      const res = await fetch('/api/extract-invoice', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setExtractError(data.error ?? 'Extraction failed')
      } else {
        const resp: ExtractedResponse = data
        setMerchant(resp.merchant)
        setPurchaseDate(resp.purchase_date)
        setItems(resp.items)
      }
    } catch {
      setExtractError('Network error. Please try again.')
    } finally {
      setExtracting(false)
    }
  }

  const updateItem = (index: number, field: keyof ExtractedItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: '',
        merchant,
        serial_number: '',
        purchase_date: purchaseDate,
        purchase_price: 0,
        category: '' as AssetCategory,
        warranty_period_months: 12,
        quantity: 1,
      },
    ])
  }

  const totalAssets = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

  const handleRegister = async () => {
    if (items.length === 0) return
    setRegistering(true)
    setRegisterError(null)

    try {
      const payload: { merchant: string; purchase_date: string; items: ExtractedItem[] } = {
        merchant,
        purchase_date: purchaseDate,
        items,
      }

      const res = await fetch('/api/assets/bulk-from-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setRegisterError(data.error ?? 'Failed to register assets')
      } else {
        setSuccess({ count: data.success, ids: data.ids?.join(', ') })
      }
    } catch {
      setRegisterError('Network error. Please try again.')
    } finally {
      setRegistering(false)
    }
  }

  if (success) {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">{success.count} Asset{success.count !== 1 ? 's' : ''} Registered!</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-solana/10 text-solana-light">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Anchored to Solana
          </span>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => router.push('/assets')}
            className="bg-emerald-600 hover:bg-emerald-700 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-950/20"
          >
            View Assets
          </button>
          <button
            onClick={() => {
              setSuccess(null)
              setImageFile(null)
              setImagePreview(null)
              setItems([])
            }}
            className="bg-card border border-border hover:bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>
    )
  }

  const inputClass = 'block w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-muted-foreground'
  const selectClass = 'block w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_0.9fr] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        {/* Upload zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer shadow-sm ${
            dragging ? 'border-emerald-400 bg-emerald-500/10' : 'border-border hover:border-muted-foreground bg-card'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {imagePreview ? (
            <div className="space-y-3">
              {imageFile?.type === 'application/pdf' ? (
                <div className="max-h-80 mx-auto rounded-xl border border-border bg-muted flex items-center justify-center p-10">
                  <div className="text-center space-y-2">
                    <svg className="h-10 w-10 text-red-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">PDF file selected</p>
                  </div>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imagePreview} alt="Invoice preview" className="max-h-80 mx-auto rounded-xl shadow object-contain" />
              )}
              <p className="text-sm text-muted-foreground font-medium">{imageFile?.name}</p>
              <p className="text-xs text-muted-foreground">Click to replace</p>
            </div>
          ) : (
            <div className="space-y-4">
              <svg className="h-12 w-12 text-muted-foreground mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-muted-foreground">Align invoice within the frame</p>
              <div>
                <p className="text-sm font-medium text-foreground">Drag & drop invoice image here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse — JPEG, PNG, WebP, PDF up to 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Extract button */}
        {imageFile && items.length === 0 && (
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-foreground font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-950/20"
          >
            {extracting ? (
              <>
                <Spinner size="sm" className="text-foreground" />
                Jaga is reading your invoice...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Scan with AI
              </>
            )}
          </button>
        )}

        {extractError && <Alert variant="error">{extractError}</Alert>}

        {/* Multi-item review table */}
        {items.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-foreground">{items.length} Item{items.length !== 1 ? 's' : ''} Extracted</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
                  Pending Verification
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-solana/10 text-solana-light">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  CHAIN
                </span>
              </div>
            </div>

            {/* Shared fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Merchant</label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Invoice Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-white/[0.02]">
              <table className="w-full min-w-[1180px] table-fixed text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-[32%]">Item Name</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-[15%]">Category</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-[15%]">Serial</th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium w-[13%]">Price (RM)</th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium w-[8%]">Qty</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-[13%]">Warranty</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-border hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-muted-foreground text-sm align-top">{i + 1}</td>
                      <td className="py-3 px-3 align-top">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => updateItem(i, 'item_name', e.target.value)}
                          className={`${inputClass} min-w-0`}
                          placeholder="Product name"
                        />
                      </td>
                      <td className="py-3 px-3 align-top">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(i, 'category', e.target.value)}
                          className={selectClass}
                        >
                          <option value="">—</option>
                          {['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <input
                          type="text"
                          value={item.serial_number}
                          onChange={(e) => updateItem(i, 'serial_number', e.target.value)}
                          className={`${inputClass} min-w-0`}
                          placeholder="N/A"
                        />
                      </td>
                      <td className="py-3 px-3 align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.purchase_price}
                          onChange={(e) => updateItem(i, 'purchase_price', parseFloat(e.target.value) || 0)}
                          className={`${inputClass} text-right min-w-0`}
                        />
                      </td>
                      <td className="py-3 px-3 align-top">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className={`${inputClass} text-right min-w-0`}
                        />
                      </td>
                      <td className="py-3 px-3 align-top">
                        <select
                          value={item.warranty_period_months}
                          onChange={(e) => updateItem(i, 'warranty_period_months', parseInt(e.target.value))}
                          className={selectClass}
                        >
                          <option value={12}>12 months</option>
                          <option value={24}>24 months</option>
                          <option value={36}>36 months</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <button
                          onClick={() => removeItem(i)}
                          className="text-muted-foreground hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                          title="Remove item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add item + summary */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={addItem}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
              <p className="text-sm text-muted-foreground">
                Total: <span className="text-foreground font-medium">{totalAssets}</span> asset{totalAssets !== 1 ? 's' : ''}
                {' '} — RM {items.reduce((sum, item) => sum + (item.purchase_price * (item.quantity || 1)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            {registerError && <Alert variant="error">{registerError}</Alert>}

            <button
              onClick={handleRegister}
              disabled={registering || items.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-foreground font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {registering ? (
                <>
                  <Spinner size="sm" className="text-foreground" />
                  Anchoring to Solana...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  Register {totalAssets} Asset{totalAssets !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Recent Scans sidebar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 xl:sticky xl:top-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">Recent Scans</h3>
        </div>
        <RecentScans />
      </div>
    </div>
  )
}

function RecentScans() {
  const [assets, setAssets] = useState<{ id: string; item_name: string; created_at: string; solana_signature?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assets?limit=5')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAssets(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-xs text-muted-foreground text-center py-4">Loading...</div>
  if (assets.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="h-8 w-8 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-xs text-muted-foreground">No scans yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {assets.map((a) => (
        <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
          <div className="w-8 h-8 bg-solana/10 rounded flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-solana-light" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate font-medium">{a.item_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(a.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {a.solana_signature && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600">LIVE</span>
          )}
        </div>
      ))}
    </div>
  )
}
