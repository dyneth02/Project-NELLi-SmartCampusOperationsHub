import { forwardRef } from 'react'
import clsx from 'clsx'
import { FiLoader } from 'react-icons/fi'

/**
 * @typedef {'primary' | 'secondary' | 'ghost' | 'danger' | 'success'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 */

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon = null,
      iconPosition = 'left',
      fullWidth = false,
      className,
      onClick,
      type = 'button',
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

    const variantClasses = {
      primary:
        'bg-gradient-accent text-black shadow-sm hover:shadow-glow-md focus-visible:ring-primary',
      secondary:
        'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-accent)] focus-visible:ring-primary',
      ghost:
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] focus-visible:ring-primary',
      danger:
        'bg-status-error text-white hover:bg-status-error/90 focus-visible:ring-status-error',
      success:
        'bg-status-success text-white hover:bg-status-success/90 focus-visible:ring-status-success',
    }

    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    const classes = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className,
    )

    const isDisabled = disabled || isLoading

    const content = (
      <>
        {isLoading && (
          <FiLoader className="animate-spin shrink-0" size={18} aria-hidden />
        )}
        {!isLoading && icon && iconPosition === 'left' && (
          <span className="inline-flex shrink-0" aria-hidden>
            {icon}
          </span>
        )}
        {children && <span className={clsx(isLoading && 'opacity-90')}>{children}</span>}
        {!isLoading && icon && iconPosition === 'right' && (
          <span className="inline-flex shrink-0" aria-hidden>
            {icon}
          </span>
        )}
      </>
    )

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isDisabled}
        onClick={onClick}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
