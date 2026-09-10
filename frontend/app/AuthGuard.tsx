"use client"

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Public routes that don't require auth
  const publicPaths = ['/signin', '/signup']

  useEffect(() => {
    if (loading) return
    if (!user) {
      // If current path is public, don't redirect
      if (publicPaths.some(p => pathname?.startsWith(p))) return
      // Otherwise send to signin
      router.replace('/signin')
    }
  }, [user, loading, pathname, router])

  // While loading, render nothing to avoid flicker
  if (loading) return null

  return <>{children}</>
}
