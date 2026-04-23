import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    FiSearch,
    FiX,
    FiEye,
    FiUserPlus,
    FiEdit2,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
    FiTool,
    FiMessageSquare,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import TextArea from '../../components/common/TextArea'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ticketApi } from '../../api/ticketApi'
import { userApi } from '../../api/userApi'

const TABS = [
    { key: 'ALL', label: 'All', color: '' },
    { key: 'OPEN', label: 'Open', color: 'text-status-error' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'text-status-warning' },
    { key: 'RESOLVED', label: 'Resolved', color: 'text-status-success' },
    { key: 'CLOSED', label: 'Closed', color: 'text-[var(--text-muted)]' },
    { key: 'UNASSIGNED', label: 'Unassigned', color: 'text-status-warning' },
]

const PRIORITY_CONF = {
    LOW: { variant: 'info', label: 'Low', order: 0 },
    MEDIUM: { variant: 'warning', label: 'Medium', order: 1 },
    HIGH: { variant: 'error', label: 'High', order: 2 },
    URGENT: { variant: 'error', label: 'Urgent', order: 3 },
}

const STATUS_CONF = {
    OPEN: { variant: 'error', label: 'Open' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    RESOLVED: { variant: 'success', label: 'Resolved' },
    CLOSED: { variant: 'default', label: 'Closed' },
}

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function relativeTime(d) {
    if (!d) return ''
    const diff = Math.floor((new Date() - new Date(d)) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const ITEMS_PER_PAGE = 15

    // Modals
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assigningTicket, setAssigningTicket] = useState(null)
    const [assignTo, setAssignTo] = useState('')
    const [assignNote, setAssignNote] = useState('')
    const [assignSubmitting, setAssignSubmitting] = useState(false)

    const [showStatusModal, setShowStatusModal] = useState(false)
    const [statusTicket, setStatusTicket] = useState(null)
    const [newStatus, setNewStatus] = useState('')
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [statusSubmitting, setStatusSubmitting] = useState(false)

    const [bulkSelected, setBulkSelected] = useState([])

    const [technicians, setTechnicians] = useState([])
    const [techniciansLoading, setTechniciansLoading] = useState(true)

    // Quick stats
    const [unassignedCount, setUnassignedCount] = useState(0)
    const [urgentCount, setUrgentCount] = useState(0)

    const fetchTickets = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (activeTab !== 'ALL') {
                if (activeTab === 'UNASSIGNED') params.assigned = 'false'
                else params.status = activeTab
            }
            if (filterPriority) params.priority = filterPriority
            if (filterCategory) params.category = filterCategory
            if (searchQuery) params.search = searchQuery

            const res = await ticketApi.getAllTickets(params)
            const data = unwrap(res)
            const list = Array.isArray(data) ? data : data.content || []
            setTickets(list)
            setTotalPages(data.totalPages ?? 1)
            setTotalCount(data.totalElements ?? list.length)

            // Fetch counts
            const allRes = await ticketApi.getAllTickets({ assigned: 'false' })
            const allUnassigned = unwrap(allRes)
            setUnassignedCount(Array.isArray(allUnassigned) ? allUnassigned.length : 0)

            const urgentRes = await ticketApi.getAllTickets({ priority: 'URGENT' })
            const urgent = unwrap(urgentRes)
            setUrgentCount(Array.isArray(urgent) ? urgent.length : 0)
        } catch {
            toast.error('Failed to load tickets')
        } finally {
            setLoading(false)
        }
    }, [activeTab, filterPriority, filterCategory, searchQuery, page])

    useEffect(() => { fetchTickets() }, [fetchTickets])

    useEffect(() => {
        const fetchTechnicians = async () => {
            setTechniciansLoading(true)
            try {
                const res = await userApi.getTechnicians()
                const data = unwrap(res)
                setTechnicians(Array.isArray(data) ? data : [])
            } catch {
                toast.error('Failed to load technicians')
            } finally {
                setTechniciansLoading(false)
            }
        }
        fetchTechnicians()
    }, [])

    const handleAssign = async () => {
        if (!assigningTicket || !assignTo) return
        setAssignSubmitting(true)
        try {
            await ticketApi.assignTicket(assigningTicket.id, assignTo)
            toast.success('Ticket assigned')
            setShowAssignModal(false)
            setAssigningTicket(null)
            setAssignTo('')
            setAssignNote('')
            fetchTickets()
        } catch {
            toast.error('Failed to assign ticket')
        } finally {
            setAssignSubmitting(false)
        }
    }

    const handleStatusChange = async () => {
        if (!statusTicket || !newStatus) return
        const nextIdx = STATUS_ORDER.indexOf(newStatus)
        const curIdx = STATUS_ORDER.indexOf(statusTicket.status)
        if (nextIdx > curIdx + 1) {
            toast.error('Cannot skip statuses')
            return
        }
        if (newStatus === 'RESOLVED' && !resolutionNotes.trim()) {
            toast.error('Resolution notes required')
            return
        }
        setStatusSubmitting(true)
        try {
            await ticketApi.updateTicketStatus(statusTicket.id, { status: newStatus, resolutionNotes: resolutionNotes || undefined })
            toast.success('Status updated')
            setShowStatusModal(false)
            setStatusTicket(null)
            setNewStatus('')
            setResolutionNotes('')
            fetchTickets()
        } catch {
            toast.error('Failed to update status')
        } finally {
            setStatusSubmitting(false)
        }
    }

    const toggleBulk = (id) => setBulkSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

    const filteredTickets = tickets

    const categories = ['EQUIPMENT_FAILURE', 'INFRASTRUCTURE', 'CLEANLINESS', 'ELECTRICAL', 'PLUMBING', 'INTERNET', 'OTHER']

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">Tickets Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Assign and manage support tickets</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total" value={totalCount} color="text-[var(--text-primary)]" bg="bg-[var(--bg-tertiary)]" />
                    <StatCard label="Unassigned" value={unassignedCount} color="text-status-warning" bg="bg-status-warning/10" />
                    <StatCard label="Urgent" value={urgentCount} color="text-status-error" bg="bg-status-error/10" />
                    <StatCard label="Selected" value={bulkSelected.length} color="text-primary" bg="bg-primary/10" />
                </div>

                {/* Search & Filters */}
                <Card padding="sm" className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input type="text" placeholder="Search tickets..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-1 focus:ring-primary/20 outline-none" />
                        </div>
                        <Select name="fpri" value={filterPriority} onChange={(v) => { setFilterPriority(v); setPage(1) }} options={[{ label: 'All Priorities', value: '' }, ...Object.entries(PRIORITY_CONF).map(([k, v]) => ({ label: v.label, value: k }))]} className="w-40" />
                        <Select name="fcat" value={filterCategory} onChange={(v) => { setFilterCategory(v); setPage(1) }} options={[{ label: 'All Categories', value: '' }, ...categories.map((c) => ({ label: c.replace(/_/g, ' '), value: c }))]} className="w-44" />
                        {(searchQuery || filterPriority || filterCategory) && <Button variant="ghost" size="sm" icon={<FiX />} onClick={() => { setSearchQuery(''); setFilterPriority(''); setFilterCategory(''); setPage(1) }}>Clear</Button>}
                    </div>
                </Card>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                        <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); setBulkSelected([]) }} className={clsx('px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2', activeTab === tab.key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]')}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Bulk Actions */}
                {bulkSelected.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-sm text-primary font-medium">{bulkSelected.length} selected</span>
                        <Button variant="primary" size="sm" icon={<FiUserPlus />} onClick={() => { /* open bulk assign */ setAssigningTicket({ id: 'bulk' }); setShowAssignModal(true) }}>
                            Bulk Assign
                        </Button>
                        <button onClick={() => setBulkSelected([])} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Clear</button>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <LoadingSpinner text="Loading tickets..." className="mx-auto" />
                ) : filteredTickets.length === 0 ? (
                    <Card className="text-center py-12">
                        <FiAlertCircle size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No tickets found</h3>
                    </Card>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                            <tr>
                                <th className="p-3 w-10"><input type="checkbox" onChange={(e) => { if (e.target.checked) setBulkSelected(filteredTickets.map((t) => t.id)); else setBulkSelected([]) }} /></th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)]">Ticket</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden md:table-cell">Facility</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Category</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)]">Priority</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)]">Status</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden sm:table-cell">Assigned To</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Created</th>
                                <th className="p-3 text-right font-medium text-[var(--text-muted)]">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredTickets.map((t) => {
                                const pConf = PRIORITY_CONF[t.priority] || { variant: 'default', label: t.priority }
                                const sConf = STATUS_CONF[t.status] || { variant: 'default', label: t.status }
                                const isUnassigned = !t.assignedTo && !t.assignedToName
                                const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH'
                                return (
                                    <tr key={t.id} className={clsx('border-b border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-colors', isUnassigned && 'bg-status-warning/5', isUrgent && 'border-l-2 border-l-status-error')}>
                                        <td className="p-3"><input type="checkbox" checked={bulkSelected.includes(t.id)} onChange={() => toggleBulk(t.id)} /></td>
                                        <td className="p-3">
                                            <Link to={`/tickets/${t.id}`} className="font-mono text-xs text-primary hover:underline">#{t.ticketNumber || t.id?.toString().slice(0, 8)}</Link>
                                            <p className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">{t.title || t.subject || 'Issue'}</p>
                                        </td>
                                        <td className="p-3 text-[var(--text-secondary)] hidden md:table-cell truncate max-w-[120px]">{t.facilityName || '—'}</td>
                                        <td className="p-3 hidden lg:table-cell"><Badge size="sm">{t.category?.replace(/_/g, ' ') || '—'}</Badge></td>
                                        <td className="p-3"><Badge variant={pConf.variant}>{pConf.label}</Badge></td>
                                        <td className="p-3"><Badge variant={sConf.variant}>{sConf.label}</Badge></td>
                                        <td className="p-3 text-[var(--text-secondary)] hidden sm:table-cell">{t.assignedToName || t.assignedTo?.name || <span className="text-status-warning italic">Unassigned</span>}</td>
                                        <td className="p-3 text-[var(--text-muted)] whitespace-nowrap hidden lg:table-cell">{relativeTime(t.createdAt)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/tickets/${t.id}`} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="View"><FiEye size={15} /></Link>
                                                <button onClick={() => { setAssigningTicket(t); setShowAssignModal(true) }} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-primary transition-colors" title="Assign"><FiUserPlus size={15} /></button>
                                                <button onClick={() => { setStatusTicket(t); setNewStatus(t.status || 'OPEN'); setResolutionNotes(''); setShowStatusModal(true) }} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-primary transition-colors" title="Status"><FiEdit2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 transition-colors"><FiChevronLeft size={16} /></button>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)} className={clsx('w-9 h-9 rounded-lg text-sm font-medium transition-colors', page === i + 1 ? 'bg-gradient-accent text-white' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]')}>{i + 1}</button>
                        ))}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 transition-colors"><FiChevronRight size={16} /></button>
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setAssigningTicket(null); setAssignTo('') }} title={assigningTicket?.id === 'bulk' ? 'Bulk Assign Tickets' : 'Assign Technician'} size="md" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                    <Button variant="primary" isLoading={assignSubmitting} onClick={handleAssign}>Assign</Button>
                </div>
            }>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {assigningTicket?.id === 'bulk'
                        ? `Assign ${bulkSelected.length} tickets to a technician`
                        : `Assign ticket #${assigningTicket?.ticketNumber || assigningTicket?.id}`}
                </p>
                <Select
                    label="Technician"
                    name="assign-to"
                    value={assignTo}
                    onChange={(v) => setAssignTo(v)}
                    options={[
                        { label: 'Select technician', value: '' },
                        ...technicians.map((tech) => ({ label: tech.name || tech.email, value: tech.id }))
                    ]}
                    placeholder={techniciansLoading ? 'Loading technicians...' : 'Select technician'}
                />
                <div className="mt-3">
                    <TextArea label="Assignment Note (optional)" name="assign-note" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} rows={2} placeholder="e.g., Please prioritize this..." />
                </div>
            </Modal>

            {/* Status Change Modal */}
            <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Ticket Status" size="md" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Cancel</Button>
                    <Button variant="primary" isLoading={statusSubmitting} onClick={handleStatusChange}>Update Status</Button>
                </div>
            }>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Change status for <strong className="text-[var(--text-primary)]">#{statusTicket?.ticketNumber || statusTicket?.id}</strong>
                </p>
                <Select label="New Status" name="new-status" value={newStatus} onChange={(v) => setNewStatus(v)} options={STATUS_ORDER.map((s) => ({ label: STATUS_CONF[s].label, value: s }))} />
                {newStatus === 'RESOLVED' && (
                    <div className="mt-3">
                        <TextArea label="Resolution Notes" name="resolution-notes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={3} placeholder="Describe how the issue was resolved..." required />
                    </div>
                )}
            </Modal>
        </>
    )
}

function StatCard({ label, value, color }) {
    return (
        <Card padding="sm">
            <div className="text-center">
                <p className={clsx('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
            </div>
        </Card>
    )
}
