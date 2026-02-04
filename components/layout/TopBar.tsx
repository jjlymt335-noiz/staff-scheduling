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
        flex items-center justify-between
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

        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-2 text-[var(--ds-text-inverse)] hover:no-underline">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.59 5.53L5.1 12H19.9L13.41 5.53C12.63 4.76 12.37 4.76 11.59 5.53Z" />
            <path d="M5.1 12L11.59 18.47C12.37 19.24 12.63 19.24 13.41 18.47L19.9 12H5.1Z" opacity="0.7" />
          </svg>
          <span className="font-semibold text-[var(--ds-font-size-lg)]">任务管理</span>
        </Link>
      </div>

      {/* Center Section - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="搜索..."
            className="
              w-full h-8 pl-9 pr-4
              bg-white/10
              border border-transparent
              rounded-[var(--ds-radius-sm)]
              text-[var(--ds-text-inverse)] text-[var(--ds-font-size-sm)]
              placeholder:text-white/60
              focus:bg-white focus:text-[var(--ds-text-primary)]
              focus:placeholder:text-[var(--ds-text-disabled)]
              focus:outline-none
              transition-all
            "
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Add Button */}
        <button
          className="
            p-2 rounded-[var(--ds-radius-sm)]
            text-[var(--ds-text-inverse)]
            hover:bg-white/10
            transition-colors
          "
          aria-label="Create new"
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* User Avatar */}
        <button
          className="
            w-8 h-8
            rounded-full
            bg-[var(--ds-status-info)]
            text-[var(--ds-text-inverse)]
            text-[var(--ds-font-size-sm)] font-medium
            flex items-center justify-center
            hover:ring-2 hover:ring-white/30
            transition-all
          "
          aria-label="User menu"
        >
          U
        </button>
      </div>
    </header>
  )
}
