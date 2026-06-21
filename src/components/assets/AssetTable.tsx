'use client'

import { useRouter } from 'next/navigation'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Asset } from '@/types'

interface AssetTableProps {
  assets: Asset[]
}

function statusVariant(status: string): 'green' | 'blue' | 'gray' {
  if (status === 'Available') return 'green'
  if (status === 'Assigned') return 'blue'
  return 'gray'
}

export default function AssetTable({ assets }: AssetTableProps) {
  const router = useRouter()

  if (assets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <svg className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="font-medium text-foreground">No assets found</p>
        <p className="text-sm mt-1 text-muted-foreground">Upload an invoice to register your first asset.</p>
      </div>
    )
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Item</Th>
          <Th>Category</Th>
          <Th>Serial Number</Th>
          <Th>Status</Th>
          <Th>Assigned To</Th>
          <Th>Purchase Price</Th>
          <Th>Warranty End</Th>
        </tr>
      </Thead>
      <Tbody>
        {assets.map((asset) => (
          <Tr key={asset.id} onClick={() => router.push(`/assets/${asset.id}`)}>
            <Td className="max-w-xs">
              <div>
                <p className="font-medium text-foreground truncate">{asset.item_name}</p>
                <p className="text-xs text-muted-foreground">{asset.merchant}</p>
              </div>
            </Td>
            <Td>{asset.category}</Td>
            <Td className="font-mono text-xs">{asset.serial_number}</Td>
            <Td>
              <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
            </Td>
            <Td>
              {asset.employee ? (
                <div>
                  <p className="text-foreground">{asset.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.employee.email}</p>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Td>
            <Td className="font-medium">{formatCurrency(asset.purchase_price)}</Td>
            <Td>
              {asset.warranty_end_date ? (
                  <span className={new Date(asset.warranty_end_date) < new Date() ? 'text-red-600' : ''}>
                  {formatDate(asset.warranty_end_date)}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}
