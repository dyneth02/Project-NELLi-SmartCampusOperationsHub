import { forwardRef, useState, useRef, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { FiChevronDown } from 'react-icons/fi'
import gsap from 'gsap'

const Select = forwardRef(
  (
    {
      label,
      name,
      value,
      onChange,
      options = [],
      placeholder = 'Select an option',
      error,
      required = false,
      disabled = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const selectRef = useRef(null)
    const listRef = useRef(null)
    const optionRefs = useRef([])
    const selectId = `select-${name}`

    const selectedOption = options.find((opt) => opt.value === value)

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (selectRef.current && !selectRef.current.contains(event.target)) {
          setIsOpen(false)
          setFocusedIndex(-1)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    // Dropdown animation
    useEffect(() => {
      if (!isOpen || !listRef.current) return

      gsap.fromTo(
        listRef.current,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
      )
    }, [isOpen])

    useEffect(() => {
      if (isOpen || !listRef.current) return

      gsap.to(listRef.current, {
        opacity: 0,
        y: -8,
        duration: 0.15,
        ease: 'power2.in',
      })
    }, [isOpen])

    // Close on Escape
    useEffect(() => {
      if (!isOpen) return

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
          setFocusedIndex(-1)
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen])

    const handleToggle = useCallback(() => {
      if (!disabled) {
        setIsOpen((prev) => !prev)
        setFocusedIndex(0)
      }
    }, [disabled])

    const handleSelect = useCallback(
      (option) => {
        if (option.disabled) return
        onChange?.(option.value)
        setIsOpen(false)
        setFocusedIndex(-1)
      },
      [onChange],
    )

    const handleKeyDown = useCallback(
      (e) => {
        if (!isOpen) {
          // Open dropdown on arrow keys, Enter, or Space
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault()
            setIsOpen(true)
            setFocusedIndex(0)
          }
          return
        }

        const focusableOptions = optionRefs.current.filter(Boolean)

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setFocusedIndex((prev) => {
              const next = prev < focusableOptions.length - 1 ? prev + 1 : 0
              focusableOptions[next]?.focus()
              return next
            })
            break

          case 'ArrowUp':
            e.preventDefault()
            setFocusedIndex((prev) => {
              const next = prev > 0 ? prev - 1 : focusableOptions.length - 1
              focusableOptions[next]?.focus()
              return next
            })
            break

          case 'Enter':
          case ' ':
            e.preventDefault()
            if (focusedIndex >= 0 && options[focusedIndex]) {
              handleSelect(options[focusedIndex])
            }
            break

          case 'Home':
            e.preventDefault()
            setFocusedIndex(0)
            focusableOptions[0]?.focus()
            break

          case 'End':
            e.preventDefault()
            setFocusedIndex(focusableOptions.length - 1)
            focusableOptions[focusableOptions.length - 1]?.focus()
            break

          default:
            // Type-ahead: match characters
            if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
              e.preventDefault()
              const matchedIndex = options.findIndex((opt) =>
                opt.label?.toLowerCase().startsWith(e.key.toLowerCase()),
              )
              if (matchedIndex !== -1) {
                setFocusedIndex(matchedIndex)
                optionRefs.current[matchedIndex]?.focus()
              }
            }
            break
        }
      },
      [isOpen, focusedIndex, options, handleSelect],
    )

    return (
      <div ref={selectRef} className={clsx('w-full', className)} onKeyDown={handleKeyDown}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            {label}
            {required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <button
            ref={(el) => {
              // Support both internal ref and forwarded ref
              selectRef.current = el
              if (typeof ref === 'function') ref(el)
              else if (ref) ref.current = el
            }}
            type="button"
            id={selectId}
            onClick={handleToggle}
            disabled={disabled}
            className={clsx(
              'w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
              'text-[var(--text-primary)] px-4 py-3 rounded-lg text-left',
              'focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200 outline-none',
              'flex items-center justify-between gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-status-error',
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            {...rest}
          >
            <span className={!selectedOption ? 'text-[var(--text-muted)]' : ''}>
              {selectedOption?.label || placeholder}
            </span>
            <FiChevronDown
              size={18}
              className={clsx(
                'transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </button>

          {isOpen && (
            <div
              ref={listRef}
              className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-card-hover overflow-hidden z-50 max-h-60 overflow-y-auto"
              role="listbox"
              aria-labelledby={selectId}
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  ref={(el) => (optionRefs.current[index] = el)}
                  type="button"
                  onClick={() => handleSelect(option)}
                  onFocus={() => setFocusedIndex(index)}
                  disabled={option.disabled}
                  className={clsx(
                    'w-full px-4 py-2.5 text-left transition-colors outline-none',
                    option.value === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card-hover)]',
                    option.disabled && 'opacity-50 cursor-not-allowed',
                  )}
                  role="option"
                  aria-selected={option.value === value}
                  tabIndex={index === focusedIndex ? 0 : -1}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'

export default Select
