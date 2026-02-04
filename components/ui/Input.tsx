'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--ds-font-size-sm)] font-medium text-[var(--ds-text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            h-9 px-3
            bg-[var(--ds-bg-card)]
            border rounded-[var(--ds-radius-sm)]
            text-[var(--ds-font-size-md)] text-[var(--ds-text-primary)]
            placeholder:text-[var(--ds-text-disabled)]
            transition-all duration-[var(--ds-transition-fast)]
            ${error
              ? 'border-[var(--ds-status-error)] focus:border-[var(--ds-status-error)]'
              : 'border-[var(--ds-border-default)] focus:border-[var(--ds-border-focused)]'
            }
            focus:outline-none focus:ring-2 focus:ring-[var(--ds-border-focused)] focus:ring-opacity-30
            disabled:bg-[var(--ds-bg-disabled)] disabled:text-[var(--ds-text-disabled)] disabled:cursor-not-allowed
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-status-error)]">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
