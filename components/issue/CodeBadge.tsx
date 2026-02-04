'use client'

interface CodeBadgeProps {
  code: string
  type?: 'project' | 'requirement' | 'task'
  size?: 'sm' | 'md'
}

const typeConfig = {
  project: {
    bgColor: 'var(--ds-status-info-bg)',
    textColor: 'var(--ds-brand-primary)',
  },
  requirement: {
    bgColor: 'var(--ds-status-success-bg)',
    textColor: 'var(--ds-status-success)',
  },
  task: {
    bgColor: 'var(--ds-status-warning-bg)',
    textColor: '#974F0C',
  },
}

export function CodeBadge({ code, type = 'task', size = 'sm' }: CodeBadgeProps) {
  const config = typeConfig[type]

  const sizeStyles = {
    sm: 'text-[var(--ds-font-size-xs)] px-1.5 py-0.5',
    md: 'text-[var(--ds-font-size-sm)] px-2 py-1',
  }

  return (
    <span
      className={`
        inline-flex items-center
        rounded-[var(--ds-radius-sm)]
        font-mono font-medium
        whitespace-nowrap
        ${sizeStyles[size]}
      `}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      {code}
    </span>
  )
}
