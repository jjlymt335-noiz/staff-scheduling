'use client'

type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<TaskStatus, { label: string; bgColor: string; textColor: string }> = {
  NOT_STARTED: {
    label: '未开始',
    bgColor: 'var(--ds-bg-hover)',
    textColor: 'var(--ds-text-secondary)',
  },
  IN_PROGRESS: {
    label: '进行中',
    bgColor: 'var(--ds-status-info-bg)',
    textColor: 'var(--ds-brand-primary)',
  },
  COMPLETED: {
    label: '已完成',
    bgColor: 'var(--ds-status-success-bg)',
    textColor: 'var(--ds-status-success)',
  },
  BLOCKED: {
    label: '已阻塞',
    bgColor: 'var(--ds-status-error-bg)',
    textColor: 'var(--ds-status-error)',
  },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_STARTED

  const sizeStyles = {
    sm: 'text-[var(--ds-font-size-xs)] px-1.5 py-0.5',
    md: 'text-[var(--ds-font-size-sm)] px-2 py-1',
  }

  return (
    <span
      className={`
        inline-flex items-center
        rounded-[var(--ds-radius-sm)]
        font-medium
        whitespace-nowrap
        ${sizeStyles[size]}
      `}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {config.label}
    </span>
  )
}
