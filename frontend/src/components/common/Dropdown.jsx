import { useState, useRef, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import gsap from 'gsap'

/**
 * @typedef {Object} DropdownItem
 * @property {string} label - Display text
 * @property {function} [onClick] - Click handler
 * @property {React.ReactNode} [icon] - Optional icon
 * @property {boolean} [danger] - Danger styling flag
 * @property {boolean} [disabled] - Disabled state
 * @property {React.ReactNode} [divider] - Divider after item
 */

/**
 * @typedef {'left' | 'right' | 'center'} DropdownAlign
 */

const Dropdown = ({ trigger, items, align = 'left', className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)
  const itemRefs = useRef([])
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Menu entrance animation
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    gsap.fromTo(
      menuRef.current,
      { opacity: 0, y: -8, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
    )

    // Focus first item on open
    requestAnimationFrame(() => {
      if (itemRefs.current[0]) {
        itemRefs.current[0].focus()
      }
    })
  }, [isOpen])

  // Menu exit animation
  useEffect(() => {
    if (isOpen || !menuRef.current) return

    gsap.to(menuRef.current, {
      opacity: 0,
      y: -8,
      scale: 0.95,
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

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return

      const focusableItems = itemRefs.current.filter(Boolean)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = prev < focusableItems.length - 1 ? prev + 1 : 0
            focusableItems[next]?.focus()
            return next
          })
          break

        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : focusableItems.length - 1
            focusableItems[next]?.focus()
            return next
          })
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0 && items[focusedIndex]) {
            const item = items[focusedIndex]
            if (!item.disabled) {
              item.onClick?.()
              setIsOpen(false)
              setFocusedIndex(-1)
            }
          }
          break

        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          focusableItems[0]?.focus()
          break

        case 'End':
          e.preventDefault()
          setFocusedIndex(focusableItems.length - 1)
          focusableItems[focusableItems.length - 1]?.focus()
          break

        default:
          break
      }
    },
    [isOpen, focusedIndex, items],
  )

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  const handleItemClick = useCallback(
    (item) => {
      if (item.disabled) return
      item.onClick?.()
      setIsOpen(false)
      setFocusedIndex(-1)
    },
    [],
  )

  return (
    <div
      ref={dropdownRef}
      className={clsx('relative', className)}
      onKeyDown={handleKeyDown}
    >
      <div onClick={() => { setIsOpen((prev) => !prev); setFocusedIndex(0) }}>{trigger}</div>

      {isOpen && (
        <div
          ref={menuRef}
          className={clsx(
            'absolute top-full mt-2 min-w-[200px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-card-hover overflow-hidden z-50',
            alignClasses[align],
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-2">
            {items.map((item, index) => (
              <div key={index}>
                <button
                  ref={(el) => (itemRefs.current[index] = el)}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  onFocus={() => setFocusedIndex(index)}
                  disabled={item.disabled}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 transition-colors outline-none',
                    item.danger
                      ? 'text-status-error hover:bg-status-error/10 focus:bg-status-error/10'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card-hover)]',
                    item.disabled && 'opacity-50 cursor-not-allowed',
                    focusedIndex === index && 'bg-[var(--bg-card-hover)]',
                  )}
                  role="menuitem"
                  tabIndex={index === focusedIndex ? 0 : -1}
                >
                  {item.icon && (
                    <span className="flex-shrink-0" aria-hidden>
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </button>
                {item.divider && (
                  <div className="my-1 border-t border-[var(--border-subtle)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dropdown
