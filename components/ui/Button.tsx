'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--ds-brand-primary)] text-[var(--ds-text-inverse)]
    hover:bg-[var(--ds-brand-primary-hover)]
    active:bg-[var(--ds-brand-bold)]
    disabled:bg-[var(--ds-bg-disabled)] disabled:text-[var(--ds-text-disabled)]
  `,
  secondary: `
    bg-[var(--ds-bg-card)] text-[var(--ds-text-primary)]
    border border-[var(--ds-border-default)]
    hover:bg-[var(--ds-bg-hover)]
    active:bg-[var(--ds-bg-selected)]
    disabled:bg-[var(--ds-bg-disabled)] disabled:text-[var(--ds-text-disabled)]
  `,
  danger: `
    bg-[var(--ds-status-error)] text-[var(--ds-text-inverse)]
    hover:bg-[#E5492A]
    active:bg-[#C9372C]
    disabled:bg-[var(--ds-bg-disabled)] disabled:text-[var(--ds-text-disabled)]
  `,
  ghost: `
    bg-transparent text-[var(--ds-text-primary)]
    hover:bg-[var(--ds-bg-hover)]
    active:bg-[var(--ds-bg-selected)]
    disabled:text-[var(--ds-text-disabled)]
  `,
  link: `
    bg-transparent text-[var(--ds-text-link)]
    hover:underline
    disabled:text-[var(--ds-text-disabled)] disabled:no-underline
  `,
  outline: `
    bg-transparent text-[var(--ds-text-secondary)]
    border border-[var(--ds-text-disabled)]
    hover:bg-[var(--ds-bg-hover)] hover:text-[var(--ds-text-primary)]
    active:bg-[var(--ds-bg-selected)]
    disabled:text-[var(--ds-text-disabled)]
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[var(--ds-font-size-sm)]',
  md: 'h-9 px-4 text-[var(--ds-font-size-md)]',
  lg: 'h-10 px-5 text-[var(--ds-font-size-lg)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center
          font-medium
          rounded-[var(--ds-radius-sm)]
          transition-all duration-[var(--ds-transition-fast)]
          cursor-pointer
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
