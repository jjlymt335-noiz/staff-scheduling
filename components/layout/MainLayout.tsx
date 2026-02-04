'use client'

import { useState, useEffect } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ds-bg-page)]">
      {/* Top Bar */}
      <TopBar onToggleSidebar={toggleSidebar} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main
        className={`
          pt-[var(--ds-topbar-height)]
          transition-all duration-[var(--ds-transition-normal)]
          ${sidebarOpen ? 'md:ml-[var(--ds-sidebar-width)]' : 'md:ml-0'}
        `}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
