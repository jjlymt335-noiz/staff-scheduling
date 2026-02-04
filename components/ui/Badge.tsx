'use client'

import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'
type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)]',
  success: 'bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success)]',
  warning: 'bg-[var(--ds-status-warning-bg)] text-[#974F0C]',
  error: 'bg-[var(--ds-status-error-bg)] text-[var(--ds-status-error)]',
  info: 'bg-[var(--ds-status-info-bg)] text-[var(--ds-brand-primary)]',
  primary: 'bg-[var(--ds-brand-primary)] text-[var(--ds-text-inverse)]',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[var(--ds-font-size-xs)]',
  md: 'px-2 py-1 text-[var(--ds-font-size-sm)]',
}

export function Badge({
  variant = 'default',
  size = 'sm',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        font-medium
        rounded-[var(--ds-radius-sm)]
        whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
