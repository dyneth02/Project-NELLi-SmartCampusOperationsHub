import clsx from 'clsx'

/**
 * @typedef {'sm' | 'md' | 'lg' | 'xl'} SpinnerSize
 */

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'text-primary',
  fullScreen = false,
  text,
  className,
}) {
  const spinner = (
    <div
      className={clsx('inline-flex flex-col items-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg
        className={clsx('animate-spin', sizeClasses[size] ?? sizeClasses.md, color)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden
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
      {text ? (
        <p className="text-sm text-[var(--text-secondary)]">{text}</p>
      ) : null}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-[2px]">
        {spinner}
      </div>
    )
  }

  return spinner
}
