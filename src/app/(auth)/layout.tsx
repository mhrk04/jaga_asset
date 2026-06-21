"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'

interface User {
  email: string
  role?: string
}

export default function AuthProxy({ children }: { children: React.ReactNode }) {
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
        }
      } catch {
        setUser(null)
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

  if (user && (pathname.startsWith('/auth') || pathname === '/login')) {
    window.location.href = '/dashboard'
    return null
  }

  return <>{children}</>
}
