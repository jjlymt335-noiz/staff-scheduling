'use client'

interface PriorityBadgeProps {
  priority: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const priorityConfig = [
  { label: '最高', color: 'var(--ds-priority-highest)', icon: '⬆⬆' },
  { label: '高', color: 'var(--ds-priority-high)', icon: '⬆' },
  { label: '中', color: 'var(--ds-priority-medium)', icon: '➡' },
  { label: '低', color: 'var(--ds-priority-low)', icon: '⬇' },
  { label: '最低', color: 'var(--ds-priority-lowest)', icon: '⬇⬇' },
  { label: '无', color: 'var(--ds-text-disabled)', icon: '—' },
]

export function PriorityBadge({ priority, showLabel = false, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig[5]

  const sizeStyles = {
    sm: 'text-[var(--ds-font-size-sm)] px-1.5 py-0.5',
    md: 'text-[var(--ds-font-size-md)] px-2 py-1',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-[var(--ds-radius-sm)]
        font-medium
        ${sizeStyles[size]}
      `}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color
      }}
      title={`优先级: ${config.label}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
