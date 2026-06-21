'use client'

import { useEffect, useRef, useState } from 'react'
import AssetTable from '@/components/assets/AssetTable'
import ManualAssetForm from '@/components/assets/ManualAssetForm'
import CsvImportModal from '@/components/assets/CsvImportModal'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import type { Asset, AssetStatus, AssetCategory } from '@/types'

const STATUS_OPTIONS: AssetStatus[] = ['Available', 'Assigned', 'Decommissioned']
const CATEGORY_OPTIONS: AssetCategory[] = ['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera']

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchAssets = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (category) params.set('category', category)
      if (search) params.set('search', search)

      const res = await fetch(`/api/assets?${params}`)
      if (!res.ok) throw new Error('Failed to load assets')
      const data = await res.json()
      setAssets(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">{assets.length} asset(s) total</p>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Asset
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 py-1">
              <button
                onClick={() => { setShowDropdown(false); setShowManualForm(true) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Manual Form</p>
                  <p className="text-xs text-muted-foreground">Fill in asset details</p>
                </div>
              </button>
              <button
                onClick={() => { setShowDropdown(false); setShowCsvImport(true) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 bg-solana/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-solana-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Import CSV</p>
                  <p className="text-xs text-muted-foreground">Bulk upload from spreadsheet</p>
                </div>
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { setShowDropdown(false); window.location.href = '/assets/upload' }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Scan Invoice</p>
                  <p className="text-xs text-muted-foreground">AI-powered extraction</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-card rounded-xl border border-border p-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, merchant, serial..."
            className="flex-1 rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
          />
          <button type="submit" className="bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput('') }}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              ✕
            </button>
          )}
        </form>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-background text-foreground"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-background text-foreground"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Content */}
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <AssetTable assets={assets} />
      )}

      {/* Modals */}
      <ManualAssetForm
        open={showManualForm}
        onClose={() => setShowManualForm(false)}
        onCreated={fetchAssets}
      />
      <CsvImportModal
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onCreated={fetchAssets}
      />
    </div>
  )
}
