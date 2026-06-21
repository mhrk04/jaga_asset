'use client'

import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Employee } from '@/types'

interface EmployeeTableProps {
  employees: (Employee & { asset_count?: number })[]
  onOffboard: (employee: Employee) => void
}

export default function EmployeeTable({ employees, onOffboard }: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <svg className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="font-medium text-foreground">No employees found</p>
        <p className="text-sm mt-1 text-muted-foreground">Add your first employee to get started.</p>
      </div>
    )
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Status</Th>
          <Th>Assets Held</Th>
          <Th>Added</Th>
          <Th>Action</Th>
        </tr>
      </Thead>
      <Tbody>
        {employees.map((emp) => (
          <Tr key={emp.id}>
            <Td className="font-medium text-foreground">{emp.name}</Td>
            <Td>{emp.email}</Td>
            <Td>
              <Badge variant={emp.status === 'Active' ? 'green' : 'red'}>{emp.status}</Badge>
            </Td>
            <Td>{emp.asset_count ?? 0}</Td>
            <Td>{formatDate(emp.created_at)}</Td>
            <Td>
              {emp.status === 'Active' && (
                <button
                  onClick={() => onOffboard(emp)}
                  className="text-xs text-red-600 hover:text-red-600 font-medium border border-red-500/30 hover:border-red-500/50 rounded-lg px-2.5 py-1 transition-colors"
                >
                  Offboard
                </button>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
