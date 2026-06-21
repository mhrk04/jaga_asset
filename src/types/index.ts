export type AssetCategory =
  | 'Laptop'
  | 'Monitor'
  | 'Peripherals'
  | 'Mobile Device'
  | 'Camera'

export type AssetStatus = 'Available' | 'Assigned' | 'Decommissioned'

export type EmployeeStatus = 'Active' | 'Offboarded'

export type CustodyEventType =
  | 'Registered'
  | 'Assigned'
  | 'Transferred'
  | 'Decommissioned'

export interface Organisation {
  id: string
  name: string
  slug: string
  plan: 'trial' | 'pro'
  trial_uploads: number
  created_at: string
}

export interface Employee {
  id: string
  org_id: string
  name: string
  email: string
  status: EmployeeStatus
  offboarding_date?: string
  created_at: string
}

export interface Asset {
  id: string
  org_id: string
  merchant: string
  item_name: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  category: AssetCategory
  warranty_end_date?: string
  assigned_to?: string
  status: AssetStatus
  invoice_image_url?: string
  created_at: string
  // Joined fields
  employee?: Employee
}

export interface CustodyEvent {
  id: string
  org_id: string
  asset_id: string
  event_type: CustodyEventType
  from_employee_id?: string
  to_employee_id?: string
  event_hash: string
  solana_signature?: string
  occurred_at: string
  // Joined
  asset?: Asset
  from_employee?: Employee
  to_employee?: Employee
}

export interface SaasEvent {
  id: string
  org_id: string
  employee_id: string
  action: 'Deprovisioned' | 'ProvisionFailed'
  service: string
  performed_at: string
  event_hash?: string
  solana_signature?: string
  details?: Record<string, unknown>
}

export interface DashboardMetrics {
  totalAssets: number
  assignedAssets: number
  availableAssets: number
  totalValue: number
  orphanSeats: number
  expiringSoon: number
  onChainEvents: number
  activeEmployees: number
  newAssetsThisMonth: number
  offboardedThisMonth: number
  plan: {
    name: string
    assetLimit: number
    employeeLimit: number
    subscriptionStatus: string | null
    trialEndsAt: string | null
    currentPeriodEnd: string | null
  }
}

export interface ExtractedAsset {
  merchant: string
  item_name: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  category: AssetCategory
  warranty_period_months?: number
}
