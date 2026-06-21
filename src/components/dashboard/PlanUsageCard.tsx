import { cn } from '@/lib/utils'

interface PlanUsageCardProps {
  assetLimit: number
  employeeLimit: number
  totalAssets: number
  activeEmployees: number
  planName: string
}

export default function PlanUsageCard({
  assetLimit,
  employeeLimit,
  totalAssets,
  activeEmployees,
  planName,
}: PlanUsageCardProps) {
  const assetPercent = Math.min((totalAssets / assetLimit) * 100, 100)
  const empPercent = Math.min((activeEmployees / employeeLimit) * 100, 100)

  return (
    <div className="bg-card rounded-md border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Plan Usage</h3>
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
          {planName}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Assets</span>
            <span className="text-foreground font-medium">{totalAssets} / {assetLimit}</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                assetPercent >= 90 ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${assetPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Employees</span>
            <span className="text-foreground font-medium">{activeEmployees} / {employeeLimit}</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                empPercent >= 90 ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${empPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
