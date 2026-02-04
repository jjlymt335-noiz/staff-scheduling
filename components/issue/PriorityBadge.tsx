'use client'

interface PriorityBadgeProps {
  priority: number
  size?: 'sm' | 'md'
}

const priorityConfig = [
  { label: 'P0', fullLabel: '最高', color: '#FF5630' },
  { label: 'P1', fullLabel: '高', color: '#FF7452' },
  { label: 'P2', fullLabel: '中', color: '#FFAB00' },
  { label: 'P3', fullLabel: '低', color: '#36B37E' },
  { label: 'P4', fullLabel: '较低', color: '#00B8D9' },
  { label: 'P5', fullLabel: '最低', color: '#6B778C' },
]

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig[5]

  const sizeStyles = {
    sm: 'text-[11px] px-1.5 py-0.5 min-w-[28px]',
    md: 'text-[12px] px-2 py-1 min-w-[32px]',
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-[var(--ds-radius-sm)]
        font-semibold
        ${sizeStyles[size]}
      `}
      style={{
        backgroundColor: config.color,
        color: '#FFFFFF'
      }}
      title={`优先级: ${config.fullLabel}`}
    >
      {config.label}
    </span>
  )
}
