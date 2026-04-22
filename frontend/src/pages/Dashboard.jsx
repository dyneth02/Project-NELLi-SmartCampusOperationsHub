import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FiCalendar,
  FiAlertCircle,
  FiBell,
  FiPlus,
  FiTool,
  FiMapPin,
  FiClock,
  FiArrowRight,
  FiRefreshCw,
  FiUsers,
} from 'react-icons/fi'
import clsx from 'clsx'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { useGroupMaterialize } from '../hooks/useAnimations'
import { bookingApi } from '../api/bookingApi'
import { ticketApi } from '../api/ticketApi'
import { notificationApi } from '../api/notificationApi'
import { analyticsApi } from '../api/analyticsApi'

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status) {
  const map = {
    PENDING: { variant: 'warning', label: 'Pending' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'error', label: 'Rejected' },
    CANCELLED: { variant: 'default', label: 'Cancelled' },
    OPEN: { variant: 'warning', label: 'Open' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    RESOLVED: { variant: 'success', label: 'Resolved' },
    CLOSED: { variant: 'default', label: 'Closed' },
  }
  const { variant, label } = map[status] || { variant: 'default', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

function priorityBadge(priority) {
  const map = {
    LOW: { variant: 'info', label: 'Low' },
    MEDIUM: { variant: 'warning', label: 'Medium' },
    HIGH: { variant: 'error', label: 'High' },
    URGENT: { variant: 'error', label: 'Urgent' },
  }
  const { variant, label } = map[priority] || { variant: 'default', label: priority }
  return <Badge variant={variant}>{label}</Badge>
}

/* ── Widget skeleton ──────────────────────────────────────────── */

function WidgetSkeleton() {
  return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[var(--bg-tertiary)] rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded" />
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-5/6" />
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-2/3" />
          </div>
        </div>
      </Card>
  )
}

/* ── Main Dashboard ───────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [tickets, setTickets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Updated to use the smoother materialize hook
  const widgetRefs = useGroupMaterialize(4, { duration: 0.8 })

  const fetchData = useCallback(async () => {
    try {
      const requests = [
        bookingApi.getMyBookings(),
        ticketApi.getMyTickets(),
        notificationApi.getNotifications(),
      ]

      // Analytics overview is ADMIN-only — only fetch for admin users
      if (user?.role === 'ADMIN') {
        requests.push(analyticsApi.getOverview())
      }

      const results = await Promise.allSettled(requests)

      const [bookingsRes, ticketsRes, notifRes, overviewRes] = results

      if (bookingsRes.status === 'fulfilled') {
        const list = unwrap(bookingsRes.value) || []
        setBookings(Array.isArray(list) ? list : [])
      }
      if (ticketsRes.status === 'fulfilled') {
        const list = unwrap(ticketsRes.value) || []
        setTickets(Array.isArray(list) ? list : [])
      }
      if (notifRes.status === 'fulfilled') {
        const list = unwrap(notifRes.value) || []
        setNotifications(Array.isArray(list) ? list.slice(0, 5) : [])
      }
      if (overviewRes && overviewRes.status === 'fulfilled') {
        setOverview(unwrap(overviewRes.value))
      }

      setError('')
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Derived data
  const upcomingBookings = (bookings || [])
      .filter((b) => b.status === 'APPROVED' || b.status === 'PENDING')
      .sort((a, b) => new Date(a.startDateTime || a.startTime) - new Date(b.startDateTime || b.startTime))
      .slice(0, 5)

  const activeTickets = (tickets || [])
      .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
      .slice(0, 5)

  const unreadNotifs = (notifications || []).filter((n) => !n.read)
  const pendingBookingsCount = (bookings || []).filter((b) => b.status === 'PENDING').length
  const activeTicketsCount = activeTickets.length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">
              {greeting}, {user?.fullName || user?.name || 'User'} 👋
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">{dateStr}</p>
          </div>
          <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              icon={<FiRefreshCw className={clsx(refreshing && 'animate-spin')} />}
          >
            Refresh
          </Button>
        </div>

        {error && (
            <div className="mb-6 p-4 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-sm">
              {error}
              <button onClick={handleRefresh} className="underline ml-2 font-medium">
                Retry
              </button>
            </div>
        )}

        {/* Quick Stats Row */}
        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                  <Card key={i} padding="sm">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3" />
                        <div className="h-6 bg-[var(--bg-tertiary)] rounded w-1/4" />
                      </div>
                    </div>
                  </Card>
              ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                  icon={<FiCalendar size={22} />}
                  label="Total Bookings"
                  value={overview?.totalBookings ?? bookings.length}
                  color="text-primary"
                  bgColor="bg-primary/10"
              />
              <StatCard
                  icon={<FiClock size={22} />}
                  label="Pending"
                  value={pendingBookingsCount}
                  color="text-status-warning"
                  bgColor="bg-status-warning/10"
              />
              <StatCard
                  icon={<FiAlertCircle size={22} />}
                  label="Active Tickets"
                  value={activeTicketsCount}
                  color="text-status-info"
                  bgColor="bg-status-info/10"
              />
              <StatCard
                  icon={<FiBell size={22} />}
                  label="Unread"
                  value={unreadNotifs.length}
                  color="text-status-success"
                  bgColor="bg-status-success/10"
              />
            </div>
        )}

        {/* Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: bookings + tickets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Bookings */}
            {loading ? (
                <WidgetSkeleton />
            ) : (
                <Card ref={widgetRefs.setRef(0)}>
                  <WidgetHeader
                      title="Upcoming Bookings"
                      action={<Link to="/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">View All <FiArrowRight size={14} /></Link>}
                  />
                  {upcomingBookings.length === 0 ? (
                      <EmptyState
                          icon={<FiCalendar size={32} />}
                          message="No upcoming bookings"
                          actionLabel="Book a facility"
                          actionHref="/bookings/create"
                      />
                  ) : (
                      <div className="space-y-3 mt-4">
                        {upcomingBookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FiCalendar size={18} className="text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {booking.facility?.name || booking.facilityName || 'Facility'}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-1 mt-1">
                                    <FiClock size={12} />
                                    {formatDate(booking.startDateTime || booking.startTime)} · {formatTime(booking.startDateTime || booking.startTime)}
                                    {booking.endDateTime && (
                                        <span className="text-[var(--text-muted)]">— {formatTime(booking.endDateTime)}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                {statusBadge(booking.status)}
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </Card>
            )}

            {/* Active Tickets */}
            {loading ? (
                <WidgetSkeleton />
            ) : (
                <Card ref={widgetRefs.setRef(1)}>
                  <WidgetHeader
                      title="Active Tickets"
                      action={<Link to="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">View All <FiArrowRight size={14} /></Link>}
                  />
                  {activeTickets.length === 0 ? (
                      <EmptyState
                          icon={<FiTool size={32} />}
                          message="No active tickets"
                          actionLabel="Report an issue"
                          actionHref="/tickets/create"
                      />
                  ) : (
                      <div className="space-y-3 mt-4">
                        {activeTickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                to={`/tickets/${ticket.id}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-status-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FiAlertCircle size={18} className="text-status-info" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    #{ticket.ticketNumber || ticket.id} — {ticket.title || ticket.subject || 'Maintenance'}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] truncate">
                                    {ticket.facilityName || ticket.location || ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {priorityBadge(ticket.priority)}
                                {statusBadge(ticket.status)}
                              </div>
                            </Link>
                        ))}
                      </div>
                  )}
                </Card>
            )}
          </div>

          {/* Right column: notifications + quick actions */}
          <div className="space-y-6">
            {/* Notifications */}
            {loading ? (
                <WidgetSkeleton />
            ) : (
                <Card ref={widgetRefs.setRef(2)}>
                  <WidgetHeader
                      title="Notifications"
                      action={
                        <Link to="/notifications" className="text-sm text-primary hover:underline flex items-center gap-1">
                          View All <FiArrowRight size={14} />
                        </Link>
                      }
                  />
                  {notifications.length === 0 ? (
                      <div className="text-center py-8 mt-4">
                        <FiBell size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-sm text-[var(--text-muted)]">All caught up!</p>
                      </div>
                  ) : (
                      <div className="space-y-3 mt-4">
                        {notifications.slice(0, 5).map((notif) => (
                            <div
                                key={notif.id}
                                className={clsx(
                                    'p-3 rounded-lg transition-colors',
                                    notif.read
                                        ? 'bg-[var(--bg-tertiary)]'
                                        : 'bg-primary/5 border border-primary/10',
                                )}
                            >
                              <div className="flex items-start gap-2">
                                {!notif.read && (
                                    <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm text-[var(--text-primary)] truncate">
                                    {notif.message || notif.title || 'Notification'}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {formatDate(notif.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </Card>
            )}

            {/* Quick Actions */}
            <Card ref={widgetRefs.setRef(3)}>
              <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <QuickActionButton to="/bookings/create" icon={<FiPlus size={18} />}>
                  Book a Facility
                </QuickActionButton>
                <QuickActionButton to="/tickets/create" icon={<FiTool size={18} />}>
                  Report an Issue
                </QuickActionButton>
                <QuickActionButton to="/facilities" icon={<FiMapPin size={18} />}>
                  View Facilities
                </QuickActionButton>
                {user?.role === 'ADMIN' && (
                    <QuickActionButton to="/admin/dashboard" icon={<FiUsers size={18} />}>
                      Admin Dashboard
                    </QuickActionButton>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function unwrap(res) {
  if (res == null) return null
  return res.data !== undefined ? res.data : res
}

function StatCard({ icon, label, value, color, bgColor }) {
  return (
      <Card padding="sm" hover>
        <div className="flex items-center gap-4">
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
            <span className={color}>{icon}</span>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className={clsx('text-2xl font-bold', color)}>{value ?? 0}</p>
          </div>
        </div>
      </Card>
  )
}

function WidgetHeader({ title, action }) {
  return (
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-display font-bold text-[var(--text-primary)]">{title}</h3>
        {action}
      </div>
  )
}

function EmptyState({ icon, message, actionLabel, actionHref }) {
  return (
      <div className="text-center py-8 mt-4">
        <div className="text-[var(--text-muted)] mb-3 flex justify-center">{icon}</div>
        <p className="text-sm text-[var(--text-muted)] mb-3">{message}</p>
        {actionLabel && actionHref && (
            <Link to={actionHref} className="text-sm text-primary hover:underline font-medium">
              {actionLabel} →
            </Link>
        )}
      </div>
  )
}

function QuickActionButton({ to, icon, children }) {
  return (
      <Link
          to={to}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-accent)] border border-transparent transition-all duration-200"
      >
        <span className="text-primary">{icon}</span>
        <span className="text-sm font-medium">{children}</span>
      </Link>
  )
}