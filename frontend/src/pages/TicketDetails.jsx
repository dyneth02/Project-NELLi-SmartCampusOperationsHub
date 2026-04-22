import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiAlertCircle,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUser,
  FiMessageSquare,
  FiPaperclip,
  FiUpload,
  FiX,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiShare2,
  FiPrinter,
  FiCheck,
  FiSend,
  FiTool,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Card from '../components/common/Card'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Input from '../components/common/Input'
import TextArea from '../components/common/TextArea'
import Modal from '../components/common/Modal'
import Select from '../components/common/Select'
import { useFadeIn } from '../hooks/useAnimations'
import { ticketApi } from '../api/ticketApi'
import { facilityApi } from '../api/facilityApi'
import { useAuth } from '../context/AuthContext'
import { isDisplayableTicketImage, resolveTicketAttachmentSrc } from '../utils/mediaUrl'

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
]

const CATEGORY_OPTIONS = [
  { label: 'Equipment Failure', value: 'EQUIPMENT_FAILURE' },
  { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
  { label: 'Cleanliness', value: 'CLEANLINESS' },
  { label: 'Electrical', value: 'ELECTRICAL' },
  { label: 'Plumbing', value: 'PLUMBING' },
  { label: 'Internet Connectivity', value: 'INTERNET' },
  { label: 'Other', value: 'OTHER' },
]

const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

function unwrap(res) {
  if (res == null) return null
  return res.data !== undefined ? res.data : res
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TicketDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editData, setEditData] = useState({ description: '', priority: '', category: '' })
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveSubmitting, setResolveSubmitting] = useState(false)

  const pageRef = useFadeIn({ duration: 0.5, y: 15 })
  const commentInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const isAdmin = user?.role === 'ADMIN'

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/dashboard'
  const ticketsPath = isAdmin ? '/admin/tickets' : '/tickets'

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ticketRes, commentsRes, attachmentsRes] = await Promise.allSettled([
        ticketApi.getTicketById(id),
        ticketApi.getComments(id),
        ticketApi.getAttachments(id),
      ])

      if (ticketRes.status === 'fulfilled') {
        const t = unwrap(ticketRes.value)
        setTicket(t)
        setEditData({
          description: t.description || '',
          priority: t.priority || 'MEDIUM',
          category: t.category || '',
        })
        if (t.facilityId) {
          try {
            const fRes = await facilityApi.getFacilityById(t.facilityId)
            setFacility(unwrap(fRes))
          } catch { /* ignore */ }
        }
      }
      if (commentsRes.status === 'fulfilled') {
        const list = unwrap(commentsRes.value)
        setComments(Array.isArray(list) ? list : [])
      }
      if (attachmentsRes.status === 'fulfilled') {
        const list = unwrap(attachmentsRes.value)
        setAttachments(Array.isArray(list) ? list : [])
      }
    } catch {
      setError('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isCreator = ticket?.reportedById === user?.id
  const isOpen = ticket?.status === 'OPEN'
  const canComment = ticket?.status === 'OPEN' || ticket?.status === 'IN_PROGRESS'
  const isAssignedTechnician = user?.role === 'TECHNICIAN' && (ticket?.assignedToId === user?.id || ticket?.assignedTo?.id === user?.id)
  const canResolve = isAssignedTechnician && ticket?.status === 'IN_PROGRESS'

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    if (!canComment) {
      toast.error('Comments are only allowed on open or in-progress tickets.')
      return
    }
    setCommentSubmitting(true)
    try {
      await ticketApi.addComment(id, newComment)
      setNewComment('')
      fetchData()
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB')
      return
    }
    setUploading(true)
    try {
      await ticketApi.uploadAttachment(id, file)
      toast.success('Image uploaded')
      fetchData()
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await ticketApi.deleteAttachment(attachmentId)
      toast.success('Attachment removed')
      fetchData()
    } catch {
      toast.error('Failed to remove attachment')
    }
  }

  const handleEditTicket = async () => {
    try {
      await ticketApi.updateTicket(id, editData)
      toast.success('Ticket updated')
      setShowEditModal(false)
      fetchData()
    } catch {
      toast.error('Failed to update ticket')
    }
  }

  const handleDeleteTicket = async () => {
    setDeleting(true)
    try {
      await ticketApi.updateTicket(id, { status: 'CLOSED' })
      toast.success('Ticket deleted')
      navigate(ticketsPath)
    } catch {
      toast.error('Failed to delete ticket')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleResolveTicket = async () => {
    if (!resolveNotes.trim()) {
      toast.error('Resolution notes are required to resolve this ticket.')
      return
    }
    setResolveSubmitting(true)
    try {
      await ticketApi.updateTicketStatus(id, { status: 'RESOLVED', resolutionNotes: resolveNotes })
      toast.success('Ticket marked as resolved')
      setShowResolveModal(false)
      setResolveNotes('')
      fetchData()
    } catch {
      toast.error('Failed to resolve ticket')
    } finally {
      setResolveSubmitting(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="container-custom py-8">
        <LoadingSpinner size="lg" text="Loading ticket details..." className="mx-auto" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="container-custom py-8">
        <Card className="text-center py-12">
          <p className="text-status-error mb-4">{error || 'Ticket not found'}</p>
          <Button variant="secondary" onClick={() => navigate(ticketsPath)}>Back to Tickets</Button>
        </Card>
      </div>
    )
  }

  const priorityConfig = {
    LOW: { variant: 'info', label: 'Low' },
    MEDIUM: { variant: 'warning', label: 'Medium' },
    HIGH: { variant: 'error', label: 'High' },
    URGENT: { variant: 'error', label: 'Urgent' },
  }
  const statusConfig = {
    OPEN: { variant: 'error', label: 'Open' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    RESOLVED: { variant: 'success', label: 'Resolved' },
    CLOSED: { variant: 'default', label: 'Closed' },
  }
  const pConf = priorityConfig[ticket.priority] || { variant: 'default', label: ticket.priority }
  const sConf = statusConfig[ticket.status] || { variant: 'default', label: ticket.status }

  const imageAttachments = attachments.filter(isDisplayableTicketImage)

  return (
    <>
    <div ref={pageRef.ref} className="container-custom py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
          <Link to={dashboardPath} className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to={ticketsPath} className="hover:text-[var(--text-primary)] transition-colors">Tickets</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] truncate">#{ticket.ticketNumber || ticket.id}</span>
        </nav>

        <button
          onClick={() => navigate(ticketsPath)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to Tickets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Ticket Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
                      #{ticket.ticketNumber || ticket.id}
                    </h1>
                    <button
                      onClick={handleShare}
                      className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-muted)]"
                      aria-label="Copy ticket number"
                      title="Copy ticket number"
                    >
                      <FiCopy size={14} />
                    </button>
                  </div>
                  <h2 className="text-lg text-[var(--text-secondary)] mt-1">
                    {ticket.title || ticket.category || 'Maintenance Issue'}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={pConf.variant}>{pConf.label}</Badge>
                  <Badge variant={sConf.label === 'In Progress' ? 'warning' : sConf.variant}>{sConf.label}</Badge>
                </div>
              </div>

              {/* Quick info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {facility && (
                  <InfoItem icon={<FiMapPin size={16} />} label="Facility" value={
                    <Link to={`/facilities/${facility.id}`} className="text-primary hover:underline">{facility.name || facility.facilityName}</Link>
                  } />
                )}
                <InfoItem icon={<FiCalendar size={16} />} label="Created" value={formatDate(ticket.createdAt)} />
                <InfoItem icon={<FiUser size={16} />} label="Reported By" value={ticket.reportedByName || 'You'} />
                {ticket.assignedTo && (
                  <InfoItem icon={<FiTool size={16} />} label="Assigned To" value={ticket.assignedTo?.name || ticket.assignedToName || ticket.assignedTo} />
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Description</h3>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {ticket.description || 'No description provided.'}
                </p>
              </div>

              {/* Resolution Notes */}
              {ticket.status === 'RESOLVED' && ticket.resolutionNotes && (
                <div className="p-4 rounded-lg bg-status-success/10 border border-status-success/20 mb-6">
                  <h3 className="text-sm font-semibold text-status-success mb-1">Resolution Notes</h3>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{ticket.resolutionNotes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border-default)]">
                {isCreator && isOpen && (
                  <Button variant="secondary" size="sm" icon={<FiEdit2 />} onClick={() => setShowEditModal(true)}>
                    Edit
                  </Button>
                )}
                {isCreator && isOpen && (
                  <Button variant="danger" size="sm" icon={<FiTrash2 />} onClick={() => setShowDeleteModal(true)}>
                    Delete
                  </Button>
                )}
                {canResolve && (
                  <Button variant="success" size="sm" icon={<FiCheck />} onClick={() => setShowResolveModal(true)}>
                    Resolve Ticket
                  </Button>
                )}
                <Button variant="ghost" size="sm" icon={<FiShare2 />} onClick={handleShare}>
                  Share
                </Button>
                <Button variant="ghost" size="sm" icon={<FiPrinter />} onClick={handlePrint}>
                  Print
                </Button>
              </div>
            </Card>

            {/* Attachments */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-[var(--text-primary)]">
                  Attachments ({attachments.length})
                </h3>
                {isCreator && isOpen && attachments.length < 3 && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      className="hidden"
                      aria-label="Upload image"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FiUpload />}
                      isLoading={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Image
                    </Button>
                  </div>
                )}
              </div>

              {attachments.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">No attachments</p>
              ) : (
                <>
                  {/* Image gallery */}
                  {imageAttachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {imageAttachments.map((img) => {
                        const src = resolveTicketAttachmentSrc(img.fileUrl || img.url, id)
                        return (
                          <div key={img.id} className="relative group">
                            <div
                              className="w-full h-32 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer"
                              onClick={() => setSelectedImage(img)}
                            >
                              {src ? (
                                <img
                                  src={src}
                                  alt={img.fileName || img.name || 'Attachment'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FiPaperclip size={24} className="text-[var(--text-muted)]" />
                              )}
                            </div>
                            {isCreator && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(img.id)}
                                className="absolute top-1 right-1 p-1 rounded bg-status-error text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete attachment"
                              >
                                <FiX size={14} />
                              </button>
                            )}
                            <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{img.fileName || img.name || 'Image'}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Non-image attachments */}
                  {attachments.filter((a) => !isDisplayableTicketImage(a)).map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] mb-2">
                      <div className="flex items-center gap-2">
                        <FiPaperclip size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-primary)]">{att.fileName || att.name || 'File'}</span>
                      </div>
                      {isCreator && (
                        <button onClick={() => handleDeleteAttachment(att.id)} className="text-status-error hover:underline text-sm">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </Card>

            {/* Comments */}
            <Card>
              <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">
                Comments ({comments.length})
              </h3>

              {comments.length > 0 && (
                <div className="space-y-4 mb-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(comment.user?.name || comment.userName || 'U')[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {comment.user?.name || comment.userName || 'Unknown'}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{relativeTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {!canComment && (
                <div className="mb-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-muted)]">
                  Comments are only allowed on tickets that are Open or In Progress.
                </div>
              )}
              {canComment && (
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <TextArea
                    ref={commentInputRef}
                    name="comment"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={commentSubmitting}
                    icon={<FiSend />}
                    className="self-end"
                  >
                    Send
                  </Button>
                </form>
              )}
            </Card>
          </div>

          {/* Right: Activity Timeline (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">
                  Activity Timeline
                </h3>
                <div className="space-y-4">
                  {/* Created */}
                  <TimelineItem
                    icon={<FiAlertCircle size={14} />}
                    color="text-primary"
                    title="Ticket Created"
                    description={`By ${ticket.reportedByName || 'You'}`}
                    time={formatDate(ticket.createdAt)}
                  />

                  {ticket.status !== 'OPEN' && (
                    <TimelineItem
                      icon={<FiTool size={14} />}
                      color="text-status-warning"
                      title="Status Changed"
                      description={`Changed to ${sConf.label}`}
                      time={formatDate(ticket.updatedAt)}
                    />
                  )}

                  {ticket.assignedTo && (
                    <TimelineItem
                      icon={<FiUser size={14} />}
                      color="text-status-info"
                      title="Assigned"
                      description={`To ${ticket.assignedTo?.name || ticket.assignedToName || ticket.assignedTo}`}
                      time={formatDate(ticket.updatedAt)}
                    />
                  )}

                  {ticket.status === 'RESOLVED' && (
                    <TimelineItem
                      icon={<FiCheck size={14} />}
                      color="text-status-success"
                      title="Resolved"
                      description={ticket.resolutionNotes || 'Marked as resolved'}
                      time={formatDate(ticket.resolvedAt || ticket.updatedAt)}
                    />
                  )}

                  {ticket.status === 'CLOSED' && (
                    <TimelineItem
                      icon={<FiCheck size={14} />}
                      color="text-[var(--text-muted)]"
                      title="Closed"
                      time={formatDate(ticket.closedAt || ticket.updatedAt)}
                    />
                  )}

                  {comments.length > 0 && (
                    <TimelineItem
                      icon={<FiMessageSquare size={14} />}
                      color="text-[var(--text-secondary)]"
                      title={`${comments.length} Comment${comments.length > 1 ? 's' : ''}`}
                      description={`Last: "${(comments[comments.length - 1].content || '').slice(0, 50)}..."`}
                      time={relativeTime(comments[comments.length - 1].createdAt)}
                    />
                  )}
                </div>

                {/* Timestamps */}
                <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Timestamps</h4>
                  <div className="space-y-1 text-xs text-[var(--text-muted)]">
                    <p>Created: {formatDate(ticket.createdAt)}</p>
                    <p>Updated: {formatDate(ticket.updatedAt)}</p>
                    {ticket.resolvedAt && <p>Resolved: {formatDate(ticket.resolvedAt)}</p>}
                    {ticket.closedAt && <p>Closed: {formatDate(ticket.closedAt)}</p>}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Ticket"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditTicket}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Priority"
            name="edit-priority"
            value={editData.priority}
            onChange={(val) => setEditData((p) => ({ ...p, priority: val }))}
            options={PRIORITY_OPTIONS}
          />
          <Select
            label="Category"
            name="edit-category"
            value={editData.category}
            onChange={(val) => setEditData((p) => ({ ...p, category: val }))}
            options={CATEGORY_OPTIONS}
          />
          <TextArea
            label="Description"
            name="edit-description"
            value={editData.description}
            onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
            rows={5}
            maxLength={5000}
            showCharCount
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Ticket"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" isLoading={deleting} onClick={handleDeleteTicket}>Yes, Delete</Button>
          </div>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to delete ticket <strong className="text-[var(--text-primary)]">#{ticket.ticketNumber || ticket.id}</strong>?
          This action cannot be undone.
        </p>
      </Modal>

      {/* Resolve Ticket Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Ticket"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowResolveModal(false)}>Cancel</Button>
            <Button variant="primary" isLoading={resolveSubmitting} onClick={handleResolveTicket}>Resolve</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Add a resolution note to mark this ticket as resolved.
          </p>
          <TextArea
            label="Resolution Notes"
            name="resolve-notes"
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            rows={4}
            required
          />
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title={selectedImage?.fileName || selectedImage?.name || 'Image Preview'}
        size="lg"
      >
        {resolveTicketAttachmentSrc(selectedImage?.fileUrl || selectedImage?.url, id) ? (
          <img
            src={resolveTicketAttachmentSrc(selectedImage.fileUrl || selectedImage.url, id)}
            alt={selectedImage.fileName || selectedImage.name || 'Attachment'}
            className="w-full rounded-lg"
          />
        ) : (
          <div className="w-full h-64 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center">
            <FiPaperclip size={48} className="text-[var(--text-muted)]" />
          </div>
        )}
      </Modal>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}

function TimelineItem({ icon, color, title, description, time }) {
  return (
    <div className="flex gap-3">
      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', color, 'bg-current/10')}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        {description && <p className="text-xs text-[var(--text-secondary)] truncate">{description}</p>}
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{time}</p>
      </div>
    </div>
  )
}
