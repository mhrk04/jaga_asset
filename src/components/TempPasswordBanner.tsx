'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TempPasswordBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.temp_password === true) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  const handleDismiss = async () => {
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { temp_password: false } })
    setVisible(false)
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-yellow-600">
            You&apos;re using a temporary password
          </p>
          <p className="text-xs text-yellow-600 mt-0.5">
            Go to <strong>Profile settings</strong> (sidebar or top-right menu) to set a new password.
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-yellow-600 hover:text-yellow-600 flex-shrink-0"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
