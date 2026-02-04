'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CodeBadge } from './CodeBadge'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'
import { AssigneeAvatar } from './AssigneeAvatar'

interface User {
  id: string
  name: string
  color?: string
}

interface IssueRowProps {
  id: string
  code?: string
  title: string
  type: 'project' | 'requirement' | 'task'
  priority?: number
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  assignees?: User[]
  startDate?: string | Date | null
  endDate?: string | Date | null
  href?: string
  children?: React.ReactNode
  expandable?: boolean
  defaultExpanded?: boolean
  indent?: number
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function IssueRow({
  id,
  code,
  title,
  type,
  priority,
  status,
  assignees = [],
  startDate,
  endDate,
  href,
  children,
  expandable = false,
  defaultExpanded = false,
  indent = 0,
}: IssueRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const hasChildren = Boolean(children)

  const content = (
    <div
      className={`
        group flex items-center gap-3 px-4 py-2.5
        border-b border-[var(--ds-border-default)]
        bg-[var(--ds-bg-card)]
        hover:bg-[var(--ds-bg-hover)]
        transition-colors cursor-pointer
      `}
      style={{ paddingLeft: `${16 + indent * 24}px` }}
    >
      {/* Expand Toggle */}
      {expandable && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={`
            w-5 h-5 flex items-center justify-center
            text-[var(--ds-text-secondary)]
            hover:text-[var(--ds-text-primary)]
            hover:bg-[var(--ds-bg-selected)]
            rounded-[var(--ds-radius-sm)]
            transition-all
            ${hasChildren ? '' : 'invisible'}
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Type Icon */}
      <div className="flex-shrink-0">
        {type === 'project' && (
          <div className="w-5 h-5 rounded bg-[var(--ds-brand-primary)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </div>
        )}
        {type === 'requirement' && (
          <div className="w-5 h-5 rounded bg-[var(--ds-status-success)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        )}
        {type === 'task' && (
          <div className="w-5 h-5 rounded bg-[var(--ds-status-info)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Code */}
      {code && (
        <div className="flex-shrink-0">
          <CodeBadge code={code} type={type} />
        </div>
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="text-[var(--ds-text-primary)] text-[var(--ds-font-size-md)] truncate block">
          {title}
        </span>
      </div>

      {/* Priority */}
      {priority !== undefined && (
        <div className="flex-shrink-0">
          <PriorityBadge priority={priority} />
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="flex-shrink-0">
          <StatusBadge status={status} />
        </div>
      )}

      {/* Dates */}
      <div className="flex-shrink-0 w-24 text-right">
        <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
      </div>

      {/* Assignees */}
      <div className="flex-shrink-0 w-24 flex justify-end">
        <AssigneeAvatar users={assignees} size="sm" />
      </div>
    </div>
  )

  return (
    <>
      {href ? (
        <Link href={href} className="block hover:no-underline">
          {content}
        </Link>
      ) : (
        content
      )}
      {isExpanded && hasChildren && (
        <div className="bg-[var(--ds-bg-page)]">
          {children}
        </div>
      )}
    </>
  )
}
