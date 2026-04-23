import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import {
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiHome,
  FiLogOut,
  FiSettings,
  FiUsers,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
  { name: 'Facilities', path: '/admin/facilities', icon: FiGrid },
  { name: 'Bookings', path: '/admin/bookings', icon: FiCalendar },
  { name: 'Tickets', path: '/admin/tickets', icon: FiAlertCircle },
  { name: 'Users', path: '/admin/users', icon: FiUsers },
  { name: 'Analytics', path: '/admin/analytics', icon: FiBarChart2 },
  { name: 'Settings', path: '/admin/settings', icon: FiSettings },
]

/**
 * @param {object} props
 * @param {boolean} props.collapsed
 * @param {() => void} props.onToggle
 * @param {boolean} [props.mobileOpen=false]
 * @param {() => void} [props.onMobileClose]
 * @param {string} [props.className]
 */
export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
  className,
}) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const widthClass = collapsed ? 'w-20' : 'w-64'

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close navigation menu"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] transition-all duration-300 md:sticky md:top-0 md:z-0',
          widthClass,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className,
        )}
        aria-label="Admin sidebar"
      >
        <div className="relative flex h-20 items-center justify-between border-b border-[var(--border-subtle)] px-4">
          {!collapsed && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2"
              onClick={() => onMobileClose?.()}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
                <span className="text-xl font-bold text-white">SC</span>
              </div>
              <span className="font-display text-lg font-bold text-gradient">Admin</span>
            </Link>
          )}
          {collapsed && (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
              <span className="text-xl font-bold text-white">SC</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6 scrollbar-hide">
          {navItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200',
                  active
                    ? 'bg-gradient-accent text-white shadow-glow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]',
                  collapsed && 'justify-center',
                )}
                onClick={() => onMobileClose?.()}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} className="shrink-0" aria-hidden />
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-[var(--border-subtle)] p-4">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-accent">
                <span className="font-semibold text-white">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--text-primary)]">
                  {user?.name || 'Admin'}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">{user?.role}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent">
              <span className="font-semibold text-white">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              logout()
              onMobileClose?.()
            }}
            title={collapsed ? 'Logout' : undefined}
            className={clsx(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-status-error transition-colors hover:bg-status-error/10',
              collapsed && 'justify-center',
            )}
          >
            <FiLogOut size={20} aria-hidden />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="absolute -right-3 top-24 hidden h-6 w-6 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] shadow-card transition-colors hover:bg-[var(--bg-card-hover)] md:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <FiChevronRight size={14} aria-hidden />
          ) : (
            <FiChevronLeft size={14} aria-hidden />
          )}
        </button>
      </aside>
    </>
  )
}
