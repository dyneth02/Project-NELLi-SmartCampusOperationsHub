import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    FiSearch,
    FiX,
    FiCheck,
    FiXCircle,
    FiEye,
    FiCalendar,
    FiUser,
    FiMapPin,
    FiClock,
    FiChevronLeft,
    FiChevronRight,
    FiMessageSquare,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import TextArea from '../../components/common/TextArea'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { bookingApi } from '../../api/bookingApi'

const TABS = [
    { key: 'ALL', label: 'All', color: '' },
    { key: 'PENDING', label: 'Pending', color: 'text-status-warning' },
    { key: 'APPROVED', label: 'Approved', color: 'text-status-success' },
    { key: 'REJECTED', label: 'Rejected', color: 'text-status-error' },
    { key: 'CANCELLED', label: 'Cancelled', color: 'text-[var(--text-muted)]' },
]

const STATUS_BADGE = {
    PENDING: { variant: 'warning', label: 'Pending' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'error', label: 'Rejected' },
    CANCELLED: { variant: 'default', label: 'Cancelled' },
}

const REJECT_REASONS = [
    'Facility unavailable',
    'Maintenance scheduled',
    'Insufficient information',
    'Policy violation',
]

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(d) {
    if (!d) return ''
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getDuration(start, end) {
    if (!start || !end) return ''
    const mins = (new Date(end) - new Date(start)) / 60000
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`
}

function relativeTime(d) {
    if (!d) return ''
    const diff = Math.floor((new Date() - new Date(d)) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusCounts, setStatusCounts] = useState({})
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const ITEMS_PER_PAGE = 15

    // Modals
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectingBooking, setRejectingBooking] = useState(null)
    const [rejectReason, setRejectReason] = useState('')
    const [rejectCustomReason, setRejectCustomReason] = useState('')
    const [rejectSubmitting, setRejectSubmitting] = useState(false)

    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState(null)

    const [bulkSelected, setBulkSelected] = useState([])
    const [approving, setApproving] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (activeTab !== 'ALL') params.status = activeTab

            const [bookingsRes] = await Promise.allSettled([
                bookingApi.getAllBookings(params),
            ])

            if (bookingsRes.status === 'fulfilled') {
                const data = unwrap(bookingsRes.value)
                const list = Array.isArray(data) ? data : data.content || []
                setBookings(list)
                setTotalPages(data.totalPages ?? 1)

                // Compute counts
                const allRes = await bookingApi.getAllBookings()
                const all = unwrap(allRes)
                const allList = Array.isArray(all) ? all : []
                const counts = { ALL: allList.length }
                allList.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1 })
                setStatusCounts(counts)
            }
        } catch {
            toast.error('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }, [activeTab, page])

    useEffect(() => { fetchData() }, [fetchData])

    const handleApprove = async (id) => {
        try {
            await bookingApi.approveBooking(id)
            toast.success('Booking approved')
            fetchData()
        } catch {
            toast.error('Failed to approve booking')
        }
    }

    const handleReject = async () => {
        if (!rejectingBooking) return
        const reason = rejectReason === 'Other' ? rejectCustomReason : rejectReason
        if (!reason) { toast.error('Please provide a reason'); return }
        setRejectSubmitting(true)
        try {
            await bookingApi.rejectBooking(rejectingBooking.id, reason)
            toast.success('Booking rejected')
            setShowRejectModal(false)
            setRejectingBooking(null)
            setRejectReason('')
            setRejectCustomReason('')
            fetchData()
        } catch {
            toast.error('Failed to reject booking')
        } finally {
            setRejectSubmitting(false)
        }
    }

    const handleBulkApprove = async () => {
        setApproving(true)
        try {
            await Promise.all(bulkSelected.map((id) => bookingApi.approveBooking(id)))
            toast.success(`${bulkSelected.length} booking${bulkSelected.length > 1 ? 's' : ''} approved`)
            setBulkSelected([])
            fetchData()
        } catch {
            toast.error('Failed to approve some bookings')
        } finally {
            setApproving(false)
        }
    }

    const toggleBulk = (id) => {
        setBulkSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    const filteredBookings = useMemo(() => {
        if (!searchQuery) return bookings
        const q = searchQuery.toLowerCase()
        return bookings.filter((b) =>
            (b.id || '').toLowerCase().includes(q) ||
            (b.user?.name || b.userName || '').toLowerCase().includes(q) ||
            (b.facility?.name || b.facilityName || '').toLowerCase().includes(q),
        )
    }, [bookings, searchQuery])

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                            Bookings Management
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">Review, approve, and manage all bookings</p>
                    </div>
                </div>

                {/* Pending Alert */}
                {statusCounts.PENDING > 0 && (
                    <Card className="mb-6 border-l-4 border-l-status-warning" padding="sm">
                        <div className="flex items-center gap-3">
                            <FiCalendar size={18} className="text-status-warning flex-shrink-0" />
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                {statusCounts.PENDING} booking{statusCounts.PENDING > 1 ? 's' : ''} awaiting approval
                            </p>
                        </div>
                    </Card>
                )}

                {/* Search */}
                <div className="relative mb-6">
                    <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by booking ID, user, or facility..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl pl-11 pr-10 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <FiX size={16} />
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1); setBulkSelected([]) }}
                            className={clsx(
                                'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                                activeTab === tab.key
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]',
                            )}
                        >
                            {tab.label}
                            {statusCounts[tab.key] != null && <span className={clsx('text-xs', tab.color || 'text-[var(--text-muted)]')}>{statusCounts[tab.key]}</span>}
                        </button>
                    ))}
                </div>

                {/* Bulk Actions */}
                {bulkSelected.length > 0 && activeTab === 'PENDING' && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-sm text-primary font-medium">{bulkSelected.length} selected</span>
                        <Button variant="primary" size="sm" icon={<FiCheck />} isLoading={approving} onClick={handleBulkApprove}>
                            Approve Selected
                        </Button>
                        <button onClick={() => setBulkSelected([])} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Clear</button>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <LoadingSpinner text="Loading bookings..." className="mx-auto" />
                ) : filteredBookings.length === 0 ? (
                    <Card className="text-center py-12">
                        <FiCalendar size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No bookings found</h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            {activeTab !== 'ALL' ? `No ${activeTab.toLowerCase()} bookings` : 'No bookings exist yet'}
                        </p>
                    </Card>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                                <tr>
                                    {activeTab === 'PENDING' && <th className="p-3 w-10"><input type="checkbox" onChange={(e) => { if (e.target.checked) setBulkSelected(filteredBookings.map((b) => b.id)); else setBulkSelected([]) }} /></th>}
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">ID</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">Facility</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden md:table-cell">User</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">Date</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Time</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">Status</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden sm:table-cell">Created</th>
                                    <th className="p-3 text-right font-medium text-[var(--text-muted)]">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredBookings.map((b) => {
                                    const statusConf = STATUS_BADGE[b.status] || { variant: 'default', label: b.status }
                                    return (
                                        <tr key={b.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-colors">
                                            {activeTab === 'PENDING' && (
                                                <td className="p-3"><input type="checkbox" checked={bulkSelected.includes(b.id)} onChange={() => toggleBulk(b.id)} /></td>
                                            )}
                                            <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{b.id?.toString().slice(0, 8)}</td>
                                            <td className="p-3">
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">{b.facility?.name || b.facilityName || 'N/A'}</p>
                                                    <Badge size="sm" className="mt-1">{b.facility?.type || ''}</Badge>
                                                </div>
                                            </td>
                                            <td className="p-3 hidden md:table-cell">
                                                <p className="text-[var(--text-primary)] truncate max-w-[120px]">{b.user?.name || b.userName || 'N/A'}</p>
                                                <p className="text-xs text-[var(--text-muted)] truncate max-w-[120px]">{b.user?.email || b.userEmail || ''}</p>
                                            </td>
                                            <td className="p-3 text-[var(--text-secondary)] whitespace-nowrap">{formatDate(b.startDateTime)}</td>
                                            <td className="p-3 text-[var(--text-secondary)] whitespace-nowrap hidden lg:table-cell">
                                                {formatTime(b.startDateTime)} — {formatTime(b.endDateTime)}
                                                <span className="text-xs text-[var(--text-muted)] ml-1">({getDuration(b.startDateTime, b.endDateTime)})</span>
                                            </td>
                                            <td className="p-3"><Badge variant={statusConf.variant}>{statusConf.label}</Badge></td>
                                            <td className="p-3 text-[var(--text-muted)] whitespace-nowrap hidden sm:table-cell">{relativeTime(b.createdAt)}</td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => { setSelectedBooking(b); setShowDetailsModal(true) }} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="View details">
                                                        <FiEye size={16} />
                                                    </button>
                                                    {b.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApprove(b.id)} className="p-1.5 rounded hover:bg-status-success/10 text-status-success transition-colors" title="Approve">
                                                                <FiCheck size={16} />
                                                            </button>
                                                            <button onClick={() => { setRejectingBooking(b); setShowRejectModal(true) }} className="p-1.5 rounded hover:bg-status-error/10 text-status-error transition-colors" title="Reject">
                                                                <FiXCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <FiChevronLeft size={18} />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                                    <button key={i} onClick={() => setPage(i + 1)} className={clsx('w-9 h-9 rounded-lg text-sm font-medium transition-colors', page === i + 1 ? 'bg-gradient-accent text-white' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]')}>{i + 1}</button>
                                ))}
                                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <FiChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Reject Modal */}
            <Modal isOpen={showRejectModal} onClose={() => { setShowRejectModal(false); setRejectingBooking(null); setRejectReason(''); setRejectCustomReason('') }} title="Reject Booking" size="md" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectingBooking(null) }}>Cancel</Button>
                    <Button variant="danger" isLoading={rejectSubmitting} onClick={handleReject}>Reject Booking</Button>
                </div>
            }>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Reject booking for <strong className="text-[var(--text-primary)]">{rejectingBooking?.facility?.name || rejectingBooking?.facilityName}</strong> on {formatDate(rejectingBooking?.startDateTime)}?
                </p>
                <div className="space-y-3">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Reason</label>
                    <div className="space-y-2">
                        {REJECT_REASONS.map((r) => (
                            <label key={r} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="reject-reason" checked={rejectReason === r} onChange={() => setRejectReason(r)} className="w-4 h-4 text-primary focus:ring-primary" />
                                <span className="text-sm text-[var(--text-secondary)]">{r}</span>
                            </label>
                        ))}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="reject-reason" checked={rejectReason === 'Other'} onChange={() => setRejectReason('Other')} className="w-4 h-4 text-primary focus:ring-primary" />
                            <span className="text-sm text-[var(--text-secondary)]">Other</span>
                        </label>
                    </div>
                    {rejectReason === 'Other' && (
                        <TextArea name="custom-reason" placeholder="Provide a custom reason..." value={rejectCustomReason} onChange={(e) => setRejectCustomReason(e.target.value)} rows={3} required />
                    )}
                </div>
            </Modal>

            {/* Details Modal */}
            <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Booking Details" size="lg" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
                    {selectedBooking?.facilityId && <Link to={`/facilities/${selectedBooking.facilityId}`}><Button variant="primary">View Facility</Button></Link>}
                </div>
            }>
                {selectedBooking && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedBooking.facility?.name || selectedBooking.facilityName}</h3>
                            <Badge variant={STATUS_BADGE[selectedBooking.status]?.variant || 'default'}>{STATUS_BADGE[selectedBooking.status]?.label || selectedBooking.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailItem label="User" value={`${selectedBooking.user?.name || selectedBooking.userName || 'N/A'} (${selectedBooking.user?.email || selectedBooking.userEmail || ''})`} />
                            <DetailItem label="Date" value={formatDate(selectedBooking.startDateTime)} />
                            <DetailItem label="Time" value={`${formatTime(selectedBooking.startDateTime)} — ${formatTime(selectedBooking.endDateTime)}`} />
                            <DetailItem label="Duration" value={getDuration(selectedBooking.startDateTime, selectedBooking.endDateTime)} />
                            <DetailItem label="Attendees" value={selectedBooking.expectedAttendees ?? 'N/A'} />
                            <DetailItem label="Created" value={formatDate(selectedBooking.createdAt)} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)] mb-1">Purpose</p>
                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{selectedBooking.purpose || 'N/A'}</p>
                        </div>
                        {selectedBooking.status === 'REJECTED' && selectedBooking.rejectionReason && (
                            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20">
                                <p className="text-sm font-medium text-status-error mb-1">Rejection Reason</p>
                                <p className="text-sm text-[var(--text-secondary)]">{selectedBooking.rejectionReason}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </>
    )
}

function DetailItem({ label, value }) {
    return (
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
            <p className="text-sm text-[var(--text-primary)] truncate">{value}</p>
        </div>
    )
}
