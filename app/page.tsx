'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否有用户
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const users = await response.json()

        if (users.length > 0) {
          router.push('/team')
        } else {
          router.push('/setup')
        }
      } catch (error) {
        // 如果出错，默认跳转到setup页面
        router.push('/setup')
      }
    }

    checkUsers()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">加载中...</div>
    </div>
  )
}
