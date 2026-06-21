'use client'

import { useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface CsvRow {
  item_name: string
  merchant: string
  serial_number: string
  purchase_date: string
  purchase_price: string
  category: string
  warranty_period_months: string
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

const CSV_COLUMNS = [
  { name: 'item_name', required: true, example: 'MacBook Pro 14-inch', desc: 'Name / model of the asset' },
  { name: 'merchant', required: true, example: 'DirectD IT Mall', desc: 'Vendor or store name' },
  { name: 'serial_number', required: false, example: 'C02X1234HKDD', desc: 'Serial number (defaults to N/A)' },
  { name: 'purchase_date', required: false, example: '2025-06-15', desc: 'Format: YYYY-MM-DD' },
  { name: 'purchase_price', required: false, example: '8999.00', desc: 'Numeric, no currency symbol' },
  { name: 'category', required: true, example: 'Laptop', desc: 'Laptop | Monitor | Peripherals | Mobile Device | Camera' },
  { name: 'warranty_period_months', required: false, example: '24', desc: '12, 24, or 36 (or blank)' },
  { name: 'quantity', required: false, example: '10', desc: 'Number of units (defaults to 1). Serial gets -1, -2, … suffix' },
]

const EXAMPLE_CSV = `item_name,merchant,serial_number,purchase_date,purchase_price,category,warranty_period_months,quantity
MacBook Pro 14-inch,DirectD IT Mall,C02X1234,2025-06-15,8999.00,Laptop,24,5
Dell UltraSharp 27,IT World,DU27-9876,2025-03-10,2499.00,Monitor,36,2
Logitech MX Keys,Shopee,,2025-07-01,449.00,Peripherals,,20
iPhone 15 Pro,Apple Store,MU783ZA/A,2025-09-20,5999.00,Mobile Device,12,1`

export default function CsvImportModal({ open, onClose, onCreated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = () => {
    setFileName('')
    setParsed([])
    setParseError(null)
    setResult(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (file: File) => {
    reset()
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCsv(text)
    }
    reader.readAsText(file)
  }

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      setParseError('CSV must have a header row and at least one data row.')
      return
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const requiredCols = CSV_COLUMNS.filter((c) => c.required).map((c) => c.name)
    const missing = requiredCols.filter((r) => !header.includes(r))
    if (missing.length > 0) {
      setParseError(`Missing required columns: ${missing.join(', ')}`)
      return
    }

    const rows: CsvRow[] = []
    const errors: { row: number; message: string }[] = []
    const validCategories = ['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera']

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      const row: Record<string, string> = {}
      header.forEach((h, idx) => { row[h] = values[idx] ?? '' })

      if (!row.item_name) { errors.push({ row: i + 1, message: 'Missing item_name' }); continue }
      if (!row.merchant) { errors.push({ row: i + 1, message: 'Missing merchant' }); continue }
      if (!row.category || !validCategories.includes(row.category)) {
        errors.push({ row: i + 1, message: `Invalid category: "${row.category}". Must be one of: ${validCategories.join(', ')}` })
        continue
      }

      const qty = Math.max(1, parseInt(row.quantity) || 1)
      const serial = row.serial_number || 'N/A'

      for (let q = 0; q < qty; q++) {
        rows.push({
          item_name: row.item_name,
          merchant: row.merchant,
          serial_number: qty > 1 ? `${serial}-${q + 1}` : serial,
          purchase_date: row.purchase_date || '',
          purchase_price: row.purchase_price || '0',
          category: row.category,
          warranty_period_months: row.warranty_period_months || '',
        })
      }
    }

    if (errors.length > 0 && rows.length === 0) {
      setParseError(errors.map((e) => `Row ${e.row}: ${e.message}`).join('\n'))
      return
    }

    setParsed(rows)
    if (errors.length > 0) {
      setParseError(`${errors.length} row(s) skipped:\n${errors.map((e) => `Row ${e.row}: ${e.message}`).join('\n')}`)
    }
  }

  const handleImport = async () => {
    if (parsed.length === 0) return
    setImporting(true)

    try {
      const res = await fetch('/api/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: parsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error ?? 'Import failed')
      } else {
        setResult(data)
        onCreated()
      }
    } catch {
      setParseError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jagaasset-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Assets from CSV" size="lg">
      {!result ? (
        <div className="space-y-4">
          {/* Column format guide */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">CSV Column Format</h3>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                Download Template
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Column</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Required</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Example</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {CSV_COLUMNS.map((col) => (
                    <tr key={col.name} className="border-b border-border">
                      <td className="py-2 pr-3 font-mono text-emerald-600 whitespace-nowrap">{col.name}</td>
                      <td className="py-2 pr-3">
                        {col.required ? (
                          <span className="text-red-600 font-medium">Required</span>
                        ) : (
                          <span className="text-muted-foreground">Optional</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{col.example}</td>
                      <td className="py-2 text-muted-foreground">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload zone */}
          <div
            className="border-2 border-dashed border-border hover:border-muted-foreground rounded-xl p-6 text-center cursor-pointer transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file && file.type === 'text/csv') handleFile(file)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            {fileName ? (
              <div className="space-y-2">
                <svg className="h-8 w-8 text-emerald-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-foreground font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">{parsed.length} asset(s) ready — click to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="h-8 w-8 text-muted-foreground mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-muted-foreground">Drop a CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Accepts .csv files</p>
              </div>
            )}
          </div>

          {parseError && <Alert variant="error"><pre className="whitespace-pre-wrap text-xs">{parseError}</pre></Alert>}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Preview ({parsed.length} assets)</h3>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Item</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Merchant</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3 text-foreground">{row.item_name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.merchant}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.category}</td>
                        <td className="py-2 px-3 text-muted-foreground">RM {parseFloat(row.purchase_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-card border border-border hover:bg-muted text-muted-foreground text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || parsed.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-foreground text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Spinner size="sm" className="text-foreground" />
                  Importing…
                </>
              ) : (
                `Import ${parsed.length} Asset${parsed.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Success result */
        <div className="space-y-4 text-center py-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground">Import Complete</h3>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
              <p className="text-muted-foreground">Imported</p>
            </div>
            {result.failed > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-muted-foreground">Failed</p>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="text-left bg-card rounded-lg border border-border p-3 max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">Row {err.row}: {err.message}</p>
              ))}
            </div>
          )}
          <button
            onClick={handleClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  )
}
