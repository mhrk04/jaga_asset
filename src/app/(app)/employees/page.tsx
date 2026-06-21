'use client'

import { useEffect, useState } from 'react'
import EmployeeTable from '@/components/employees/EmployeeTable'
import OffboardingModal from '@/components/employees/OffboardingModal'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import type { Employee } from '@/types'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<(Employee & { asset_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Offboarding
  const [offboardTarget, setOffboardTarget] = useState<Employee | null>(null)
  const [offboardOpen, setOffboardOpen] = useState(false)

  // Add employee form
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Failed to load employees')
      const data = await res.json()
      setEmployees(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleOffboard = (emp: Employee) => {
    setOffboardTarget(emp)
    setOffboardOpen(true)
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, email: addEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add employee')
      } else {
        setShowAdd(false)
        setAddName('')
        setAddEmail('')
        fetchEmployees()
      }
    } catch {
      setAddError('Network error. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const activeCount = employees.filter((e) => e.status === 'Active').length
  const offboardedCount = employees.filter((e) => e.status === 'Offboarded').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active · {offboardedCount} offboarded
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setAddError(null) }}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Add employee form */}
      {showAdd && (
        <form
          onSubmit={handleAddEmployee}
          className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-foreground/70">New Employee</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Jane Smith"
                className="block w-full rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Work Email *</label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="jane@company.com"
                className="block w-full rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          {addError && <Alert variant="error">{addError}</Alert>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={adding}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {adding && <Spinner size="sm" className="text-white" />}
              {adding ? 'Adding...' : 'Add Employee'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="border border-border bg-card hover:bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Content */}
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <EmployeeTable employees={employees} onOffboard={handleOffboard} />
      )}

      {/* Offboarding modal */}
      <OffboardingModal
        employee={offboardTarget}
        open={offboardOpen}
        onClose={() => setOffboardOpen(false)}
        onSuccess={fetchEmployees}
      />
    </div>
  )
}
