'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      options,
      placeholder,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[var(--ds-font-size-sm)] font-medium text-[var(--ds-text-primary)]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            h-9 px-3
            bg-[var(--ds-bg-card)]
            border rounded-[var(--ds-radius-sm)]
            text-[var(--ds-font-size-md)] text-[var(--ds-text-primary)]
            transition-all duration-[var(--ds-transition-fast)]
            appearance-none
            cursor-pointer
            ${error
              ? 'border-[var(--ds-status-error)] focus:border-[var(--ds-status-error)]'
              : 'border-[var(--ds-border-default)] focus:border-[var(--ds-border-focused)]'
            }
            focus:outline-none focus:ring-2 focus:ring-[var(--ds-border-focused)] focus:ring-opacity-30
            disabled:bg-[var(--ds-bg-disabled)] disabled:text-[var(--ds-text-disabled)] disabled:cursor-not-allowed
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235E6C84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: '36px',
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select'
