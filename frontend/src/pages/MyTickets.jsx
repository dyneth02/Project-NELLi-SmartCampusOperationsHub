import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FiAlertCircle,
  FiSearch,
  FiX,
  FiMoreVertical,
  FiEye,
  FiMessageSquare,
  FiTrash2,
  FiPaperclip,
  FiClock,
  FiMapPin,
  FiGrid,
  FiLayers,
  FiImage,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import clsx from 'clsx'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'
import Dropdown from '../components/common/Dropdown'
import { useScrollReveal } from '../hooks/useAnimations'
import { useAuth } from '../context/AuthContext'
import { ticketApi } from '../api/ticketApi'
import { toast } from 'react-toastify'
import { isDisplayableTicketImage, resolveTicketAttachmentSrc } from '../utils/mediaUrl'

/** Same layout toggle pattern as MyBookings.jsx / Facilities.jsx */
const LAYOUT_TILE = 'tile'
const LAYOUT_STACKED = 'stacked'

const TABS = [
  { key: 'ALL', label: 'All', color: '' },
  { key: 'MY', label: 'My Tickets', color: 'text-status-info' },
  { key: 'OPEN', label: 'Open', color: 'text-status-error' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'text-status-warning' },
  { key: 'RESOLVED', label: 'Resolved', color: 'text-status-success' },
  { key: 'CLOSED', label: 'Closed', color: 'text-[var(--text-muted)]' },
]

const PRIORITY_CONFIG = {
  LOW: { variant: 'info', label: 'Low', order: 0 },
  MEDIUM: { variant: 'warning', label: 'Medium', order: 1 },
  HIGH: { variant: 'error', label: 'High', order: 2 },
  URGENT: { variant: 'error', label: 'Urgent', order: 3 },
}

const STATUS_CONFIG = {
  OPEN: { variant: 'error', label: 'Open' },
  IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
  RESOLVED: { variant: 'success', label: 'Resolved' },
  CLOSED: { variant: 'default', label: 'Closed' },
}

function unwrap(res) {
  if (res == null) return null
  return res.data !== undefined ? res.data : res
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTicketImageAttachments(ticket) {
  const list = Array.isArray(ticket?.attachments) ? ticket.attachments : []
  return list.filter(isDisplayableTicketImage)
}

function attachmentLabel(att) {
  return att?.fileName || att?.name || 'Attachment'
}

export default function MyTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusCounts, setStatusCounts] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingTicket, setDeletingTicket] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [layoutView, setLayoutView] = useState(LAYOUT_TILE)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await ticketApi.getAllTickets()
      const list = unwrap(res)
      const arr = Array.isArray(list) ? list : []
      setTickets(arr)

      const myCount = user
          ? arr.filter((t) => {
            const reporterId = t.reportedById ?? t.reportedBy?.id
            return reporterId === user.id
          }).length
          : 0

      const counts = { ALL: arr.length, MY: myCount }
      arr.forEach((t) => {
        counts[t.status] = (counts[t.status] || 0) + 1
      })
      setStatusCounts(counts)
    } catch {
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleDelete = async () => {
    if (!deletingTicket) return
    setDeleting(true)
    try {
      await ticketApi.updateTicket(deletingTicket.id, { status: 'CLOSED' })
      toast.success('Ticket deleted')
      fetchTickets()
    } catch {
      toast.error('Failed to delete ticket')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeletingTicket(null)
    }
  }

  const filteredTickets = useMemo(() => {
    let result = tickets
    if (activeTab === 'MY') {
      result = result.filter((t) => {
        const reporterId = t.reportedById ?? t.reportedBy?.id
        return reporterId === user?.id
      })
    } else if (activeTab !== 'ALL') {
      result = result.filter((t) => t.status === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
          (t) =>
              (t.ticketNumber || t.id || '').toLowerCase().includes(q) ||
              (t.title || t.subject || '').toLowerCase().includes(q) ||
              (t.description || '').toLowerCase().includes(q) ||
              (t.facilityName || '').toLowerCase().includes(q),
      )
    }
    return result.sort((a, b) => {
      const pa = PRIORITY_CONFIG[a.priority]?.order ?? 0
      const pb = PRIORITY_CONFIG[b.priority]?.order ?? 0
      if (pb !== pa) return pb - pa
      return new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)
    })
  }, [tickets, activeTab, searchQuery, user?.id])

  return (
      <>
        <div className="container-custom py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">
              Tickets
            </h1>
            <Link to="/tickets/create">
              <Button variant="primary">Report Issue</Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
                type="text"
                placeholder="Search by ticket number, description, or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl pl-11 pr-10 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                aria-label="Search tickets"
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

          <div className="flex justify-end mb-6">
            <div
                className="inline-flex items-center border border-[var(--border-default)] rounded-lg overflow-hidden"
                role="group"
                aria-label="Ticket layout"
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
                <Button variant="secondary" onClick={fetchTickets}>Retry</Button>
              </Card>
          )}

          {/* Ticket List */}
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
          ) : filteredTickets.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-[var(--text-muted)] mb-3 flex justify-center">
                  {activeTab === 'OPEN' ? (
                      <span className="text-4xl">&#128522;</span>
                  ) : (
                      <FiAlertCircle size={48} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                  {activeTab === 'ALL'
                      ? 'No tickets yet'
                      : activeTab === 'OPEN'
                          ? "No open tickets. You're all set!"
                          : `No ${activeTab.toLowerCase().replace('_', ' ')} tickets`}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {activeTab === 'ALL'
                      ? 'Report an issue to get started'
                      : activeTab === 'OPEN'
                          ? ''
                          : 'Nothing to show here'}
                </p>
                {activeTab === 'ALL' && (
                    <Link to="/tickets/create">
                      <Button variant="primary">Report an Issue</Button>
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
                {filteredTickets.map((ticket, index) => (
                    <TicketCardWithAnimation
                        key={ticket.id}
                        ticket={ticket}
                        index={index}
                        layoutView={layoutView}
                        onDelete={() => {
                          setDeletingTicket(ticket)
                          setShowDeleteModal(true)
                        }}
                    />
                ))}
              </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
            isOpen={showDeleteModal}
            onClose={() => { setShowDeleteModal(false); setDeletingTicket(null) }}
            title="Delete Ticket"
            size="sm"
            footer={
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingTicket(null) }}>
                  Cancel
                </Button>
                <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
                  Yes, Delete
                </Button>
              </div>
            }
        >
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to delete ticket{' '}
            <strong className="text-[var(--text-primary)]">
              {deletingTicket?.ticketNumber || `#${deletingTicket?.id}`}
            </strong>
            ? This action cannot be undone.
          </p>
        </Modal>
      </>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function ticketIconWrapClass(ticket) {
  return clsx(
      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
      ticket.priority === 'URGENT' ? 'bg-status-error/10' :
          ticket.priority === 'HIGH' ? 'bg-status-warning/10' :
              ticket.priority === 'MEDIUM' ? 'bg-status-info/10' : 'bg-[var(--bg-tertiary)]',
  )
}

function ticketIconColorClass(ticket) {
  return ticket.priority === 'URGENT' ? 'text-status-error' :
      ticket.priority === 'HIGH' ? 'text-status-warning' :
          ticket.priority === 'MEDIUM' ? 'text-status-info' : 'text-[var(--text-muted)]'
}

function TicketAttachmentThumb({ src, alt, href, compact }) {
  const [broken, setBroken] = useState(false)
  const frame = clsx(
      'relative block rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] overflow-hidden focus-visible:ring-2 focus-visible:ring-primary/40 outline-none',
      compact ? 'w-14 h-20 flex-shrink-0' : 'h-25 w-full',
  )
  return (
      <Link to={href} className={frame} title={alt} aria-label={alt}>
        {broken || !src ? (
            <span className={clsx(
                'flex w-full items-center justify-center text-[var(--text-muted)]',
                compact ? 'h-14' : 'min-h-[4.5rem] h-full',
            )}
            >
          <FiImage size={compact ? 18 : 22} aria-hidden />
        </span>
        ) : (
            <img
                src={src}
                alt={alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
            />
        )}
      </Link>
  )
}

function TicketAttachmentThumbnails({ ticket, variant }) {
  const images = useMemo(() => getTicketImageAttachments(ticket), [ticket])
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) return null
  const detailHref = `/tickets/${ticket.id}`
  const isTile = variant === 'tile'

  const handlePrev = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const currentAtt = images[currentIndex]

  return (
      <div
          className={clsx(
              'relative group rounded-md',
              isTile ? 'mt-3 w-full' : 'mt-2 w-24'
          )}
          aria-label="Ticket image previews"
      >
        <TicketAttachmentThumb
            key={currentAtt.id || currentIndex}
            src={resolveTicketAttachmentSrc(currentAtt.fileUrl || currentAtt.url, ticket.id)}
            alt={attachmentLabel(currentAtt)}
            href={detailHref}
            compact={!isTile}
        />

        {images.length > 1 && (
            <>
              <button
                  onClick={handlePrev}
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/80 flex items-center justify-center"
                  aria-label="Previous image"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                  onClick={handleNext}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/80 flex items-center justify-center"
                  aria-label="Next image"
              >
                <FiChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, idx) => (
                    <span
                        key={idx}
                        className={clsx(
                            "w-1.5 h-1.5 rounded-full transition-colors shadow-sm",
                            idx === currentIndex ? "bg-white" : "bg-white/50"
                        )}
                    />
                ))}
              </div>
            </>
        )}
      </div>
  )
}

function TicketCardWithAnimation({ ticket, index, layoutView, onDelete }) {
  // Aligning parameters with Facilities
  const { ref: scrollRef } = useScrollReveal({ y: 30, delay: Math.min(index * 0.05, 0.3) })

  const priority = PRIORITY_CONFIG[ticket.priority] || { variant: 'default', label: ticket.priority || 'N/A', order: 0 }
  const status = STATUS_CONFIG[ticket.status] || { variant: 'default', label: ticket.status || 'Unknown' }

  const canDelete = ticket.status === 'OPEN'
  const attachmentCount = ticket.attachmentCount || ticket.attachments?.length || 0
  const commentCount = ticket.commentCount || ticket.comments?.length || 0
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
            { label: 'View Details', icon: <FiEye size={16} />, onClick: () => { window.location.href = `/tickets/${ticket.id}` } },
            { label: 'Add Comment', icon: <FiMessageSquare size={16} />, onClick: () => { window.location.href = `/tickets/${ticket.id}` } },
            ...(canDelete ? [{ label: 'Delete', icon: <FiTrash2 size={16} />, onClick: onDelete, danger: true }] : []),
          ]}
      />
  )

  // Wrap the Card in a plain div to isolate GSAP from the Card's CSS transitions
  return (
      <div ref={scrollRef} className={isTile ? "h-full" : ""}>
        {isTile ? (
            <Card hover className="h-full flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ticketIconWrapClass(ticket)}>
                  <FiAlertCircle size={20} className={ticketIconColorClass(ticket)} />
                </div>
                {dropdown}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-[var(--text-primary)]">
                  #{ticket.ticketNumber || ticket.id}
                </h4>
                <Badge variant={priority.variant}>{priority.label}</Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2 min-h-[2.5rem]">
                ISSUE TYPE - {ticket.category || ticket.subject || 'Maintenance Issue'}
              </p>
              <TicketAttachmentThumbnails ticket={ticket} variant="tile" />
              <div className="mt-3 space-y-1.5 text-xs text-[var(--text-muted)] flex-1">
                {ticket.facilityName && (
                    <p className="flex items-center gap-1 line-clamp-1">
                      <FiMapPin size={12} className="flex-shrink-0" /> {ticket.facilityName}
                    </p>
                )}
                <p className="flex items-center gap-1">
                  <FiClock size={12} /> {relativeTime(ticket.createdAt || ticket.updatedAt)}
                </p>
                {(commentCount > 0 || attachmentCount > 0) && (
                    <p className="flex flex-wrap gap-x-3 gap-y-1">
                      {commentCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                    <FiMessageSquare size={12} /> {commentCount}
                  </span>
                      )}
                      {attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                    <FiPaperclip size={12} /> {attachmentCount}
                  </span>
                      )}
                    </p>
                )}
                {ticket.assignedTo && (
                    <p className="line-clamp-2">Assigned: {ticket.assignedTo}</p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-default)] space-y-3">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Link
                    to={`/tickets/${ticket.id}`}
                    className="block text-sm text-primary hover:underline font-medium"
                >
                  View Details
                </Link>
              </div>
            </Card>
        ) : (
            <Card hover>
              <div className="flex items-start gap-4">
                <div className={ticketIconWrapClass(ticket)}>
                  <FiAlertCircle size={20} className={ticketIconColorClass(ticket)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-semibold text-[var(--text-primary)] truncate">
                          #{ticket.ticketNumber || ticket.id}
                        </h4>
                        <Badge variant={priority.variant}>{priority.label}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">
                        {ticket.title || ticket.subject || 'Maintenance Issue'}
                      </p>
                      <TicketAttachmentThumbnails ticket={ticket} variant="compact" />

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[var(--text-muted)]">
                        {ticket.facilityName && (
                            <span className="flex items-center gap-1">
                        <FiMapPin size={12} /> {ticket.facilityName}
                      </span>
                        )}
                        <span className="flex items-center gap-1">
                      <FiClock size={12} /> {relativeTime(ticket.createdAt || ticket.updatedAt)}
                    </span>
                        {commentCount > 0 && (
                            <span className="flex items-center gap-1">
                        <FiMessageSquare size={12} /> {commentCount}
                      </span>
                        )}
                        {attachmentCount > 0 && (
                            <span className="flex items-center gap-1">
                        <FiPaperclip size={12} /> {attachmentCount}
                      </span>
                        )}
                        {ticket.assignedTo && (
                            <span>Assigned to: {ticket.assignedTo}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                          to={`/tickets/${ticket.id}`}
                          className="text-sm text-primary hover:underline font-medium"
                      >
                        View Details
                      </Link>
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