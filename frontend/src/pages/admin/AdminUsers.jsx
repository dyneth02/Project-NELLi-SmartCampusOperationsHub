import { useState, useEffect, useCallback } from 'react'
import {
    FiSearch,
    FiX,
    FiUser,
    FiEdit2,
    FiShield,
    FiChevronLeft,
    FiChevronRight,
    FiDownload,
    FiMoreVertical,
    FiMail,
    FiPhone,
    FiCalendar,
    FiClock,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Dropdown from '../../components/common/Dropdown'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { userApi } from '../../api/userApi'

const ROLES = [
    { label: 'All Roles', value: '' },
    { label: 'User', value: 'USER' },
    { label: 'Technician', value: 'TECHNICIAN' },
    { label: 'Admin', value: 'ADMIN' },
]

const STATUS_FILTERS = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
]

const ROLE_CONF = {
    USER: { variant: 'default', label: 'User', color: 'text-[var(--text-secondary)]' },
    TECHNICIAN: { variant: 'info', label: 'Technician', color: 'text-status-info' },
    ADMIN: { variant: 'error', label: 'Admin', color: 'text-status-error' },
}

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function relativeTime(d) {
    if (!d) return 'Never'
    const diff = Math.floor((new Date() - new Date(d)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 15

    const [showRoleModal, setShowRoleModal] = useState(false)
    const [roleUser, setRoleUser] = useState(null)
    const [newRole, setNewRole] = useState('')
    const [roleSubmitting, setRoleSubmitting] = useState(false)

    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [totalCount, setTotalCount] = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = {}
            if (filterRole) params.role = filterRole
            if (filterStatus) params.status = filterStatus

            const res = await userApi.getAllUsers(params)
            const list = unwrap(res)
            const arr = Array.isArray(list) ? list : []

            // Client-side search + pagination
            let filtered = arr
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                filtered = filtered.filter(
                    (u) =>
                        (u.name || u.fullName || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q),
                )
            }

            const start = (page - 1) * ITEMS_PER_PAGE
            const paginated = filtered.slice(start, start + ITEMS_PER_PAGE)
            setUsers(paginated)
            setTotalCount(filtered.length)
        } catch {
            toast.error('Failed to load users')
            setUsers([])
        } finally {
            setLoading(false)
        }
    }, [searchQuery, filterRole, filterStatus, page])

    useEffect(() => { fetchData() }, [fetchData])

    const handleRoleChange = async () => {
        if (!roleUser || !newRole) return
        setRoleSubmitting(true)
        try {
            await userApi.updateUserRole(roleUser.id, newRole)
            setUsers((prev) => prev.map((u) => u.id === roleUser.id ? { ...u, role: newRole } : u))
            toast.success(`Role changed to ${ROLE_CONF[newRole]?.label}`)
            setShowRoleModal(false)
            setRoleUser(null)
            setNewRole('')
            fetchData()
        } catch {
            toast.error('Failed to change role')
        } finally {
            setRoleSubmitting(false)
        }
    }

    const toggleStatus = async (u) => {
        const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        const newEnabled = newStatus === 'ACTIVE'
        try {
            await userApi.updateUserStatus(u.id, newEnabled)
            setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: newStatus } : x))
            toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
            fetchData()
        } catch {
            toast.error('Failed to update status')
        }
    }

    const filteredUsers = users
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
    const activeUsers = users.filter((u) => u.status === 'ACTIVE').length
    const adminCount = users.filter((u) => u.role === 'ADMIN').length

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">User Management</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Manage roles, access, and accounts</p>
                    </div>
                    <Button variant="secondary" size="sm" icon={<FiDownload />}>Export Users</Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total Users" value={totalCount} color="text-[var(--text-primary)]" bg="bg-[var(--bg-tertiary)]" />
                    <StatCard label="Active" value={activeUsers} color="text-status-success" bg="bg-status-success/10" />
                    <StatCard label="Admins" value={adminCount} color="text-status-error" bg="bg-status-error/10" />
                    <StatCard label="This Month" value={2} color="text-primary" bg="bg-primary/10" />
                </div>

                {/* Search & Filters */}
                <Card padding="sm" className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-1 focus:ring-primary/20 outline-none" />
                        </div>
                        <Select name="urole" value={filterRole} onChange={(v) => { setFilterRole(v); setPage(1) }} options={ROLES} className="w-40" />
                        <Select name="ustatus" value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1) }} options={STATUS_FILTERS} className="w-40" />
                        {(searchQuery || filterRole || filterStatus) && <Button variant="ghost" size="sm" icon={<FiX />} onClick={() => { setSearchQuery(''); setFilterRole(''); setFilterStatus(''); setPage(1) }}>Clear</Button>}
                    </div>
                </Card>

                {/* Table */}
                {loading ? (
                    <LoadingSpinner text="Loading users..." className="mx-auto" />
                ) : filteredUsers.length === 0 ? (
                    <Card className="text-center py-12">
                        <FiUser size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No users found</h3>
                    </Card>
                ) : (
                    <div className="rounded-xl border border-[var(--border-default)]" style={{ overflow: 'visible' }}>
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                            <tr>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)]">User</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden md:table-cell">Email</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Phone</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)]">Role</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden sm:table-cell">Status</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Auth</th>
                                <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden xl:table-cell">Last Login</th>
                                <th className="p-3 text-right font-medium text-[var(--text-muted)]">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredUsers.map((u) => {
                                const rConf = ROLE_CONF[u.role] || { variant: 'default', label: u.role }
                                return (
                                    <tr key={u.id} className={clsx('border-b border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-colors', u.status === 'INACTIVE' && 'opacity-60')}>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-primary">{u.name[0]}</span>
                                                </div>
                                                <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-[var(--text-secondary)] hidden md:table-cell truncate max-w-[200px]">{u.email}</td>
                                        <td className="p-3 text-[var(--text-muted)] hidden lg:table-cell">{u.phone || '—'}</td>
                                        <td className="p-3"><Badge variant={rConf.variant}>{rConf.label}</Badge></td>
                                        <td className="p-3 hidden sm:table-cell">
                                            <Badge variant={u.status === 'ACTIVE' ? 'success' : 'default'}>{u.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                                        </td>
                                        <td className="p-3 hidden lg:table-cell"><Badge size="sm">{u.authProvider}</Badge></td>
                                        <td className="p-3 text-[var(--text-muted)] whitespace-nowrap hidden xl:table-cell">{relativeTime(u.lastLogin)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setSelectedUser(u); setShowDetailsModal(true) }} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="View details"><FiUser size={15} /></button>
                                                <Dropdown
                                                    align="right"
                                                    trigger={
                                                        <button className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="More actions"><FiMoreVertical size={15} /></button>
                                                    }
                                                    items={[
                                                        { label: 'Change Role', icon: <FiShield size={14} />, onClick: () => { setRoleUser(u); setNewRole(u.role); setShowRoleModal(true) } },
                                                        { label: u.status === 'ACTIVE' ? 'Deactivate' : 'Activate', icon: <FiEdit2 size={14} />, onClick: () => toggleStatus(u) },
                                                    ]}
                                                />
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
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)} className={clsx('w-9 h-9 rounded-lg text-sm font-medium transition-colors', page === i + 1 ? 'bg-gradient-accent text-white' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]')}>{i + 1}</button>
                        ))}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 transition-colors"><FiChevronRight size={16} /></button>
                    </div>
                )}
            </div>

            {/* Role Change Modal */}
            <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change Role" size="md" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
                    <Button variant="primary" isLoading={roleSubmitting} onClick={handleRoleChange}>Change Role</Button>
                </div>
            }>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Change role for <strong className="text-[var(--text-primary)]">{roleUser?.name}</strong>
                </p>
                <p className="text-xs text-status-warning mb-3 flex items-center gap-1">
                    <FiShield size={12} /> Changing role will affect user permissions
                </p>
                <div className="space-y-2">
                    {['USER', 'TECHNICIAN', 'ADMIN'].map((role) => {
                        const conf = ROLE_CONF[role]
                        return (
                            <label key={role} className={clsx('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors', newRole === role ? 'border-[var(--border-accent)] bg-primary/5' : 'border-[var(--border-default)] hover:border-[var(--border-accent)]')}>
                                <input type="radio" name="new-role" checked={newRole === role} onChange={() => setNewRole(role)} className="w-4 h-4 text-primary focus:ring-primary" />
                                <div>
                                    <p className={clsx('text-sm font-medium', conf.color)}>{conf.label}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {role === 'USER' && 'Standard access — can book facilities and create tickets'}
                                        {role === 'TECHNICIAN' && 'Can view and resolve assigned tickets'}
                                        {role === 'ADMIN' && 'Full access — manage all facilities, bookings, tickets, and users'}
                                    </p>
                                </div>
                            </label>
                        )
                    })}
                </div>
            </Modal>

            {/* User Details Modal */}
            <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="User Details" size="lg" footer={
                <div className="flex justify-end"><Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button></div>
            }>
                {selectedUser && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-xl font-bold text-primary">{selectedUser.name[0]}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedUser.name}</h3>
                                <p className="text-sm text-[var(--text-secondary)]">{selectedUser.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailItem icon={<FiMail size={14} />} label="Email" value={selectedUser.email} />
                            <DetailItem icon={<FiPhone size={14} />} label="Phone" value={selectedUser.phone || '—'} />
                            <DetailItem icon={<FiShield size={14} />} label="Role" value={ROLE_CONF[selectedUser.role]?.label} />
                            <DetailItem icon={<FiCalendar size={14} />} label="Registered" value={formatDate(selectedUser.registeredAt)} />
                            <DetailItem icon={<FiClock size={14} />} label="Last Login" value={relativeTime(selectedUser.lastLogin)} />
                            <DetailItem icon={<FiUser size={14} />} label="Auth Provider" value={selectedUser.authProvider} />
                        </div>
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

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <span className="text-primary">{icon}</span>
            <div>
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="text-sm text-[var(--text-primary)]">{value}</p>
            </div>
        </div>
    )
}
