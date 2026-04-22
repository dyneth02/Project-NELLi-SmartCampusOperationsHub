import { forwardRef, useEffect, useId, useRef } from 'react'
import clsx from 'clsx'

const TextArea = forwardRef(
  (
    {
      label,
      name,
      placeholder,
      value,
      onChange,
      onBlur,
      error,
      helperText,
      required = false,
      disabled = false,
      rows = 4,
      maxLength,
      showCharCount = false,
      resize = 'vertical',
      autoResize = false,
      className,
      textareaClassName,
      id: idProp,
      ...rest
    },
    ref,
  ) => {
    const reactId = useId()
    const textareaId = idProp ?? `textarea-${name ?? reactId}`
    const errorId = `${textareaId}-error`
    const helperId = `${textareaId}-helper`

    const innerRef = useRef(null)
    const mergedRef = (node) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    useEffect(() => {
      if (!autoResize || !innerRef.current) return
      const el = innerRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [value, autoResize, rows])

    const describedBy = [error ? errorId : null, helperText && !error ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined

    const charCount = value?.length ?? 0

    const textareaClasses = clsx(
      'w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
      'text-[var(--text-primary)] px-4 py-3 rounded-lg',
      'focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20',
      'transition-all duration-200 outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error &&
        'border-status-error focus:border-status-error focus:ring-status-error/20',
      resize === 'none' && 'resize-none',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      autoResize && 'resize-none overflow-hidden',
      textareaClassName,
    )

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={mergedRef}
          id={textareaId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
          className={textareaClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {error && (
              <p id={errorId} className="text-sm text-status-error" role="alert">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="text-sm text-[var(--text-muted)]">
                {helperText}
              </p>
            )}
          </div>

          {showCharCount && maxLength != null && (
            <p
              className={clsx(
                'shrink-0 text-sm',
                charCount > maxLength * 0.9
                  ? 'text-status-warning'
                  : 'text-[var(--text-muted)]',
              )}
              aria-live="polite"
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  },
)

TextArea.displayName = 'TextArea'

export default TextArea
