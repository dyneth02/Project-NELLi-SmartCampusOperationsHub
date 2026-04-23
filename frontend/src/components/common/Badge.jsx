import clsx from 'clsx'

/**
 * @typedef {'success' | 'warning' | 'error' | 'info' | 'default'} BadgeVariant
 * @typedef {'sm' | 'md' | 'lg'} BadgeSize
 */

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon = null,
  className,
}) {
  const baseClasses =
    'inline-flex items-center gap-1.5 rounded-full font-medium border'

  const variantClasses = {
    success:
      'border-status-success/20 bg-status-success/10 text-status-success',
    warning:
      'border-status-warning/20 bg-status-warning/10 text-status-warning',
    error: 'border-status-error/20 bg-status-error/10 text-status-error',
    info: 'border-status-info/20 bg-status-info/10 text-status-info',
    default:
      'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  return (
    <span className={classes}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
