import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { addDays, endOfMonth, format, parseISO, startOfDay, startOfMonth } from 'date-fns'
import {
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiClock,
  FiArrowLeft,
  FiShare2,
  FiAlertCircle,
  FiCheck,
  FiTool,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Card from '../components/common/Card'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Input from '../components/common/Input'
import TextArea from '../components/common/TextArea'
import Modal from '../components/common/Modal'
import Select from '../components/common/Select'
import { facilityApi } from '../api/facilityApi'
import { bookingApi } from '../api/bookingApi'
import { useAuth } from '../context/AuthContext'

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  const label = `${h.toString().padStart(2, '0')}:${m}`
  return { label, value: `${h.toString().padStart(2, '0')}:${m}` }
})

function unwrap(res) {
  if (res == null) return null
  return res.data !== undefined ? res.data : res
}

function dayKey(date) {
  return format(date, 'yyyy-MM-dd')
}

function parseLocalDateTime(dateIso, time) {
  return parseISO(`${dateIso}T${time}:00`)
}

function hasSlotOverlap(candidateStart, candidateEnd, slotStart, slotEnd) {
  return candidateStart < slotEnd && candidateEnd > slotStart
}

export default function FacilityDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: '',
  })
  const [bookingErrors, setBookingErrors] = useState({})
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [activeMonthDate, setActiveMonthDate] = useState(new Date())
  const [availabilitySlots, setAvailabilitySlots] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  const fetchFacility = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await facilityApi.getFacilityById(id)
      setFacility(res.data ?? res)
    } catch {
      setError('Failed to load facility details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchFacility()
  }, [fetchFacility])

  useEffect(() => {
    if (!id) return
    const fetchAvailability = async () => {
      setAvailabilityLoading(true)
      setAvailabilityError('')
      try {
        const monthStart = startOfMonth(activeMonthDate)
        const monthEnd = endOfMonth(activeMonthDate)
        const res = await bookingApi.getFacilityAvailability(id, {
          startDateTime: format(startOfDay(monthStart), "yyyy-MM-dd'T'HH:mm:ss"),
          endDateTime: format(monthEnd, "yyyy-MM-dd'T'HH:mm:ss"),
        })
        const slots = unwrap(res)
        setAvailabilitySlots(Array.isArray(slots) ? slots : [])
      } catch {
        setAvailabilitySlots([])
        setAvailabilityError('Failed to load approved availability slots.')
      } finally {
        setAvailabilityLoading(false)
      }
    }
    fetchAvailability()
  }, [id, activeMonthDate])

  const approvedSlotsByDate = useMemo(() => {
    return availabilitySlots.reduce((acc, slot) => {
      if (!slot?.startDateTime || !slot?.endDateTime) return acc
      const key = dayKey(parseISO(slot.startDateTime))
      if (!acc[key]) acc[key] = []
      acc[key].push(slot)
      return acc
    }, {})
  }, [availabilitySlots])

  const selectedDateSlots = useMemo(() => {
    if (!bookingData.date) return []
    return approvedSlotsByDate[bookingData.date] || []
  }, [bookingData.date, approvedSlotsByDate])

  const selectedDateConflict = useMemo(() => {
    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime) return false
    const candidateStart = parseLocalDateTime(bookingData.date, bookingData.startTime)
    const candidateEnd = parseLocalDateTime(bookingData.date, bookingData.endTime)
    return selectedDateSlots.some((slot) => hasSlotOverlap(
        candidateStart,
        candidateEnd,
        parseISO(slot.startDateTime),
        parseISO(slot.endDateTime),
    ))
  }, [bookingData.date, bookingData.startTime, bookingData.endTime, selectedDateSlots])

  const [upcomingApprovedBookings, setUpcomingApprovedBookings] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [upcomingError, setUpcomingError] = useState('')

  useEffect(() => {
    if (!id) return
    const fetchUpcoming = async () => {
      setUpcomingLoading(true)
      setUpcomingError('')
      try {
        const now = new Date()
        const end = addDays(now, 60)
        const res = await bookingApi.getFacilityAvailability(id, {
          startDateTime: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
          endDateTime: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
        })
        const slots = unwrap(res)
        const list = Array.isArray(slots) ? slots : []
        setUpcomingApprovedBookings(list)
      } catch {
        setUpcomingApprovedBookings([])
        setUpcomingError('Failed to load upcoming approved bookings.')
      } finally {
        setUpcomingLoading(false)
      }
    }
    fetchUpcoming()
  }, [id])

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!bookingData.date) errs.date = 'Date is required'
    if (!bookingData.startTime) errs.startTime = 'Start time is required'
    if (!bookingData.endTime) errs.endTime = 'End time is required'
    if (bookingData.startTime && bookingData.endTime && bookingData.startTime >= bookingData.endTime)
      errs.endTime = 'End time must be after start time'
    if (selectedDateConflict)
      errs.endTime = 'Selected time overlaps with an approved booking'
    if (!bookingData.purpose.trim()) errs.purpose = 'Purpose is required'
    if (bookingData.attendees && facility?.capacity && Number(bookingData.attendees) > facility.capacity)
      errs.attendees = `Exceeds capacity of ${facility.capacity}`

    setBookingErrors(errs)
    if (Object.keys(errs).length > 0) return

    setBookingSubmitting(true)
    try {
      const startDateTime = `${bookingData.date}T${bookingData.startTime}:00`
      const endDateTime = `${bookingData.date}T${bookingData.endTime}:00`
      await bookingApi.createBooking({
        facilityId: id,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        purpose: bookingData.purpose,
        expectedAttendees: bookingData.attendees ? Number(bookingData.attendees) : undefined,
        contactEmail: user.email,
        isRecurring: false,
      })
      setBookingSuccess(true)
    } catch {
      toast.error('Failed to create booking')
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  if (loading) {
    return (
        <div className="container-custom py-8">
          <LoadingSpinner size="lg" text="Loading facility details..." className="mx-auto" />
        </div>
    )
  }

  if (error || !facility) {
    return (
        <div className="container-custom py-8">
          <Card className="text-center py-12">
            <p className="text-status-error mb-4">{error || 'Facility not found'}</p>
            <Button variant="secondary" onClick={() => navigate('/facilities')}>
              Back to Facilities
            </Button>
          </Card>
        </div>
    )
  }

  const name = facility.name || facility.facilityName || 'Unnamed Facility'
  const facilityType = facility.type || null
  const type = facilityType || 'General'
  const capacity = facility.capacity ?? '?'
  const location = facility.location || 'N/A'
  const description = facility.description || ''
  const status = facility.status || 'ACTIVE'
  const equipment = facility.equipment || []

  const statusMap = {
    ACTIVE: { variant: 'success', label: 'Active' },
    OUT_OF_SERVICE: { variant: 'error', label: 'Out of Service' },
    MAINTENANCE: { variant: 'warning', label: 'Maintenance' },
  }
  const { variant: statusVariant, label: statusLabel } = statusMap[status] || { variant: 'default', label: status }

  return (
      <>
        {/* Scope CSS overriding react-calendar styles for Dark Theme */}
        <style>{`
        .dark-theme-calendar.react-calendar {
          background-color: transparent;
          border: none;
          width: 100%;
          color: var(--text-primary);
          font-family: inherit;
        }
        .dark-theme-calendar .react-calendar__navigation {
          margin-bottom: 1rem;
        }
        .dark-theme-calendar .react-calendar__navigation button {
          color: var(--text-primary);
          min-width: 44px;
          background: none;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 0.5rem;
          padding: 0.5rem;
          transition: background-color 0.2s;
        }
        .dark-theme-calendar .react-calendar__navigation button:enabled:hover,
        .dark-theme-calendar .react-calendar__navigation button:enabled:focus {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .dark-theme-calendar .react-calendar__navigation button:disabled {
          color: var(--text-muted);
        }
        .dark-theme-calendar .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .dark-theme-calendar .react-calendar__month-view__weekdays__weekday {
          padding: 0.5em;
        }
        .dark-theme-calendar .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        .dark-theme-calendar .react-calendar__month-view__days__day {
          color: var(--text-primary);
        }
        .dark-theme-calendar .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--text-muted);
          opacity: 0.5;
        }
        .dark-theme-calendar .react-calendar__tile {
          padding: 0.75em 0.5em;
          background: none;
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }
        .dark-theme-calendar .react-calendar__tile:enabled:hover,
        .dark-theme-calendar .react-calendar__tile:enabled:focus {
          background-color: rgba(132, 255, 130);
          color: black;
        }
        .dark-theme-calendar .react-calendar__tile--now {
          background: rgba(252, 248, 124);
          color: black;
        }
        /* Completely strip react-calendar's default blue active styling so Tailwind works */
        .dark-theme-calendar .react-calendar__tile--active {
          background: none;
          color: inherit;
        }
      `}</style>

        <div className="container-custom py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
            <Link to="/" className="hover:text-[var(--text-primary)] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/facilities" className="hover:text-[var(--text-primary)] transition-colors">Facilities</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] truncate">{name}</span>
          </nav>

          {/* Back button */}
          <button
              onClick={() => navigate('/facilities')}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            <FiArrowLeft size={16} /> Back to Facilities
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image / Hero */}
              <Card padding="none" className="overflow-hidden">
                <div
                    style={facilityType ? { backgroundImage: `url('/${facilityType}.jpg')` } : undefined}
                    className="relative h-56 sm:h-72 flex items-center justify-center bg-cover bg-center"
                >
                  <button
                      onClick={handleShare}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-[var(--bg-card)]/80 backdrop-blur-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Share facility"
                  >
                    <FiShare2 size={18} />
                  </button>
                </div>
              </Card>

              {/* Info */}
              <Card>
                <span>
                  <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-4">{name}</h1>
                </span>
                <span className="flex gap-4">
                  <Badge variant="info">{type}</Badge>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 mt-6">
                  <InfoItem icon={<FiMapPin size={18} />} label="Location" value={location} />
                  <InfoItem icon={<FiUsers size={18} />} label="Capacity" value={capacity} />
                  <InfoItem icon={<FiCalendar size={18} />} label="Type" value={type} />
                  <InfoItem icon={<FiClock size={18} />} label="Status" value={statusLabel} />
                </div>

                {description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Description</h3>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{description}</p>
                    </div>
                )}

                {equipment.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Equipment & Amenities</h3>
                      <div className="flex flex-wrap gap-2">
                        {equipment.map((eq, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                        <FiCheck size={12} className="text-status-success" />
                              {eq}
                      </span>
                        ))}
                      </div>
                    </div>
                )}
              </Card>

              {/* Availability Calendar */}
              <Card>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Upcoming Approved Bookings</h3>
                {upcomingLoading ? (
                    <p className="text-sm text-[var(--text-muted)]">Loading upcoming bookings...</p>
                ) : upcomingError ? (
                    <p className="text-sm text-status-error">{upcomingError}</p>
                ) : upcomingApprovedBookings.length === 0 ? (
                    <p className="text-sm text-status-success flex items-center gap-2">
                      <FiCheck size={14} /> No approved upcoming bookings found.
                    </p>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {upcomingApprovedBookings.map((slot) => (
                          <div
                              key={slot.bookingId}
                              className="flex items-center gap-2 text-sm bg-[var(--bg-tertiary)] p-2 rounded"
                          >
                            <FiClock size={14} className="text-primary" />
                            <span className="text-[var(--text-primary)]">
                        {new Date(slot.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                            <span className="text-[var(--text-muted)]">
                        {formatTimeOnly(slot.startDateTime)} - {formatTimeOnly(slot.endDateTime)}
                      </span>
                          </div>
                      ))}
                    </div>
                )}
              </Card>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-3">
                <Link to={`/tickets/create?facility=${id}`}>
                  <Button variant="secondary" icon={<FiTool />}>Report an Issue</Button>
                </Link>
              </div>
            </div>

            {/* Right: Booking Form (sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <h3 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">
                    {showBookingForm ? 'Book This Facility' : 'Quick Booking'}
                  </h3>

                  {!showBookingForm ? (
                      <>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                          Select a date and time to check availability and request a booking.
                        </p>
                        <Button
                            variant="primary"
                            fullWidth
                            icon={<FiCalendar />}
                            onClick={() => setShowBookingForm(true)}
                        >
                          Book Now
                        </Button>
                      </>
                  ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Date
                          </label>
                          <div className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
                            <Calendar
                                className="dark-theme-calendar"
                                onChange={(value) => {
                                  if (!(value instanceof Date)) return
                                  setBookingData((p) => ({ ...p, date: dayKey(value), startTime: '', endTime: '' }))
                                  setBookingErrors({})
                                }}
                                value={bookingData.date ? parseISO(`${bookingData.date}T00:00:00`) : null}
                                minDate={new Date()}
                                onActiveStartDateChange={({ activeStartDate }) => {
                                  if (activeStartDate) setActiveMonthDate(activeStartDate)
                                }}
                                tileClassName={({ date }) => {
                                  const key = dayKey(date)
                                  const isSelected = bookingData.date === key
                                  return isSelected ? 'bg-primary/15 text-primary font-semibold rounded-md' : 'rounded-md'
                                }}
                                tileContent={({ date }) => {
                                  const key = dayKey(date)
                                  const count = approvedSlotsByDate[key]?.length || 0
                                  if (count === 0) return null
                                  const tooltip = approvedSlotsByDate[key]
                                      .map((slot) => `${formatTimeOnly(slot.startDateTime)} - ${formatTimeOnly(slot.endDateTime)}`)
                                      .join(' | ')
                                  return (
                                      <div className="flex justify-center mt-1" title={`Approved slots: ${tooltip}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />
                                      </div>
                                  )
                                }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Dates with dots have approved bookings. Hover to view booked slots.
                          </p>
                          {availabilityLoading && (
                              <p className="mt-1 text-xs text-[var(--text-muted)]">Loading availability data...</p>
                          )}
                          {availabilityError && (
                              <p className="mt-1 text-xs text-status-error">{availabilityError}</p>
                          )}
                          {bookingErrors.date && (
                              <p className="mt-1 text-sm text-status-error">{bookingErrors.date}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Select
                              label="Start Time"
                              name="start-time"
                              value={bookingData.startTime}
                              onChange={(val) => setBookingData((p) => ({ ...p, startTime: val }))}
                              options={TIME_SLOTS}
                              placeholder="Select"
                              error={bookingErrors.startTime}
                          />
                          <Select
                              label="End Time"
                              name="end-time"
                              value={bookingData.endTime}
                              onChange={(val) => setBookingData((p) => ({ ...p, endTime: val }))}
                              options={TIME_SLOTS}
                              placeholder="Select"
                              error={bookingErrors.endTime}
                          />
                        </div>
                        {bookingData.date && selectedDateSlots.length > 0 && (
                            <div className="p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                                Approved bookings on this date
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedDateSlots.map((slot) => (
                                    <span key={slot.bookingId} className="px-2 py-1 rounded-md text-xs bg-primary/10 text-primary">
                              {formatTimeOnly(slot.startDateTime)} - {formatTimeOnly(slot.endDateTime)}
                            </span>
                                ))}
                              </div>
                            </div>
                        )}
                        {selectedDateConflict && (
                            <p className="text-sm text-status-error">
                              This time selection overlaps with an approved booking.
                            </p>
                        )}

                        <Input
                            label="Expected Attendees"
                            name="attendees"
                            type="number"
                            min="1"
                            max={facility.capacity || 999}
                            value={bookingData.attendees}
                            onChange={(e) => setBookingData((p) => ({ ...p, attendees: e.target.value }))}
                            error={bookingErrors.attendees}
                            placeholder={capacity !== '?' ? `Max ${capacity}` : ''}
                        />

                        <TextArea
                            label="Purpose"
                            name="purpose"
                            placeholder="Brief description of your booking..."
                            value={bookingData.purpose}
                            onChange={(e) => setBookingData((p) => ({ ...p, purpose: e.target.value }))}
                            error={bookingErrors.purpose}
                            rows={3}
                            maxLength={1000}
                            showCharCount
                            required
                        />

                        <div className="flex gap-3">
                          <Button
                              type="button"
                              variant="secondary"
                              className="flex-1"
                              onClick={() => setShowBookingForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                              type="submit"
                              variant="primary"
                              isLoading={bookingSubmitting}
                              className="flex-1"
                          >
                            {bookingSubmitting ? 'Submitting...' : 'Request Booking'}
                          </Button>
                        </div>
                      </form>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        <Modal
            isOpen={bookingSuccess}
            onClose={() => {
              setBookingSuccess(false)
              navigate('/bookings')
            }}
            title="Booking Request Submitted!"
            size="md"
            footer={
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => { setBookingSuccess(false); navigate('/bookings') }}>
                  View My Bookings
                </Button>
                <Button variant="primary" onClick={() => { setBookingSuccess(false); navigate('/facilities') }}>
                  Book Another
                </Button>
              </div>
            }
        >
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-status-success" />
            </div>
            <p className="text-[var(--text-secondary)]">
              Your booking request for <strong className="text-[var(--text-primary)]">{name}</strong> has been submitted and is pending approval.
            </p>
          </div>
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
          <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
  )
}

function formatTimeOnly(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}