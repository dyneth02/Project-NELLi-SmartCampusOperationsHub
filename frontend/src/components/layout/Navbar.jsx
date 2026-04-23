import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSettings,
  FiHash,
  FiSun,
  FiUser,
  FiX,
} from 'react-icons/fi'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useClickOutside } from '../../hooks/useClickOutside.js'
import { useFadeIn } from '../../hooks/useAnimations.js'
import { useNotifications } from '../../hooks/useNotifications.js'
import { useScrollPosition } from '../../hooks/useScrollPosition.js'
import Button from '../common/Button.jsx'

export default function Navbar({ transparent = false, fixed = true }) {
  const { isAuthenticated, user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { scrolled } = useScrollPosition(20)
  const { unreadCount } = useNotifications()

  const { ref: navAnimRef } = useFadeIn({ duration: 0.8, y: -50 })

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const userMenuRef = useRef(null)

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), [])
  useClickOutside(userMenuRef, closeUserMenu, userMenuOpen)

  useEffect(() => {
    const id = window.setTimeout(() => setMobileMenuOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogoClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
  }, [logout])

  const isAdmin = user?.role === 'ADMIN'

  const navLinks = isAuthenticated
    ? isAdmin
      ? [
          { name: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
          { name: 'Facilities', path: '/admin/facilities', icon: FiGrid },
          { name: 'Bookings', path: '/admin/bookings', icon: FiCalendar },
          { name: 'Tickets', path: '/admin/tickets', icon: FiAlertCircle },
        ]
      : [
          { name: 'Dashboard', path: '/dashboard', icon: FiHome },
          { name: 'Facilities', path: '/facilities', icon: FiGrid },
          { name: 'My Bookings', path: '/bookings', icon: FiCalendar },
          { name: 'Tickets', path: '/tickets', icon: FiAlertCircle },
        ]
    : []

  const showGlass = !transparent || scrolled

  const navbarClasses = clsx(
    'w-full transition-all duration-300',
    fixed && 'fixed top-0 left-0 right-0 z-50',
    showGlass
      ? 'border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl'
      : 'bg-transparent',
  )

  const badgeText =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <nav ref={navAnimRef} className={navbarClasses} aria-label="Main navigation">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {!isAdmin && (
            <Link
              to="/"
              onClick={handleLogoClick}
              className="group flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent transition-all duration-300 group-hover:shadow-glow-md">
                <span>
                  <img src="/nelli-logo.png"></img>
                </span>
              </div>
              <span className="font-display text-xl font-bold text-gradient">
                NELLi
              </span>
            </Link>
          )}

          <div className="hidden items-center gap-8 lg:flex">
            {isAuthenticated && (
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    <link.icon size={18} aria-hidden />
                    <span>{link.name}</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-pressed={isDark}
              >
                {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
              </button>

              {isAuthenticated ? (
                <>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate('/notifications')}
                      className="relative rounded-lg p-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                      aria-label="Notifications"
                    >
                      <FiBell size={20} aria-hidden />
                      {badgeText && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-error px-1 text-xs font-bold text-white">
                          {badgeText}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      aria-label="User menu"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent">
                        <span className="text-sm font-semibold text-black">
                          {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </button>

                    {userMenuOpen && (
                      <div
                        className="animate-fade-in absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-card-hover"
                        role="menu"
                      >
                        <div className="border-b border-[var(--border-subtle)] p-4">
                          <p className="font-semibold text-[var(--text-primary)]">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
                        </div>
                        <div className="p-2">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                            onClick={() => {
                              navigate('/profile')
                              setUserMenuOpen(false)
                            }}
                          >
                            <FiUser size={18} aria-hidden />
                            <span>Profile</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                            onClick={() => {
                              navigate('/bookings/verify')
                              setUserMenuOpen(false)
                            }}
                          >
                            <FiHash size={18} aria-hidden />
                            <span>QR Code Check-in</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-card-hover)]"
                            onClick={() => {
                              navigate('/settings')
                              setUserMenuOpen(false)
                            }}
                          >
                            <FiSettings size={18} aria-hidden />
                            <span>Settings</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-status-error transition-colors hover:bg-status-error/10"
                            onClick={handleLogout}
                          >
                            <FiLogOut size={18} aria-hidden />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" type="button" onClick={() => navigate('/login')}>
                    Login
                  </Button>
                  <Button variant="primary" type="button" onClick={() => navigate('/register')}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-card-hover)] lg:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="mobile-nav-menu"
            className="animate-slide-up relative z-50 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] lg:hidden"
          >
            <div className="container-custom space-y-2 py-4">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Menu</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-lg p-2 hover:bg-[var(--bg-card-hover)]"
                  aria-label="Toggle theme"
                >
                  {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                </button>
              </div>
              {isAuthenticated && (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon size={20} aria-hidden />
                      <span>{link.name}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
                    onClick={() => {
                      navigate('/notifications')
                      setMobileMenuOpen(false)
                    }}
                  >
                    <FiBell size={20} aria-hidden />
                    <span>Notifications</span>
                    {badgeText && (
                      <span className="ml-auto rounded-full bg-status-error px-2 py-0.5 text-xs font-bold text-white">
                        {badgeText}
                      </span>
                    )}
                  </button>
                  <hr className="border-[var(--border-subtle)]" />
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiUser size={20} aria-hidden />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/bookings/verify"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiHash size={20} aria-hidden />
                    <span>QR Code Check-in</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiSettings size={20} aria-hidden />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-status-error transition-colors hover:bg-status-error/10"
                    onClick={handleLogout}
                  >
                    <FiLogOut size={20} aria-hidden />
                    <span>Logout</span>
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <div className="space-y-2 px-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    type="button"
                    onClick={() => {
                      navigate('/login')
                      setMobileMenuOpen(false)
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    type="button"
                    onClick={() => {
                      navigate('/register')
                      setMobileMenuOpen(false)
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
