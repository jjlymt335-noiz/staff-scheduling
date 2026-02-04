'use client'

interface User {
  id: string
  name: string
  color?: string
}

interface AssigneeAvatarProps {
  users: User[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: { wrapper: 'w-6 h-6 text-[10px]', offset: '-ml-1.5' },
  md: { wrapper: 'w-8 h-8 text-[var(--ds-font-size-xs)]', offset: '-ml-2' },
  lg: { wrapper: 'w-10 h-10 text-[var(--ds-font-size-sm)]', offset: '-ml-2.5' },
}

const colors = [
  '#0052CC', // Blue
  '#36B37E', // Green
  '#FF5630', // Red
  '#FFAB00', // Yellow
  '#6554C0', // Purple
  '#00B8D9', // Cyan
  '#FF8B00', // Orange
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return name.charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getColorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function AssigneeAvatar({ users, max = 3, size = 'md' }: AssigneeAvatarProps) {
  const displayUsers = users.slice(0, max)
  const remainingCount = users.length - max
  const styles = sizeStyles[size]

  if (users.length === 0) {
    return (
      <div
        className={`
          ${styles.wrapper}
          rounded-full
          bg-[var(--ds-bg-hover)]
          border-2 border-dashed border-[var(--ds-border-default)]
          flex items-center justify-center
          text-[var(--ds-text-disabled)]
        `}
        title="未分配"
      >
        ?
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {displayUsers.map((user, index) => (
        <div
          key={user.id}
          className={`
            ${styles.wrapper}
            ${index > 0 ? styles.offset : ''}
            rounded-full
            border-2 border-[var(--ds-bg-card)]
            flex items-center justify-center
            font-medium text-[var(--ds-text-inverse)]
            cursor-pointer
            hover:z-10 hover:ring-2 hover:ring-[var(--ds-border-focused)]
            transition-all
          `}
          style={{
            backgroundColor: user.color || getColorForUser(user.id),
            zIndex: displayUsers.length - index
          }}
          title={user.name}
        >
          {getInitials(user.name)}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${styles.wrapper}
            ${styles.offset}
            rounded-full
            bg-[var(--ds-bg-hover)]
            border-2 border-[var(--ds-bg-card)]
            flex items-center justify-center
            font-medium text-[var(--ds-text-secondary)]
          `}
          style={{ zIndex: 0 }}
          title={`还有 ${remainingCount} 人`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
