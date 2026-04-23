import { forwardRef, useId, useState } from 'react'
import clsx from 'clsx'
import { FiEye, FiEyeOff } from 'react-icons/fi'

const Input = forwardRef(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      value,
      onChange,
      onBlur,
      error,
      helperText,
      required = false,
      disabled = false,
      icon = null,
      iconPosition = 'left',
      className,
      inputClassName,
      id: idProp,
      ...rest
    },
    ref,
  ) => {
    const reactId = useId()
    const inputId = idProp ?? `input-${name ?? reactId}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const describedBy = [error ? errorId : null, helperText && !error ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined

    const padLeft = icon && iconPosition === 'left'
    const padRight = isPassword || (icon && iconPosition === 'right')

    const inputClasses = clsx(
      'w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
      'text-[var(--text-primary)] py-3 rounded-lg',
      'focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20',
      'transition-all duration-200 outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error &&
        'border-status-error focus:border-status-error focus:ring-status-error/20',
      padLeft ? 'pl-11' : 'pl-4',
      padRight ? 'pr-11' : 'pr-4',
      inputClassName,
    )

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
            {required && (
              <span className="ml-1 text-status-error" aria-hidden>
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={inputClasses}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            {...rest}
          />

          {icon && iconPosition === 'right' && !isPassword && (
            <div
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            >
              {icon}
            </div>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-status-error" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
