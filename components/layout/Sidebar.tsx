'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  type?: 'view' | 'action'
}

const viewItems: NavItem[] = [
  {
    href: '/projects',
    label: '项目视图',
    type: 'view',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/team',
    label: '团队视图',
    type: 'view',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: '日历视图',
    type: 'view',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

const actionItems: NavItem[] = [
  {
    href: '/project/new',
    label: '添加项目',
    type: 'action',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
  },
  {
    href: '/requirement/new',
    label: '添加需求',
    type: 'action',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    href: '/manage',
    label: '添加任务',
    type: 'action',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/setup',
    label: '添加成员',
    type: 'action',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--ds-bg-overlay)] z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-[var(--ds-topbar-height)] left-0 bottom-0 z-30
          w-[var(--ds-sidebar-width)]
          bg-[var(--ds-bg-card)]
          border-r border-[var(--ds-border-default)]
          transform transition-transform duration-[var(--ds-transition-normal)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-0'}
          overflow-hidden
        `}
      >
        <nav className="h-full flex flex-col py-3">
          {/* 视图区域 */}
          <div className="px-3 mb-2">
            <div className="text-[10px] font-semibold text-[var(--ds-text-disabled)] uppercase tracking-wider px-3 mb-2">
              视图
            </div>
            <div className="space-y-0.5">
              {viewItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2
                      rounded-[var(--ds-radius-md)]
                      text-[13px]
                      transition-all duration-150
                      hover:no-underline
                      ${isActive
                        ? 'bg-[var(--ds-bg-selected)] text-[var(--ds-brand-primary)] font-medium'
                        : 'text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]'
                      }
                    `}
                  >
                    <span className={isActive ? 'text-[var(--ds-brand-primary)]' : 'text-[var(--ds-text-secondary)]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="mx-3 my-2 border-t border-[var(--ds-border-default)]" />

          {/* 操作区域 */}
          <div className="px-3">
            <div className="text-[10px] font-semibold text-[var(--ds-text-disabled)] uppercase tracking-wider px-3 mb-2">
              快捷操作
            </div>
            <div className="space-y-0.5">
              {actionItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2
                      rounded-[var(--ds-radius-md)]
                      text-[13px]
                      transition-all duration-150
                      hover:no-underline
                      ${isActive
                        ? 'bg-[var(--ds-bg-selected)] text-[var(--ds-brand-primary)] font-medium'
                        : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-hover)] hover:text-[var(--ds-text-primary)]'
                      }
                    `}
                  >
                    <span className={isActive ? 'text-[var(--ds-brand-primary)]' : 'text-[var(--ds-text-disabled)]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}
