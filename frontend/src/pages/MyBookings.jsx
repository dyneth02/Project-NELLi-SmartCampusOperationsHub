import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    FiCalendar,
    FiClock,
    FiMapPin,
    FiSearch,
    FiX,
    FiMoreVertical,
    FiEye,
    FiXCircle,
    FiTrash2,
    FiHash,
    FiDownload,
    FiExternalLink,
    FiGrid,
    FiLayers,
} from 'react-icons/fi'
import QRCodeLib from 'react-qr-code'
import clsx from 'clsx'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Card from '../components/common/Card'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Modal from '../components/common/Modal'
import Dropdown from '../components/common/Dropdown'
import { useScrollReveal } from '../hooks/useAnimations'
import { bookingApi } from '../api/bookingApi'
import { toast } from 'react-toastify'

/** Matches Facilities.jsx view toggle styling (`grid` ≈ tile, list ≈ stacked). */
const LAYOUT_TILE = 'tile'
const LAYOUT_STACKED = 'stacked'

const TABS = [
    { key: 'ALL', label: 'All', color: '' },
    { key: 'PENDING', label: 'Pending', color: 'text-status-warning' },
    { key: 'APPROVED', label: 'Approved', color: 'text-status-success' },
    { key: 'REJECTED', label: 'Rejected', color: 'text-status-error' },
    { key: 'CANCELLED', label: 'Cancelled', color: 'text-[var(--text-muted)]' },
]

const QRCodeComponent = QRCodeLib?.default || QRCodeLib?.QRCode || QRCodeLib

function statusBadge(status) {
    const map = {
        PENDING: { variant: 'warning', label: 'Pending' },
        APPROVED: { variant: 'success', label: 'Approved' },
        REJECTED: { variant: 'error', label: 'Rejected' },
        CANCELLED: { variant: 'default', label: 'Cancelled' },
    }
    const { variant, label } = map[status] || { variant: 'default', label: status || 'Unknown' }
    return <Badge variant={variant}>{label}</Badge>
}

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

function getDuration(start, end) {
    if (!start || !end) return ''
    const ms = new Date(end) - new Date(start)
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    return `${mins}m`
}

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

export default function MyBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancellingBooking, setCancellingBooking] = useState(null)
    const [cancelling, setCancelling] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [showQrModal, setShowQrModal] = useState(false)
    const [statusCounts, setStatusCounts] = useState({})
    const [layoutView, setLayoutView] = useState(LAYOUT_TILE)

    const qrPayload = useMemo(() => {
        if (!selectedBooking?.id) return ''
        return JSON.stringify({ bookingId: selectedBooking.id, action: 'checkin' })
    }, [selectedBooking])

    const fetchBookings = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            // Fetch all statuses for counts
            const allRes = await bookingApi.getMyBookings()
            const all = unwrap(allRes)
            const list = Array.isArray(all) ? all : []
            setBookings(list)

            // Compute counts
            const counts = { ALL: list.length }
            list.forEach((b) => {
                counts[b.status] = (counts[b.status] || 0) + 1
            })
            setStatusCounts(counts)
        } catch {
            setError('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

    const handleCancelBooking = async () => {
        if (!cancellingBooking) return
        setCancelling(true)
        try {
            await bookingApi.cancelBooking(cancellingBooking.id)
            toast.success('Booking cancelled successfully')
            fetchBookings()
        } catch {
            toast.error('Failed to cancel booking')
        } finally {
            setCancelling(false)
            setShowCancelModal(false)
            setCancellingBooking(null)
        }
    }

    const downloadQrCode = useCallback(() => {
        const svg = document.getElementById('booking-qr-code-svg')
        if (!svg || !selectedBooking?.id) {
            toast.error('QR code is not ready yet')
            return
        }
        const serializer = new XMLSerializer()
        const source = serializer.serializeToString(svg)
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const size = 768
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                toast.error('Failed to prepare PNG export')
                URL.revokeObjectURL(url)
                return
            }
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, size, size)
            ctx.drawImage(img, 0, 0, size, size)
            const pngUrl = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = pngUrl
            link.download = `booking-${selectedBooking.id}-qr.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }
        img.onerror = () => {
            toast.error('Failed to export QR as PNG')
            URL.revokeObjectURL(url)
        }
        img.src = url
    }, [selectedBooking])

    const filteredBookings = useMemo(() => {
        let result = bookings
        if (activeTab !== 'ALL') {
            result = result.filter((b) => b.status === activeTab)
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                (b) =>
                    (b.facility?.name || b.facilityName || '').toLowerCase().includes(q) ||
                    (b.purpose || '').toLowerCase().includes(q),
            )
        }
        return result.sort((a, b) => new Date(b.createdAt || b.startDateTime) - new Date(a.createdAt || a.startDateTime))
    }, [bookings, activeTab, searchQuery])

    return (
        <>
            <div className="container-custom py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">
                        My Bookings
                    </h1>
                    <Link to="/bookings/create">
                        <Button variant="primary">New Booking</Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by facility name or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl pl-11 pr-10 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        aria-label="Search bookings"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label="Clear search"
                        >
                            <FiX size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={clsx(
                                'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                                activeTab === tab.key
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]',
                            )}
                        >
                            {tab.label}
                            {statusCounts[tab.key] != null && (
                                <span className={clsx('text-xs', tab.color || 'text-[var(--text-muted)]')}>
                  {statusCounts[tab.key]}
                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Layout switcher (same control pattern as Facilities.jsx grid/list toggle) */}
                <div className="flex justify-end mb-6">
                    <div
                        className="inline-flex items-center border border-[var(--border-default)] rounded-lg overflow-hidden"
                        role="group"
                        aria-label="Booking layout"
                    >
                        <button
                            type="button"
                            onClick={() => setLayoutView(LAYOUT_TILE)}
                            className={clsx(
                                'px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2',
                                layoutView === LAYOUT_TILE
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                            aria-pressed={layoutView === LAYOUT_TILE}
                        >
                            <FiGrid size={18} aria-hidden />
                            <span className="hidden sm:inline">Tile</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setLayoutView(LAYOUT_STACKED)}
                            className={clsx(
                                'px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2 border-l border-[var(--border-default)]',
                                layoutView === LAYOUT_STACKED
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                            aria-pressed={layoutView === LAYOUT_STACKED}
                        >
                            <FiLayers size={18} aria-hidden />
                            <span className="hidden sm:inline">Stacked</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <Card className="text-center py-6 mb-6">
                        <p className="text-status-error mb-3">{error}</p>
                        <Button variant="secondary" onClick={fetchBookings}>Retry</Button>
                    </Card>
                )}

                {/* Booking List */}
                {loading ? (
                    <div
                        className={clsx(
                            layoutView === LAYOUT_TILE
                                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                                : 'space-y-4',
                        )}
                    >
                        {Array.from({ length: layoutView === LAYOUT_TILE ? 6 : 3 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-5 bg-[var(--bg-tertiary)] rounded w-1/3" />
                                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="text-[var(--text-muted)] mb-3 flex justify-center">
                            <FiCalendar size={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                            {activeTab === 'ALL'
                                ? 'No bookings yet'
                                : `No ${activeTab.toLowerCase()} bookings`}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            {activeTab === 'ALL'
                                ? 'Start by booking a facility'
                                : activeTab === 'PENDING'
                                    ? 'All clear — no pending bookings'
                                    : 'Nothing to show here'}
                        </p>
                        {activeTab === 'ALL' && (
                            <Link to="/bookings/create">
                                <Button variant="primary">Make a Booking</Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div
                        className={clsx(
                            layoutView === LAYOUT_TILE
                                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                                : 'space-y-4',
                        )}
                    >
                        {filteredBookings.map((booking, index) => (
                            <BookingCardWithAnimation
                                key={booking.id}
                                booking={booking}
                                index={index}
                                layoutView={layoutView}
                                onViewDetails={() => {
                                    setSelectedBooking(booking)
                                    setShowDetailsModal(true)
                                }}
                                onCancel={() => {
                                    setCancellingBooking(booking)
                                    setShowCancelModal(true)
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Confirmation Modal */}
            <Modal
                isOpen={showCancelModal}
                onClose={() => {
                    setShowCancelModal(false)
                    setCancellingBooking(null)
                }}
                title="Cancel Booking"
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowCancelModal(false); setCancellingBooking(null) }}
                        >
                            Keep Booking
                        </Button>
                        <Button
                            variant="danger"
                            isLoading={cancelling}
                            onClick={handleCancelBooking}
                        >
                            Yes, Cancel
                        </Button>
                    </div>
                }
            >
                <p className="text-[var(--text-secondary)]">
                    Are you sure you want to cancel the booking for{' '}
                    <strong className="text-[var(--text-primary)]">
                        {cancellingBooking?.facility?.name || cancellingBooking?.facilityName || 'this facility'}
                    </strong>
                    {' '}on {formatDate(cancellingBooking?.startDateTime)}?
                </p>
            </Modal>

            {/* Booking Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false)
                    setShowQrModal(false)
                    setSelectedBooking(null)
                }}
                title="Booking Details"
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        {selectedBooking?.status === 'APPROVED' && (
                            <Button
                                variant="secondary"
                                icon={<FiHash />}
                                onClick={() => setShowQrModal(true)}
                            >
                                View QR Code
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            icon={<FiExternalLink />}
                            onClick={() => {
                                setShowDetailsModal(false)
                                if (selectedBooking?.facilityId) {
                                    window.location.href = `/facilities/${selectedBooking.facilityId}`
                                }
                            }}
                        >
                            View Facility
                        </Button>
                        {(selectedBooking?.status === 'PENDING' || selectedBooking?.status === 'APPROVED') && (
                            <Button
                                variant="danger"
                                icon={<FiXCircle />}
                                onClick={() => {
                                    setShowDetailsModal(false)
                                    setCancellingBooking(selectedBooking)
                                    setShowCancelModal(true)
                                }}
                            >
                                Cancel Booking
                            </Button>
                        )}
                    </div>
                }
            >
                {selectedBooking && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-display font-bold text-[var(--text-primary)]">
                                {selectedBooking.facility?.name || selectedBooking.facilityName}
                            </h3>
                            {statusBadge(selectedBooking.status)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DetailItem label="Date" value={formatDate(selectedBooking.startDateTime)} />
                            <DetailItem label="Time" value={`${formatTime(selectedBooking.startDateTime)} — ${formatTime(selectedBooking.endDateTime)}`} />
                            <DetailItem label="Duration" value={getDuration(selectedBooking.startDateTime, selectedBooking.endDateTime)} />
                            <DetailItem label="Attendees" value={selectedBooking.expectedAttendees ?? 'N/A'} />
                        </div>

                        <div>
                            <p className="text-sm text-[var(--text-muted)] mb-1">Purpose</p>
                            <p className="text-sm text-[var(--text-primary)]">{selectedBooking.purpose || 'N/A'}</p>
                        </div>

                        {selectedBooking.status === 'REJECTED' && selectedBooking.rejectionReason && (
                            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20">
                                <p className="text-sm font-medium text-status-error mb-1">Rejection Reason</p>
                                <p className="text-sm text-[var(--text-secondary)]">{selectedBooking.rejectionReason}</p>
                            </div>
                        )}

                        {selectedBooking.status === 'APPROVED' && (
                            <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/20">
                                <p className="text-sm font-medium text-status-success mb-1">Approved</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {selectedBooking.approvedBy ? `By ${selectedBooking.approvedBy}` : 'Your booking has been approved'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title="Booking QR Code"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowQrModal(false)}>
                            Close
                        </Button>
                        <Button variant="primary" icon={<FiDownload />} onClick={downloadQrCode}>
                            Download QR
                        </Button>
                    </div>
                }
            >
                {selectedBooking?.id ? (
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-4 bg-white rounded-lg">
                            <QRCodeComponent id="booking-qr-code-svg" value={qrPayload} size={220} />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Booking ID: <span className="font-mono text-[var(--text-primary)]">{selectedBooking.id}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                            Use this QR on the QR Code Check-in page to verify approved booking details.
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-status-error">No booking selected for QR generation.</p>
                )}
            </Modal>
        </>
    )
}

/* ── Sub-components ─────────────────────────────────────────── */

function BookingCardWithAnimation({ booking, index, layoutView, onViewDetails, onCancel }) {
    // Aligning parameters with Facilities for maximum smoothness
    const { ref: scrollRef } = useScrollReveal({ y: 30, delay: Math.min(index * 0.05, 0.3) })

    const canCancel = booking.status === 'PENDING' || booking.status === 'APPROVED'
    const isTile = layoutView === LAYOUT_TILE

    const dropdown = (
        <Dropdown
            align="right"
            trigger={
                <button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-muted)]" aria-label="More actions">
                    <FiMoreVertical size={18} />
                </button>
            }
            items={[
                { label: 'View Details', icon: <FiEye size={16} />, onClick: onViewDetails },
                ...(canCancel ? [{ label: 'Cancel', icon: <FiXCircle size={16} />, onClick: onCancel, danger: true }] : []),
            ]}
        />
    )

    // Wrap the Card in a plain div to isolate GSAP from the Card's CSS transitions
    return (
        <div ref={scrollRef} className={isTile ? "h-full" : ""}>
            {isTile ? (
                <Card hover className="h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCalendar size={20} className="text-primary" />
                        </div>
                        {dropdown}
                    </div>
                    <h4 className="text-base font-semibold text-[var(--text-primary)] line-clamp-2 min-h-[3rem]">
                        {booking.facility?.name || booking.facilityName || 'Facility'}
                    </h4>
                    <div className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)] flex-1">
                        <p className="flex items-center gap-1.5">
                            <FiCalendar size={13} className="flex-shrink-0" /> {formatDate(booking.startDateTime)}
                        </p>
                        <p className="flex items-center gap-1.5">
                            <FiClock size={13} className="flex-shrink-0" /> {formatTime(booking.startDateTime)} — {formatTime(booking.endDateTime)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                            {getDuration(booking.startDateTime, booking.endDateTime)}
                        </p>
                        {booking.purpose && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 pt-1 border-t border-[var(--border-default)]">
                                {booking.purpose}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                        {statusBadge(booking.status)}
                    </div>
                </Card>
            ) : (
                <Card hover>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCalendar size={20} className="text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="min-w-0">
                                    <h4 className="text-base font-semibold text-[var(--text-primary)] truncate">
                                        {booking.facility?.name || booking.facilityName || 'Facility'}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <FiCalendar size={13} /> {formatDate(booking.startDateTime)}
                    </span>
                                        <span className="flex items-center gap-1">
                      <FiClock size={13} /> {formatTime(booking.startDateTime)} — {formatTime(booking.endDateTime)}
                    </span>
                                        <span className="text-[var(--text-muted)]">
                      ({getDuration(booking.startDateTime, booking.endDateTime)})
                    </span>
                                    </div>
                                    {booking.purpose && (
                                        <p className="text-sm text-[var(--text-muted)] mt-1 truncate">
                                            {booking.purpose}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {statusBadge(booking.status)}
                                    {dropdown}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}

function DetailItem({ label, value }) {
    return (
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
        </div>
    )
}
