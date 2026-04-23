import { useEffect, useState, useCallback } from 'react'
import { FiBell, FiCheck, FiClock, FiRefreshCw, FiAlertCircle, FiInbox } from 'react-icons/fi'
import clsx from 'clsx'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications.js'
import { notificationApi } from '../api/notificationApi.js'

function unwrapResponse(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function Notifications() {
    const { isAuthenticated } = useAuth()
    const { refetch: refetchCount } = useNotifications()
    const [notifications, setNotifications] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) {
            setNotifications([])
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const res = await notificationApi.getNotifications()
            const payload = unwrapResponse(res)
            setNotifications(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
        } catch (err) {
            console.error('Failed to load notifications', err)
            setError('Unable to load notifications. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [isAuthenticated])

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationApi.markAsRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
            refetchCount()
        } catch (err) {
            console.error('Failed to mark as read', err)
        }
    }, [refetchCount])

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead()
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            refetchCount()
        } catch (err) {
            console.error('Failed to mark all as read', err)
        }
    }, [refetchCount])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const unreadCount = notifications.filter((notif) => notif.isRead !== true && notif.read !== true).length

    return (
        <div className="container-custom py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-gradient">Notifications</h1>
                    <p className="mt-2 text-[var(--text-secondary)]">Alerts and activity for your account.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {unreadCount > 0 && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={markAllAsRead}
                            icon={<FiCheck size={16} />}
                        >
                            Mark All Read
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchNotifications}
                        icon={<FiRefreshCw size={16} />}
                    >
                        Refresh
                    </Button>
                    <Button variant="ghost" size="sm" icon={<FiBell size={16} />}>
                        {unreadCount} unread
                    </Button>
                </div>
            </div>

            <div className="rounded-xl bg-[var(--bg-card)] transition-all duration-300 border border-[var(--border-default)] shadow-card p-4 mt-6">
                {isLoading ? (
                    <div className="py-16 flex justify-center">
                        <LoadingSpinner text="Loading notifications..." />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <FiAlertCircle size={40} className="mx-auto text-status-error mb-3 opacity-60" />
                        <p className="text-status-error mb-3 font-medium">{error}</p>
                        <Button variant="primary" onClick={fetchNotifications}>
                            Try again
                        </Button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                            <FiInbox size={28} className="text-[var(--text-muted)]" />
                        </div>
                        <p className="text-base font-medium text-[var(--text-primary)] mb-1">No notifications yet</p>
                        <p className="text-sm text-[var(--text-muted)]">We'll notify you when something happens.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border-default)]">
                        {notifications.map((notif, index) => {
                            const isRead = notif.isRead !== undefined ? notif.isRead : notif.read
                            return (
                                <div
                                    key={notif.id}
                                    className={clsx(
                                        'group relative transition-all duration-200',
                                        index === 0 && 'pt-0',
                                        isRead
                                            ? 'hover:bg-[var(--bg-hover)]/30'
                                            : 'bg-gradient-to-r from-primary/5 via-primary/3 to-transparent'
                                    )}
                                >
                                    <div className="py-5 px-3 -mx-3 rounded-lg transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                <div className={clsx(
                                                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                                                    isRead
                                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                                        : 'bg-primary/10 text-primary'
                                                )}>
                                                    <FiBell size={16} />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1.5">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={clsx(
                                                            'text-sm font-semibold truncate',
                                                            isRead ? 'text-[var(--text-primary)]' : 'text-primary'
                                                        )}>
                                                            {notif.title || 'Notification'}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {!isRead && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                New
                              </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                              <FiClock size={12} />
                                                            {formatDate(notif.createdAt)}
                            </span>
                                                        {!isRead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() => markAsRead(notif.id)}
                                                                icon={<FiCheck size={14} />}
                                                                className="text-primary hover:text-primary hover:bg-primary/10"
                                                            >
                                                                Mark Read
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                                    {notif.message}
                                                </p>

                                                {notif.relatedEntityType && notif.relatedEntityId && (
                                                    <div className="mt-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]">
                              <span className="font-medium">{notif.relatedEntityType}</span>
                              <span className="text-[var(--border-strong)]">•</span>
                              <span>#{notif.relatedEntityId}</span>
                            </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {notifications.length > 0 && !isLoading && !error && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                            {unreadCount > 0 && (
                                <span className="flex items-center gap-1">
                  <FiBell size={12} />
                                    {unreadCount} unread
                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}