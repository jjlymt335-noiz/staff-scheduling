'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const users = await response.json()

        if (users.length > 0) {
          router.push('/projects')
        } else {
          router.push('/setup')
        }
      } catch (error) {
        router.push('/setup')
      }
    }

    checkUsers()
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--ds-brand-primary)] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    </div>
  )
}
