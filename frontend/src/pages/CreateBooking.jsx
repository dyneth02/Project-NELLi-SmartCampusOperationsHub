import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { endOfMonth, format, parseISO, startOfDay, startOfMonth } from 'date-fns'
import {
    FiArrowLeft,
    FiArrowRight,
    FiMapPin,
    FiUsers,
    FiCalendar,
    FiClock,
    FiCheck,
    FiSearch,
    FiX,
    FiRepeat,
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Input from '../components/common/Input'
import TextArea from '../components/common/TextArea'
import Select from '../components/common/Select'
import Modal from '../components/common/Modal'
import { useFadeIn } from '../hooks/useAnimations'
import { facilityApi } from '../api/facilityApi'
import { bookingApi } from '../api/bookingApi'
import { useAuth } from '../context/AuthContext'
import gsap from 'gsap'

/** UI weekday codes → {@code java.time.DayOfWeek} JSON names for the API */
const WEEKDAY_CODE_TO_API = {
    MO: 'MONDAY',
    TU: 'TUESDAY',
    WE: 'WEDNESDAY',
    TH: 'THURSDAY',
    FR: 'FRIDAY',
    SA: 'SATURDAY',
    SU: 'SUNDAY',
}

const JS_DOW_TO_CODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function toApiRecurrenceDays(formData) {
    let codes = formData.recurrenceDays
    if ((!codes || codes.length === 0) && formData.date) {
        const d = new Date(`${formData.date}T12:00:00`)
        if (!Number.isNaN(d.getTime())) codes = [JS_DOW_TO_CODE[d.getDay()]]
    }
    if (!codes || codes.length === 0) return []
    return codes.map((c) => WEEKDAY_CODE_TO_API[c]).filter(Boolean)
}

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
    const h = Math.floor(i / 2) + 7
    const m = i % 2 === 0 ? '00' : '30'
    return { label: `${h.toString().padStart(2, '0')}:${m}`, value: `${h.toString().padStart(2, '0')}:${m}` }
})

const RECURRENCE_TYPES = [
    { label: 'None', value: 'NONE' },
    { label: 'Weekly', value: 'WEEKLY' },
    { label: 'Monthly', value: 'MONTHLY' },
]

const WEEKDAYS = [
    { label: 'Mon', value: 'MO' },
    { label: 'Tue', value: 'TU' },
    { label: 'Wed', value: 'WE' },
    { label: 'Thu', value: 'TH' },
    { label: 'Fri', value: 'FR' },
    { label: 'Sat', value: 'SA' },
    { label: 'Sun', value: 'SU' },
]

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

function calcRecurrenceCount(startDate, endDate, type, weekdays) {
    if (type === 'NONE') return 1
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 1
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    if (type === 'WEEKLY') {
        const wdCount = weekdays.length || 1
        return Math.max(1, Math.ceil(days / 7) * wdCount)
    }
    if (type === 'MONTHLY') {
        return Math.max(1, Math.ceil(days / 30))
    }
    return 1
}

function ReviewSection({ label, editAction, children }) {
    return (
        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                <button type="button" onClick={editAction} className="text-xs text-primary hover:underline">Edit</button>
            </div>
            {children}
        </div>
    )
}

export default function CreateBooking() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [searchParams] = useSearchParams()
    const prefilledFacilityId = searchParams.get('facility')

    const [step, setStep] = useState(1)
    const [facilities, setFacilities] = useState([])
    const [facilitiesLoading, setFacilitiesLoading] = useState(true)
    const [selectedFacility, setSelectedFacility] = useState(null)
    const [bookingSubmitting, setBookingSubmitting] = useState(false)
    const [successModal, setSuccessModal] = useState(false)
    const [bookingReference, setBookingReference] = useState('')
    const [conflictWarning, setConflictWarning] = useState('')
    const [availabilitySlots, setAvailabilitySlots] = useState([])
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    const [availabilityError, setAvailabilityError] = useState('')
    const [activeMonthDate, setActiveMonthDate] = useState(new Date())
    const [errors, setErrors] = useState({})

    const [formData, setFormData] = useState({
        facilityId: prefilledFacilityId || '',
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: '',
        recurring: false,
        recurrenceType: 'WEEKLY',
        recurrenceDays: [],
        recurrenceEndDate: '',
    })

    const formRef = useRef(null)
    const pageRef = useFadeIn({ duration: 0.5, y: 15 })

    const totalSteps = 4

    /* ── Fetch facilities ───────────────────────────────────── */
    useEffect(() => {
        const fetch = async () => {
            setFacilitiesLoading(true)
            try {
                const res = await facilityApi.getAllFacilities({ status: 'ACTIVE', limit: 100 })
                const list = unwrap(res)
                setFacilities(Array.isArray(list) ? list : [])
            } catch {
                setFacilities([])
            } finally {
                setFacilitiesLoading(false)
            }
        }
        fetch()
    }, [])

    /* ── Load from prefilled facility ───────────────────────── */
    useEffect(() => {
        if (prefilledFacilityId && facilities.length > 0) {
            const found = facilities.find((f) => f.id === prefilledFacilityId)
            if (found) {
                setSelectedFacility(found)
                setFormData((p) => ({ ...p, facilityId: found.id }))
            }
        }
    }, [prefilledFacilityId, facilities])

    /* ── Load draft from localStorage ───────────────────────── */
    useEffect(() => {
        try {
            const draft = localStorage.getItem('booking-draft')
            if (draft) {
                const parsed = JSON.parse(draft)
                setFormData((p) => ({ ...p, ...parsed }))
            }
        } catch { /* ignore */ }
    }, [])

    /* ── Save draft ─────────────────────────────────────────── */
    useEffect(() => {
        try {
            localStorage.setItem('booking-draft', JSON.stringify(formData))
        } catch { /* ignore */ }
    }, [formData])

    /* ── Step slide animation ──────────────────────────────── */
    useEffect(() => {
        if (formRef.current) {
            gsap.fromTo(formRef.current, { opacity: 0, x: 25 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' })
        }
    }, [step])

    /* ── Helpers ────────────────────────────────────────────── */
    const updateField = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
    }

    const validateStep1 = () => {
        if (!formData.facilityId) return { facilityId: 'Please select a facility' }
        return {}
    }

    const validateStep2 = () => {
        const errs = {}
        if (!formData.date) errs.date = 'Date is required'
        else if (new Date(formData.date) < new Date(new Date().toISOString().split('T')[0])) errs.date = 'Date must be in the future'
        if (!formData.startTime) errs.startTime = 'Start time is required'
        if (!formData.endTime) errs.endTime = 'End time is required'
        if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) errs.endTime = 'End time must be after start time'
        if (selectedDateConflict) errs.endTime = 'Selected time overlaps with an approved booking.'
        if (formData.recurring && !formData.recurrenceEndDate) errs.recurrenceEndDate = 'End date is required for recurring bookings'
        return errs
    }

    const validateStep3 = () => {
        const errs = {}
        if (!formData.purpose.trim()) errs.purpose = 'Purpose is required'
        if (formData.purpose.length > 1000) errs.purpose = 'Purpose must be under 1000 characters'
        if (formData.attendees && selectedFacility?.capacity && Number(formData.attendees) > selectedFacility.capacity)
            errs.attendees = `Exceeds capacity of ${selectedFacility.capacity}`
        return errs
    }

    const nextStep = () => {
        let errs = {}
        if (step === 1) errs = validateStep1()
        if (step === 2) errs = validateStep2()
        if (step === 3) errs = validateStep3()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }
        setErrors({})
        setStep((p) => Math.min(p + 1, totalSteps))
    }

    const prevStep = () => {
        setErrors({})
        setStep((p) => Math.max(p - 1, 1))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const contactEmail = user?.email?.trim()
        if (!contactEmail) {
            toast.error('Your account has no email on file. Update your profile, then try again.')
            return
        }

        setBookingSubmitting(true)
        setConflictWarning('')
        try {
            const startDateTime = `${formData.date}T${formData.startTime}:00`
            const endDateTime = `${formData.date}T${formData.endTime}:00`

            const payload = {
                facilityId: formData.facilityId,
                startDateTime,
                endDateTime,
                purpose: formData.purpose,
                expectedAttendees: formData.attendees ? Number(formData.attendees) : undefined,
                contactEmail,
                isRecurring: false,
            }

            let res
            if (formData.recurring && formData.recurrenceType !== 'NONE') {
                const apiDays = toApiRecurrenceDays(formData)
                if (apiDays.length === 0) {
                    toast.error('Select at least one weekday for a recurring booking.')
                    setBookingSubmitting(false)
                    return
                }
                payload.isRecurring = true
                payload.recurrenceType = formData.recurrenceType
                payload.recurrenceDays = apiDays
                payload.recurrenceEndDate = formData.recurrenceEndDate
                res = await bookingApi.createRecurringBooking(payload)
            } else {
                res = await bookingApi.createBooking(payload)
            }

            const data = unwrap(res)
            setBookingReference(data?.id || data?.reference || 'N/A')
            setSuccessModal(true)
            localStorage.removeItem('booking-draft')
        } catch (err) {
            if (err.response?.status === 409) {
                setConflictWarning(err.response?.data?.message || 'This time slot conflicts with an existing booking.')
            } else {
                const msg = err.response?.data?.message
                toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Failed to create booking')
            }
        } finally {
            setBookingSubmitting(false)
        }
    }

    const recurrenceCount = useMemo(() => {
        if (!formData.recurring) return 1
        return calcRecurrenceCount(formData.date, formData.recurrenceEndDate, formData.recurrenceType, formData.recurrenceDays)
    }, [formData.recurring, formData.date, formData.recurrenceEndDate, formData.recurrenceType, formData.recurrenceDays])

    const duration = useMemo(() => {
        if (!formData.startTime || !formData.endTime) return ''
        const [sh, sm] = formData.startTime.split(':').map(Number)
        const [eh, em] = formData.endTime.split(':').map(Number)
        const mins = (eh * 60 + em) - (sh * 60 + sm)
        if (mins <= 0) return ''
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim()
    }, [formData.startTime, formData.endTime])

    const filteredFacilities = useMemo(() => {
        return facilities.filter((f) => f.status === 'ACTIVE')
    }, [facilities])

    useEffect(() => {
        if (step !== 2 || !formData.facilityId) return
        const loadAvailability = async () => {
            setAvailabilityLoading(true)
            setAvailabilityError('')
            try {
                const monthStart = startOfMonth(activeMonthDate)
                const monthEnd = endOfMonth(activeMonthDate)
                const res = await bookingApi.getFacilityAvailability(formData.facilityId, {
                    startDateTime: format(startOfDay(monthStart), "yyyy-MM-dd'T'HH:mm:ss"),
                    endDateTime: format(monthEnd, "yyyy-MM-dd'T'HH:mm:ss"),
                })
                const slots = unwrap(res)
                setAvailabilitySlots(Array.isArray(slots) ? slots : [])
            } catch {
                setAvailabilitySlots([])
                setAvailabilityError('Unable to load approved booking availability.')
            } finally {
                setAvailabilityLoading(false)
            }
        }
        loadAvailability()
    }, [step, formData.facilityId, activeMonthDate])

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
        if (!formData.date) return []
        return approvedSlotsByDate[formData.date] || []
    }, [formData.date, approvedSlotsByDate])

    const selectedDateConflict = useMemo(() => {
        if (!formData.date || !formData.startTime || !formData.endTime) return false
        const candidateStart = parseLocalDateTime(formData.date, formData.startTime)
        const candidateEnd = parseLocalDateTime(formData.date, formData.endTime)
        return selectedDateSlots.some((slot) => hasSlotOverlap(
            candidateStart,
            candidateEnd,
            parseISO(slot.startDateTime),
            parseISO(slot.endDateTime),
        ))
    }, [formData.date, formData.startTime, formData.endTime, selectedDateSlots])

    return (
        <>
            {/* Dark Theme Styles for Calendar */}
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
        /* Override react-calendar default active background to allow your Tailwind classes to apply cleanly */
        .dark-theme-calendar .react-calendar__tile--active {
          background: none;
          color: inherit;
        }
      `}</style>

            <div ref={pageRef.ref} className="container-custom py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                    <Link to="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                    <span>/</span>
                    <Link to="/bookings" className="hover:text-[var(--text-primary)] transition-colors">My Bookings</Link>
                    <span>/</span>
                    <span className="text-[var(--text-primary)]">Create Booking</span>
                </nav>

                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-2">
                            Create Booking
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Step {step} of {totalSteps}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            {['Facility', 'Date & Time', 'Details', 'Review'].map((label, i) => (
                                <div key={i} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center">
                                        <div className={clsx(
                                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                                            step > i + 1
                                                ? 'bg-status-success text-white'
                                                : step === i + 1
                                                    ? 'bg-gradient-accent text-white shadow-glow-sm'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]',
                                        )}>
                                            {step > i + 1 ? <FiCheck size={16} /> : i + 1}
                                        </div>
                                        <span className={clsx(
                                            'text-xs mt-1 hidden sm:block',
                                            step === i + 1 ? 'text-primary font-medium' : 'text-[var(--text-muted)]',
                                        )}>
                      {label}
                    </span>
                                    </div>
                                    {i < 3 && (
                                        <div className="flex-1 h-0.5 mx-2 bg-[var(--border-default)] overflow-hidden">
                                            <div
                                                className={clsx(
                                                    'h-full rounded-full transition-all duration-500',
                                                    step > i + 1 ? 'bg-status-success w-full' : 'bg-primary/50 w-0',
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Card */}
                    <Card padding="lg">
                        <form ref={formRef} onSubmit={handleSubmit} noValidate>
                            {/* Step 1: Select Facility */}
                            {step === 1 && (
                                <div>
                                    <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Select a Facility</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6">Choose the facility you want to book</p>

                                    {facilitiesLoading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Card key={i} className="animate-pulse">
                                                    <div className="h-24 bg-[var(--bg-tertiary)] rounded" />
                                                </Card>
                                            ))}
                                        </div>
                                    ) : filteredFacilities.length === 0 ? (
                                        <p className="text-center text-[var(--text-muted)] py-8">No active facilities available</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                                            {filteredFacilities.map((facility) => (
                                                <button
                                                    key={facility.id}
                                                    type="button"
                                                    onClick={() => {
                                                        updateField('facilityId', facility.id)
                                                        setSelectedFacility(facility)
                                                    }}
                                                    className={clsx(
                                                        'p-4 rounded-xl border text-left transition-all duration-200',
                                                        formData.facilityId === facility.id
                                                            ? 'border-[var(--border-accent)] bg-primary/5 ring-2 ring-primary/20'
                                                            : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--border-accent)]',
                                                    )}
                                                >
                                                    <p className="font-semibold text-[var(--text-primary)] truncate">
                                                        {facility.name || facility.facilityName}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-muted)]">
                                                        <span className="flex items-center gap-1"><FiMapPin size={12} />{facility.type}</span>
                                                        <span className="flex items-center gap-1"><FiUsers size={12} />{facility.capacity}</span>
                                                    </div>
                                                    {facility.location && (
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">{facility.location}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {errors.facilityId && (
                                        <p className="mt-2 text-sm text-status-error" role="alert">{errors.facilityId}</p>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Date & Time */}
                            {step === 2 && (
                                <div>
                                    <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Choose Date & Time</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                                        {selectedFacility ? `Booking ${selectedFacility.name || selectedFacility.facilityName}` : 'Select your preferred date and time'}
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                                Date
                                            </label>
                                            <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
                                                <Calendar
                                                    className="dark-theme-calendar"
                                                    onChange={(value) => {
                                                        if (!(value instanceof Date)) return
                                                        updateField('date', dayKey(value))
                                                    }}
                                                    value={formData.date ? parseISO(`${formData.date}T00:00:00`) : null}
                                                    minDate={new Date()}
                                                    onActiveStartDateChange={({ activeStartDate }) => {
                                                        if (activeStartDate) setActiveMonthDate(activeStartDate)
                                                    }}
                                                    tileClassName={({ date }) => {
                                                        const key = dayKey(date)
                                                        const isSelected = formData.date === key
                                                        return clsx(
                                                            'rounded-md transition-colors',
                                                            isSelected && 'bg-primary/15 text-primary font-semibold',
                                                        )
                                                    }}
                                                    tileContent={({ date }) => {
                                                        const key = dayKey(date)
                                                        const count = approvedSlotsByDate[key]?.length || 0
                                                        if (count === 0) return null
                                                        const slotLabel = approvedSlotsByDate[key]
                                                            .map((slot) => `${format(parseISO(slot.startDateTime), 'HH:mm')} - ${format(parseISO(slot.endDateTime), 'HH:mm')}`)
                                                            .join(' | ')
                                                        return (
                                                            <div
                                                                className="flex justify-center mt-1"
                                                                title={`Approved slots: ${slotLabel}`}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />
                                                            </div>
                                                        )
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                                                Dates with dots have approved bookings. Hover a dot to view time slots.
                                            </p>
                                            {availabilityLoading && (
                                                <p className="mt-1 text-xs text-[var(--text-muted)]">Loading approved booking density...</p>
                                            )}
                                            {availabilityError && (
                                                <p className="mt-1 text-xs text-status-error">{availabilityError}</p>
                                            )}
                                            {errors.date && (
                                                <p className="mt-1 text-sm text-status-error" role="alert">{errors.date}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <Select
                                                label="Start Time"
                                                name="start-time"
                                                value={formData.startTime}
                                                onChange={(val) => updateField('startTime', val)}
                                                options={TIME_SLOTS}
                                                placeholder="Start"
                                                error={errors.startTime}
                                            />
                                            <Select
                                                label="End Time"
                                                name="end-time"
                                                value={formData.endTime}
                                                onChange={(val) => updateField('endTime', val)}
                                                options={TIME_SLOTS}
                                                placeholder="End"
                                                error={errors.endTime}
                                            />
                                            {duration && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Duration</label>
                                                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                                                        <FiClock size={16} className="text-primary" />
                                                        <span className="font-medium">{duration}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {formData.date && selectedDateSlots.length > 0 && (
                                            <div className="p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                                                    Approved bookings on this date
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedDateSlots.map((slot) => (
                                                        <span key={slot.bookingId} className="px-2 py-1 rounded-md text-xs bg-primary/10 text-primary">
                              {format(parseISO(slot.startDateTime), 'HH:mm')} - {format(parseISO(slot.endDateTime), 'HH:mm')}
                            </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedDateConflict && (
                                            <p className="text-sm text-status-error" role="alert">
                                                This time selection overlaps with an approved booking. Please pick another slot.
                                            </p>
                                        )}

                                        {/* Recurring booking */}
                                        <div className="pt-2 border-t border-[var(--border-default)]">
                                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.recurring}
                                                    onChange={(e) => updateField('recurring', e.target.checked)}
                                                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                          <FiRepeat size={16} /> Make this a recurring booking
                        </span>
                                            </label>

                                            {formData.recurring && (
                                                <div className="space-y-4 pl-7 border-l-2 border-[var(--border-default)]">
                                                    <Select
                                                        label="Recurrence Type"
                                                        name="recurrence-type"
                                                        value={formData.recurrenceType}
                                                        onChange={(val) => updateField('recurrenceType', val)}
                                                        options={RECURRENCE_TYPES}
                                                    />

                                                    {formData.recurrenceType === 'WEEKLY' && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Days of Week</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {WEEKDAYS.map((d) => (
                                                                    <button
                                                                        key={d.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const days = formData.recurrenceDays.includes(d.value)
                                                                                ? formData.recurrenceDays.filter((x) => x !== d.value)
                                                                                : [...formData.recurrenceDays, d.value]
                                                                            updateField('recurrenceDays', days)
                                                                        }}
                                                                        className={clsx(
                                                                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                                                            formData.recurrenceDays.includes(d.value)
                                                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                                                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]',
                                                                        )}
                                                                    >
                                                                        {d.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Input
                                                        label="Recurrence End Date"
                                                        name="recurrence-end-date"
                                                        type="date"
                                                        value={formData.recurrenceEndDate}
                                                        onChange={(e) => updateField('recurrenceEndDate', e.target.value)}
                                                        error={errors.recurrenceEndDate}
                                                        min={formData.date || new Date().toISOString().split('T')[0]}
                                                    />

                                                    {formData.date && formData.recurrenceEndDate && (
                                                        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                                            <FiCalendar size={14} className="text-primary" />
                                                            This will create <strong>{recurrenceCount}</strong> booking{recurrenceCount > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Booking Details */}
                            {step === 3 && (
                                <div>
                                    <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Booking Details</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6">Provide additional information for your booking</p>

                                    <div className="space-y-4">
                                        <TextArea
                                            label="Purpose"
                                            name="purpose"
                                            placeholder="Brief description of why you need this facility..."
                                            value={formData.purpose}
                                            onChange={(e) => updateField('purpose', e.target.value)}
                                            error={errors.purpose}
                                            required
                                            rows={4}
                                            maxLength={1000}
                                            showCharCount
                                        />

                                        <Input
                                            label="Expected Attendees"
                                            name="attendees"
                                            type="number"
                                            min="1"
                                            max={selectedFacility?.capacity || 999}
                                            value={formData.attendees}
                                            onChange={(e) => updateField('attendees', e.target.value)}
                                            error={errors.attendees}
                                            placeholder={selectedFacility?.capacity ? `Maximum capacity: ${selectedFacility.capacity}` : ''}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review & Confirm */}
                            {step === 4 && (
                                <div>
                                    <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Review & Confirm</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6">Please review your booking details before submitting</p>

                                    <div className="space-y-4">
                                        {/* Facility */}
                                        <ReviewSection label="Facility" editAction={() => setStep(1)}>
                                            <p className="text-sm text-[var(--text-primary)] font-medium">
                                                {selectedFacility?.name || selectedFacility?.facilityName || 'N/A'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {selectedFacility?.type} · Capacity: {selectedFacility?.capacity}
                                                {selectedFacility?.location && ` · ${selectedFacility.location}`}
                                            </p>
                                        </ReviewSection>

                                        {/* Date & Time */}
                                        <ReviewSection label="Date & Time" editAction={() => setStep(2)}>
                                            <p className="text-sm text-[var(--text-primary)] font-medium">
                                                {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {formData.startTime} — {formData.endTime} ({duration || 'N/A'})
                                            </p>
                                            {formData.recurring && (
                                                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                                    <FiRepeat size={12} /> Recurring · {recurrenceCount} occurrences
                                                </p>
                                            )}
                                        </ReviewSection>

                                        {/* Details */}
                                        <ReviewSection label="Details" editAction={() => setStep(3)}>
                                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{formData.purpose || 'N/A'}</p>
                                            {formData.attendees && (
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    Attendees: {formData.attendees}
                                                </p>
                                            )}
                                        </ReviewSection>
                                    </div>

                                    {conflictWarning && (
                                        <div className="mt-4 p-4 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning text-sm">
                                            <strong>Conflict Warning:</strong> {conflictWarning}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[var(--border-default)]">
                                {step > 1 ? (
                                    <Button type="button" variant="secondary" onClick={prevStep} icon={<FiArrowLeft />}>
                                        Back
                                    </Button>
                                ) : (
                                    <Link to="/bookings" className="self-start">
                                        <Button type="button" variant="ghost" icon={<FiArrowLeft />}>
                                            Cancel
                                        </Button>
                                    </Link>
                                )}
                                {step < totalSteps ? (
                                    <Button type="button" variant="primary" onClick={nextStep} icon={<FiArrowRight />} iconPosition="right" className="flex-1">
                                        Continue
                                    </Button>
                                ) : (
                                    <Button type="submit" variant="primary" isLoading={bookingSubmitting} className="flex-1">
                                        {bookingSubmitting ? 'Submitting...' : 'Submit Booking Request'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Card>
                </div>
            </div>

            {/* Success Modal */}
            <Modal
                isOpen={successModal}
                onClose={() => navigate('/bookings')}
                title="Booking Request Submitted!"
                size="md"
                footer={
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button variant="secondary" onClick={() => navigate('/bookings')}>
                            View My Bookings
                        </Button>
                        <Button variant="primary" onClick={() => { setSuccessModal(false); navigate('/bookings/create') }}>
                            Book Another
                        </Button>
                    </div>
                }
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCheck size={32} className="text-status-success" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Thank you!</h3>
                    <p className="text-[var(--text-secondary)] mb-3">
                        Your booking request has been submitted and is pending approval.
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                        Reference: <code className="text-primary font-mono font-bold">{bookingReference}</code>
                    </p>
                </div>
            </Modal>
        </>
    )
}