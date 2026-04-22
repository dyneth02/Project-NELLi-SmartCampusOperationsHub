import { forwardRef } from 'react'
import clsx from 'clsx'

const Card = forwardRef(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hover = false,
      onClick,
      onKeyDown: onKeyDownProp,
      className,
      role,
      tabIndex,
      ...rest
    },
    ref,
  ) => {
    const isClickable = typeof onClick === 'function'

    const baseClasses =
      'rounded-xl bg-[var(--bg-card)] transition-all duration-300'

    const variantClasses = {
      default: 'border border-[var(--border-default)] shadow-card',
      glow: 'relative overflow-hidden border border-[var(--border-accent)] shadow-glow-sm',
      bordered: 'border-2 border-[var(--border-default)]',
    }

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const classes = clsx(
      baseClasses,
      variantClasses[variant],
      paddingClasses[padding],
      hover &&
        'hover:-translate-y-1 hover:border-[var(--border-accent)] hover:shadow-card-hover',
      isClickable && 'cursor-pointer',
      className,
    )

    return (
      <div
        ref={ref}
        className={classes}
        role={role ?? (isClickable ? 'button' : undefined)}
        tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
        {...rest}
        onClick={onClick}
        onKeyDown={
          isClickable
            ? (e) => {
                onKeyDownProp?.(e)
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick?.(e)
                }
              }
            : onKeyDownProp
        }
      >
        {variant === 'glow' && (
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-40"
            aria-hidden
          />
        )}
        {variant === 'glow' ? (
          <div className="relative z-10">{children}</div>
        ) : (
          children
        )}
      </div>
    )
  },
)

Card.displayName = 'Card'

export default Card
