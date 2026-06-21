"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/ui/Spinner'

interface User {
  email: string
  role?: string
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          setUser(null)
          if (!pathname.startsWith('/auth') && pathname !== '/login') {
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
          }
        }
      } catch {
        setUser(null)
        if (!pathname.startsWith('/auth') && pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user && pathname.startsWith('/auth')) {
    return <>{children}</>
  }

  if (user && pathname.startsWith('/auth')) {
    window.location.href = '/dashboard'
    return null
  }

  if (user && !pathname.startsWith('/auth')) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="md:pl-64">
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-800 flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Sandbox mode</strong> — Use test card <code className="bg-amber-100 px-1 rounded text-xs font-mono">4242 4242 4242 4242</code> for any payment (not real credit card).</span>
          </div>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6 md:pt-8">
            {children}
          </main>
        </div>
      </div>
    )
  }

  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return null
}
