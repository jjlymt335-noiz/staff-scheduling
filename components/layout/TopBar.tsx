'use client'

import Link from 'next/link'

interface TopBarProps {
  onToggleSidebar?: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-40
        h-[var(--ds-topbar-height)]
        bg-[var(--ds-brand-bold)]
        shadow-[var(--ds-shadow-raised)]
        flex items-center
        px-4
      "
    >
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="
            p-2 rounded-[var(--ds-radius-sm)]
            text-[var(--ds-text-inverse)]
            hover:bg-white/10
            transition-colors
          "
          aria-label="Toggle sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Logo */}
        <Link href="/projects" className="flex items-center gap-2 text-[var(--ds-text-inverse)] hover:no-underline">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.59 5.53L5.1 12H19.9L13.41 5.53C12.63 4.76 12.37 4.76 11.59 5.53Z" />
            <path d="M5.1 12L11.59 18.47C12.37 19.24 12.63 19.24 13.41 18.47L19.9 12H5.1Z" opacity="0.7" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
