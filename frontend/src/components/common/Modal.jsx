import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import clsx from 'clsx'
import gsap from 'gsap'

/**
 * @typedef {'sm' | 'md' | 'lg' | 'xl' | 'full'} ModalSize
 */

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
}) => {
  const overlayRef = useRef(null)
  const contentRef = useRef(null)
  const focusableElementsRef = useRef([])
  const previouslyFocusedRef = useRef(null)

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  // Entrance/exit animations
  useEffect(() => {
    if (!isOpen) return

    const overlay = overlayRef.current
    const content = contentRef.current
    if (!overlay || !content) return

    // Store previously focused element
    previouslyFocusedRef.current = document.activeElement

    // Animate overlay fade in
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 })

    // Animate modal content entrance
    gsap.fromTo(
      content,
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' },
    )

    // Focus the first focusable element
    requestAnimationFrame(() => {
      const focusable = content.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      focusableElementsRef.current = Array.from(focusable)
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    })

    // Cleanup: restore focus on close
    return () => {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [isOpen])

  // Exit animation
  useEffect(() => {
    if (isOpen) return

    const overlay = overlayRef.current
    const content = contentRef.current
    if (!overlay || !content) return

    const tl = gsap.timeline({
      onComplete: () => {
        // Animation complete
      },
    })

    tl.to(content, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.2,
      ease: 'power2.in',
    }).to(
      overlay,
      {
        opacity: 0,
        duration: 0.2,
      },
      '-=0.1',
    )
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const content = contentRef.current
    if (!content) return

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      const focusableElements = focusableElementsRef.current
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab: if on first element, wrap to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // Tab: if on last element, wrap to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleOverlayClick = useCallback(
    (e) => {
      if (closeOnOverlayClick && e.target === overlayRef.current) {
        onClose()
      }
    },
    [closeOnOverlayClick, onClose],
  )

  if (!isOpen) return null

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={contentRef}
        className={clsx(
          'bg-[var(--bg-card)] rounded-2xl shadow-card-hover border border-[var(--border-default)] w-full',
          sizeClasses[size],
          'max-h-[90vh] flex flex-col',
          className,
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            {title && (
              <h2
                id="modal-title"
                className="text-2xl font-display font-bold text-[var(--text-primary)]"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                aria-label="Close modal"
              >
                <FiX size={24} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[var(--border-subtle)] p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default Modal
