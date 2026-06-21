import Link from 'next/link'
import InvoiceUploadForm from '@/components/assets/InvoiceUploadForm'

export default function UploadPage() {
  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
        <Link href="/assets" className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-solana/10 rounded-xl border border-solana/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-solana-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Asset Scanner</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload an invoice, review extracted rows, then register to Solana.</p>
          </div>
        </div>
      </div>

      <InvoiceUploadForm />
    </div>
  )
}
