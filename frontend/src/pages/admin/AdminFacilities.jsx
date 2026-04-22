import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    FiPlus,
    FiSearch,
    FiX,
    FiEdit2,
    FiTrash2,
    FiMapPin,
    FiUsers,
    FiCalendar,
    FiAlertCircle,
    FiChevronLeft,
    FiChevronRight,
    FiDownload,
    FiUpload,
    FiEye,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import TextArea from '../../components/common/TextArea'
import Select from '../../components/common/Select'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { facilityApi } from '../../api/facilityApi'

const TYPES = [
    { label: 'Lecture Hall', value: 'LECTURE_HALL' },
    { label: 'Laboratory', value: 'LAB' },
    { label: 'Computer Lab', value: 'COMPUTER_LAB' },
    { label: 'Meeting Room', value: 'MEETING_ROOM' },
    { label: 'Auditorium', value: 'AUDITORIUM' },
    { label: 'Sports Facility', value: 'SPORTS_FACILITY' },
    { label: 'Gymnasium', value: 'GYMNASIUM' },
    { label: 'Playground', value: 'PLAY_GROUND' },
    { label: 'Equipment', value: 'EQUIPMENT' },
]

const STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Out of Service', value: 'OUT_OF_SERVICE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
]

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

export default function AdminFacilities() {
    const [facilities, setFacilities] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const ITEMS_PER_PAGE = 15

    // Modal states
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingFacility, setEditingFacility] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingFacility, setDeletingFacility] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState({ name: '', type: '', capacity: '', location: '', description: '', status: 'ACTIVE', equipment: '' })
    const [formErrors, setFormErrors] = useState({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: ITEMS_PER_PAGE }
            if (searchQuery) params.search = searchQuery
            if (filterType) params.type = filterType
            if (filterStatus) params.status = filterStatus

            const res = await facilityApi.getAllFacilities(params)
            const data = unwrap(res)
            const list = Array.isArray(data) ? data : data.content || []
            setFacilities(list)
            setTotalPages(data.totalPages ?? 1)
            setTotalCount(data.totalElements ?? list.length)
        } catch {
            toast.error('Failed to load facilities')
        } finally {
            setLoading(false)
        }
    }, [page, searchQuery, filterType, filterStatus])

    useEffect(() => { fetchData() }, [fetchData])

    const openEdit = (f) => {
        setEditingFacility(f)
        setFormData({ name: f.name || '', type: f.type || '', capacity: f.capacity || '', location: f.location || '', description: f.description || '', status: f.status || 'ACTIVE', equipment: (f.equipment || []).join(', ') })
        setShowFormModal(true)
    }

    const openCreate = () => {
        setEditingFacility(null)
        setFormData({ name: '', type: '', capacity: '', location: '', description: '', status: 'ACTIVE', equipment: '' })
        setFormErrors({})
        setShowFormModal(true)
    }

    const validateForm = () => {
        const errs = {}
        if (!formData.name.trim()) errs.name = 'Name is required'
        if (!formData.type) errs.type = 'Type is required'
        if (!formData.location.trim()) errs.location = 'Location is required'
        if (formData.type !== 'EQUIPMENT' && (!formData.capacity || Number(formData.capacity) <= 0)) errs.capacity = 'Capacity must be > 0'
        return errs
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validateForm()
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return }

        setSubmitting(true)
        try {
            const payload = {
                name: formData.name.trim(),
                type: formData.type,
                capacity: formData.type !== 'EQUIPMENT' ? Number(formData.capacity) : undefined,
                location: formData.location.trim(),
                description: formData.description.trim() || undefined,
                status: formData.status,
                equipment: formData.equipment.split(',').map((s) => s.trim()).filter(Boolean),
            }

            if (editingFacility) {
                await facilityApi.updateFacility(editingFacility.id, payload)
                toast.success('Facility updated')
            } else {
                await facilityApi.createFacility(payload)
                toast.success('Facility created')
            }
            setShowFormModal(false)
            fetchData()
        } catch {
            toast.error(editingFacility ? 'Failed to update facility' : 'Failed to create facility')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingFacility) return
        setDeleting(true)
        try {
            await facilityApi.deleteFacility(deletingFacility.id)
            toast.success('Facility deleted')
            setShowDeleteModal(false)
            setDeletingFacility(null)
            fetchData()
        } catch (err) {
            if (err.response?.status === 409) {
                toast.error('Cannot delete facility with active bookings')
            } else {
                toast.error('Failed to delete facility')
            }
        } finally {
            setDeleting(false)
        }
    }

    const clearFilters = () => { setSearchQuery(''); setFilterType(''); setFilterStatus(''); setPage(1) }

    const activeCount = facilities.filter((f) => f.status === 'ACTIVE').length
    const inactiveCount = facilities.filter((f) => f.status !== 'ACTIVE').length

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">Manage Facilities</h1>
                        <p className="text-[var(--text-secondary)] mt-1">{totalCount} facilities</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon={<FiDownload />}>Export</Button>
                        <Button variant="primary" size="sm" icon={<FiPlus />} onClick={openCreate}>Add Facility</Button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total" value={totalCount} color="text-[var(--text-primary)]" bg="bg-[var(--bg-tertiary)]" />
                    <StatCard label="Active" value={activeCount} color="text-status-success" bg="bg-status-success/10" />
                    <StatCard label="Out of Service" value={inactiveCount} color="text-status-error" bg="bg-status-error/10" />
                    <StatCard label="Types" value={TYPES.length} color="text-primary" bg="bg-primary/10" />
                </div>

                {/* Search & Filters */}
                <Card padding="sm" className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input type="text" placeholder="Search facilities..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-1 focus:ring-primary/20 outline-none" />
                        </div>
                        <Select name="ftype" value={filterType} onChange={(v) => { setFilterType(v); setPage(1) }} options={[{ label: 'All Types', value: '' }, ...TYPES]} className="w-44" />
                        <Select name="fstatus" value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1) }} options={STATUS_OPTIONS} className="w-44" />
                        {(searchQuery || filterType || filterStatus) && <Button variant="ghost" size="sm" icon={<FiX />} onClick={clearFilters}>Clear</Button>}
                    </div>
                </Card>

                {/* Table */}
                {loading ? (
                    <LoadingSpinner text="Loading facilities..." className="mx-auto" />
                ) : facilities.length === 0 ? (
                    <Card className="text-center py-12">
                        <FiMapPin size={48} className="mx-auto text-[var(--text-muted)] mb-3" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No facilities found</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">Add your first facility to get started</p>
                        <Button variant="primary" onClick={openCreate}>Add Facility</Button>
                    </Card>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">Name</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden md:table-cell">Type</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden sm:table-cell">Capacity</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)] hidden lg:table-cell">Location</th>
                                    <th className="p-3 text-left font-medium text-[var(--text-muted)]">Status</th>
                                    <th className="p-3 text-right font-medium text-[var(--text-muted)]">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {facilities.map((f) => {
                                    const statusConf = { ACTIVE: { variant: 'success', label: 'Active' }, OUT_OF_SERVICE: { variant: 'error', label: 'Out of Service' }, MAINTENANCE: { variant: 'warning', label: 'Maintenance' } }
                                    const sc = statusConf[f.status] || { variant: 'default', label: f.status }
                                    return (
                                        <tr key={f.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-colors">
                                            <td className="p-3 font-medium text-[var(--text-primary)] max-w-[200px] truncate">{f.name || f.facilityName}</td>
                                            <td className="p-3 text-[var(--text-secondary)] hidden md:table-cell"><Badge size="sm">{f.type}</Badge></td>
                                            <td className="p-3 text-[var(--text-secondary)] hidden sm:table-cell">{f.capacity ?? '—'}</td>
                                            <td className="p-3 text-[var(--text-secondary)] hidden lg:table-cell truncate max-w-[150px]">{f.location}</td>
                                            <td className="p-3"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link to={`/facilities/${f.id}`} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="View"><FiEye size={15} /></Link>
                                                    <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-primary transition-colors" title="Edit"><FiEdit2 size={15} /></button>
                                                    <button onClick={() => { setDeletingFacility(f); setShowDeleteModal(true) }} className="p-1.5 rounded hover:bg-status-error/10 text-[var(--text-muted)] hover:text-status-error transition-colors" title="Delete"><FiTrash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-[var(--text-muted)]">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 transition-colors"><FiChevronLeft size={16} /></button>
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--border-accent)] disabled:opacity-40 transition-colors"><FiChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingFacility ? 'Edit Facility' : 'Add Facility'} size="lg" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowFormModal(false)}>Cancel</Button>
                    <Button variant="primary" isLoading={submitting} onClick={handleSubmit}>{editingFacility ? 'Update' : 'Create'}</Button>
                </div>
            }>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Name" name="fname" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} error={formErrors.name} required />
                    <Select label="Type" name="ftype" value={formData.type} onChange={(v) => setFormData((p) => ({ ...p, type: v }))} options={TYPES} error={formErrors.type} />
                    {formData.type !== 'EQUIPMENT' && (
                        <Input label="Capacity" name="fcapacity" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))} error={formErrors.capacity} required />
                    )}
                    <Input label="Location" name="flocation" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} error={formErrors.location} required />
                    <Select label="Status" name="fstatus" value={formData.status} onChange={(v) => setFormData((p) => ({ ...p, status: v }))} options={STATUS_OPTIONS.slice(1)} />
                    <TextArea label="Description" name="fdesc" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} />
                    <Input label="Equipment (comma separated)" name="fequipment" value={formData.equipment} onChange={(e) => setFormData((p) => ({ ...p, equipment: e.target.value }))} placeholder="Projector, Whiteboard, AC" />
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Facility" size="sm" footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button variant="danger" isLoading={deleting} onClick={handleDelete}>Delete</Button>
                </div>
            }>
                <p className="text-[var(--text-secondary)]">
                    Are you sure you want to delete <strong className="text-[var(--text-primary)]">{deletingFacility?.name || deletingFacility?.facilityName}</strong>?
                    This action cannot be undone.
                </p>
                <div className="mt-3 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning flex items-start gap-2">
                    <FiAlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>If this facility has active bookings, deletion will be blocked. Consider deactivating instead.</span>
                </div>
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
