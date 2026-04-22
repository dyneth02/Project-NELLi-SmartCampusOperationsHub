import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiMapPin,
  FiAlertCircle,
  FiUpload,
  FiX,
  FiMail,
  FiPhone,
  FiSearch,
  FiUsers,
  FiImage,
} from 'react-icons/fi'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Input from '../components/common/Input'
import TextArea from '../components/common/TextArea'
import Select from '../components/common/Select'
import Modal from '../components/common/Modal'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { useFadeIn } from '../hooks/useAnimations'
import { ticketApi } from '../api/ticketApi'
import { facilityApi } from '../api/facilityApi'
import { useAuth } from '../context/AuthContext'
import gsap from 'gsap'

const CATEGORIES = [
  { label: 'Equipment Failure', value: 'EQUIPMENT_FAILURE' },
  { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
  { label: 'Cleanliness', value: 'CLEANLINESS' },
  { label: 'Electrical', value: 'ELECTRICAL' },
  { label: 'Plumbing', value: 'PLUMBING' },
  { label: 'Internet Connectivity', value: 'INTERNET' },
  { label: 'Other', value: 'OTHER' },
]

const PRIORITIES = [
  { key: 'LOW', label: 'Low', color: 'text-status-success', bg: 'bg-status-success/10', border: 'border-status-success/30' },
  { key: 'MEDIUM', label: 'Medium', color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/30' },
  { key: 'HIGH', label: 'High', color: 'text-status-error', bg: 'bg-status-error/10', border: 'border-status-error/30' },
  { key: 'URGENT', label: 'Urgent', color: 'text-status-error', bg: 'bg-status-error/20', border: 'border-status-error' },
]

function unwrap(res) {
  if (res == null) return null
  return res.data !== undefined ? res.data : res
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

export default function CreateTicket() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const prefilledFacilityId = searchParams.get('facility')
  const [step, setStep] = useState(1)
  const [facilities, setFacilities] = useState([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [successModal, setSuccessModal] = useState(false)
  const [ticketRef, setTicketRef] = useState('')
  const [images, setImages] = useState([])
  const [facilitySearch, setFacilitySearch] = useState('')

  const [formData, setFormData] = useState({
    facilityId: '',
    generalIssue: false,
    category: '',
    priority: '',
    description: '',
    contactEmail: user?.email || '',
    contactPhone: '',
  })

  const formRef = useRef(null)
  const pageRef = useFadeIn({ duration: 0.5, y: 15 })
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const totalSteps = 4

  /* ── Fetch facilities ─────────────────────────────────────── */
  useEffect(() => {
    const fetch = async () => {
      console.log('📡 Fetching facilities...')
      setFacilitiesLoading(true)
      try {
        const res = await facilityApi.getAllFacilities({ status: 'ACTIVE', limit: 100 })
        setFacilities(Array.isArray(unwrap(res)) ? unwrap(res) : [])
      } catch (err) {
        console.error('❌ Failed to fetch facilities:', err)
        setFacilities([])
      } finally {
        setFacilitiesLoading(false)
      }
    }
    fetch()
  }, [])

  /* ── Load draft ───────────────────────────────────────────── */
  useEffect(() => {
    try {
      const draft = localStorage.getItem('ticket-draft')
      if (draft) {
        console.log('📝 Draft loaded:', JSON.parse(draft))
        setFormData((p) => ({ ...p, ...JSON.parse(draft) }))
      }
    } catch { /* ignore */ }
  }, [])

  /* ── Prefill facility from URL query param ────────────────── */
  useEffect(() => {
    if (prefilledFacilityId && facilities.length > 0) {
      const found = facilities.find((f) => f.id === prefilledFacilityId)
      if (found) {
        setFormData((p) => ({ ...p, facilityId: found.id, generalIssue: false }))
      }
    }
  }, [prefilledFacilityId, facilities])

  /* ── Auto-save draft ──────────────────────────────────────── */
  useEffect(() => {
    try {
      localStorage.setItem('ticket-draft', JSON.stringify(formData))
    } catch { /* ignore */ }
  }, [formData])

  /* ── Step animation ───────────────────────────────────────── */
  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current, { opacity: 0, x: 25 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' })
    }
  }, [step])

  /* ── Debug: Monitor Step 4 Data ───────────────────────────── */
  useEffect(() => {
    if (step === 4) {
      console.group('👀 Step 4 Mounted - Review Data Context')
      console.log('General Issue:', formData.generalIssue)
      console.log('Facility ID:', formData.facilityId)
      console.log('Category:', formData.category)
      console.log('Priority:', formData.priority)
      console.log('Description:', formData.description)
      console.log('Contact Details:', { email: formData.contactEmail, phone: formData.contactPhone })
      console.log('Images Count:', images.length)
      console.groupEnd()
    }
  }, [step, formData, images.length])

  /* ── Drag & drop ──────────────────────────────────────────── */
  useEffect(() => {
    const zone = dropZoneRef.current
    if (!zone) return
    const prevent = (e) => { e.preventDefault(); e.stopPropagation() }
    const handleDrop = (e) => {
      prevent(e)
      const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
      addImages(files)
    }
    zone.addEventListener('dragover', prevent)
    zone.addEventListener('dragenter', prevent)
    zone.addEventListener('drop', handleDrop)
    return () => {
      zone.removeEventListener('dragover', prevent)
      zone.removeEventListener('dragenter', prevent)
      zone.removeEventListener('drop', handleDrop)
    }
  }, [images])

  const addImages = (files) => {
    setImages((prev) => {
      const remaining = 3 - prev.length
      if (remaining <= 0) return prev
      const valid = files.slice(0, remaining).filter((f) => f.size <= 5 * 1024 * 1024)
      return [...prev, ...valid.map((f) => ({ file: f, name: f.name, size: f.size, preview: URL.createObjectURL(f) }))]
    })
  }

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev]
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }

  /* ── Validation ───────────────────────────────────────────── */
  const validateStep = (s) => {
    const errs = {}
    if (s === 1) {
      if (!formData.facilityId && !formData.generalIssue) errs.facilityId = 'Select a facility or choose General Issue'
    }
    if (s === 2) {
      if (!formData.category) errs.category = 'Category is required'
      if (!formData.priority) errs.priority = 'Priority is required'
      if (!formData.description.trim()) errs.description = 'Description is required'
      else if (formData.description.trim().length < 10) errs.description = 'Description must be at least 10 characters'
    }
    if (s === 3) {
      if (formData.contactPhone && !/^[+]?[\d\s()-]{7,15}$/.test(formData.contactPhone)) {
        errs.contactPhone = 'Enter a valid phone number'
      }
    }
    if (s === 4) {
      if (!formData.facilityId && formData.generalIssue && facilities.length === 0) {
        errs.facilityId = 'Cannot create a general ticket: no facilities available'
      }
    }
    return errs
  }

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
  }

  const nextStep = (e) => {
    // 🛡️ Block the event from bubbling up to the form
    if (e && typeof e.preventDefault === 'function') e.preventDefault()

    const errs = validateStep(step)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setStep((p) => Math.min(p + 1, totalSteps))
  }

  const prevStep = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    setErrors({})
    setStep((p) => Math.max(p - 1, 1))
  }
  /* ── Prevent Enter from Submitting Early ──────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      if (step < totalSteps) {
        e.preventDefault()
        console.log('🛡️ Prevented premature Enter key form submission on step:', step)
        nextStep()
      }
    }
  }

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    console.group('🚀 Form Submission Initiated')
    console.log('Final Form Data Context:', formData)

    const effectiveFacilityId = formData.facilityId || (facilities.length > 0 ? facilities[0].id : null)
    console.log('Effective Facility ID mapping:', effectiveFacilityId)

    if (!effectiveFacilityId) {
      console.error('❌ Submission failed: No effective facility ID found.')
      toast.error('Unable to create ticket: no facility available')
      console.groupEnd()
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        facilityId: effectiveFacilityId,
      }

      console.log('Transmitting Payload:', payload)
      const res = await ticketApi.createTicket(payload)
      const data = unwrap(res)
      console.log('✅ API Response Success:', data)
      const ticketId = data?.id || data?.ticketNumber

      console.log(`Uploading ${images.length} attachments...`)
      for (const img of images) {
        try {
          await ticketApi.uploadAttachment(ticketId, img.file)
        } catch (uploadErr) {
          console.warn(`Failed to upload attachment ${img.name}:`, uploadErr)
        }
      }

      setTicketRef(data?.ticketNumber || ticketId || 'N/A')
      setSuccessModal(true)
      localStorage.removeItem('ticket-draft')
    } catch (err) {
      console.error('❌ Ticket API Submission Error:', err)
      // Check if your interceptor is throwing an undefined toast right here!
    } finally {
      setSubmitting(false)
      console.groupEnd()
    }
  }

  const filteredFacilities = useMemo(() => {
    if (!facilitySearch) return facilities
    const q = facilitySearch.toLowerCase()
    return facilities.filter((f) =>
        (f.name || f.facilityName || '').toLowerCase().includes(q) ||
        (f.location || '').toLowerCase().includes(q),
    )
  }, [facilities, facilitySearch])

  const selectedFacility = facilities.find((f) => f.id === formData.facilityId)
  const selectedPriority = PRIORITIES.find((p) => p.key === formData.priority)

  return (
      <ErrorBoundary>
        <div ref={pageRef.ref} className="container-custom py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-2">Report an Issue</h1>
              <p className="text-[var(--text-secondary)]">Step {step} of {totalSteps}</p>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {['Facility', 'Issue Details', 'Contact', 'Review'].map((label, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={clsx(
                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                            step > i + 1 ? 'bg-status-success text-white' :
                                step === i + 1 ? 'bg-gradient-accent text-white shadow-glow-sm' :
                                    'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]',
                        )}>
                          {step > i + 1 ? <FiCheck size={16} /> : i + 1}
                        </div>
                        <span className={clsx('text-xs mt-1 hidden sm:block', step === i + 1 ? 'text-primary font-medium' : 'text-[var(--text-muted)]')}>
                      {label}
                    </span>
                      </div>
                      {i < 3 && (
                          <div className="flex-1 h-0.5 mx-2 bg-[var(--border-default)] overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all duration-500', step > i + 1 ? 'bg-status-success w-full' : 'bg-primary/50 w-0')} />
                          </div>
                      )}
                    </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <Card padding="lg">
              <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
                {/* Step 1: Facility */}
                {step === 1 && (
                    <div>
                      <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Select Facility</h2>
                      <p className="text-sm text-[var(--text-secondary)] mb-4">Choose the facility where the issue is located, or report a general issue</p>

                      <div className="relative mb-4">
                        <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search facilities..."
                            value={facilitySearch}
                            onChange={(e) => setFacilitySearch(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg pl-11 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>

                      <button
                          type="button"
                          onClick={() => { updateField('generalIssue', true); updateField('facilityId', '') }}
                          className={clsx(
                              'w-full p-4 rounded-xl border text-left mb-4 transition-all',
                              formData.generalIssue
                                  ? 'border-[var(--border-accent)] bg-primary/5 ring-2 ring-primary/20'
                                  : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--border-accent)]',
                          )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-status-warning/10 rounded-lg flex items-center justify-center">
                            <FiAlertCircle size={20} className="text-status-warning" />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">General Issue</p>
                            <p className="text-xs text-[var(--text-muted)]">Not tied to a specific facility</p>
                          </div>
                        </div>
                      </button>

                      {errors.facilityId && <p className="text-sm text-status-error mb-3" role="alert">{errors.facilityId}</p>}

                      {facilitiesLoading ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="animate-pulse"><div className="h-20 bg-[var(--bg-tertiary)] rounded" /></Card>
                            ))}
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                            {filteredFacilities.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => { updateField('facilityId', f.id); updateField('generalIssue', false) }}
                                    className={clsx(
                                        'p-3 rounded-xl border text-left transition-all',
                                        formData.facilityId === f.id && !formData.generalIssue
                                            ? 'border-[var(--border-accent)] bg-primary/5 ring-2 ring-primary/20'
                                            : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--border-accent)]',
                                    )}
                                >
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name || f.facilityName}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                                    <FiMapPin size={11} />{f.type}
                                    <FiUsers size={11} />{f.capacity}
                                  </div>
                                </button>
                            ))}
                          </div>
                      )}
                    </div>
                )}

                {/* Step 2: Issue Details */}
                {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Issue Details</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">Describe the issue you&apos;re experiencing</p>
                      </div>

                      <Select
                          label="Category"
                          name="category"
                          value={formData.category}
                          onChange={(val) => updateField('category', val)}
                          options={CATEGORIES}
                          placeholder="Select category"
                          error={errors.category}
                          required
                      />

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                          Priority <span className="text-status-error">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {PRIORITIES.map((p) => (
                              <button
                                  key={p.key}
                                  type="button"
                                  onClick={() => updateField('priority', p.key)}
                                  className={clsx(
                                      'p-3 rounded-xl border text-center transition-all',
                                      formData.priority === p.key
                                          ? clsx(p.bg, p.border, 'ring-2', p.key === 'LOW' ? 'ring-status-success/30' : p.key === 'MEDIUM' ? 'ring-status-warning/30' : 'ring-status-error/30')
                                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--border-accent)]',
                                  )}
                              >
                                <p className={clsx('text-sm font-semibold', p.color)}>{p.label}</p>
                              </button>
                          ))}
                        </div>
                        {errors.priority && <p className="text-sm text-status-error mt-2" role="alert">{errors.priority}</p>}
                      </div>

                      <TextArea
                          label="Description"
                          name="description"
                          placeholder="Describe the issue in detail..."
                          value={formData.description}
                          onChange={(e) => updateField('description', e.target.value)}
                          error={errors.description}
                          required
                          rows={5}
                          maxLength={5000}
                          showCharCount
                      />
                    </div>
                )}

                {/* Step 3: Contact & Attachments */}
                {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Contact & Attachments</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">How can we reach you? Add images if helpful</p>
                      </div>

                      <Input
                          label="Contact Email"
                          name="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => updateField('contactEmail', e.target.value)}
                          icon={<FiMail size={18} />}
                          required
                      />

                      <Input
                          label="Contact Phone (optional)"
                          name="contactPhone"
                          type="tel"
                          placeholder="+94 77 123 4567"
                          value={formData.contactPhone}
                          onChange={(e) => updateField('contactPhone', e.target.value)}
                          error={errors.contactPhone}
                          icon={<FiPhone size={18} />}
                      />

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                          Attachments ({images.length}/3)
                        </label>
                        <div
                            ref={dropZoneRef}
                            onClick={() => fileInputRef.current?.click()}
                            className={clsx(
                                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                                images.length >= 3
                                    ? 'border-[var(--border-default)] opacity-50 cursor-not-allowed'
                                    : 'border-[var(--border-accent)] hover:bg-primary/5',
                            )}
                        >
                          <FiUpload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">
                            Drop images here or <span className="text-primary font-medium">click to browse</span>
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">Max 3 images, 5MB each (JPEG, PNG)</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            multiple
                            onChange={(e) => addImages(Array.from(e.target.files || []))}
                            className="hidden"
                            disabled={images.length >= 3}
                        />

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-3">
                              {images.map((img, i) => (
                                  <div key={i} className="relative group">
                                    <img src={img.preview} alt={img.name} className="w-full h-24 object-cover rounded-lg" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 p-1 rounded bg-status-error text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Remove ${img.name}`}
                                    >
                                      <FiX size={14} />
                                    </button>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{img.name}</p>
                                  </div>
                              ))}
                            </div>
                        )}
                      </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div>
                      <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">Review & Submit</h2>
                      <p className="text-sm text-[var(--text-secondary)] mb-4">Confirm your details before submitting</p>

                      <div className="space-y-3">
                        <ReviewSection label="Facility" editAction={() => setStep(1)}>
                          {formData.generalIssue
                              ? <p className="text-sm text-[var(--text-primary)]">General Issue (no specific facility)</p>
                              : selectedFacility
                                  ? <p className="text-sm text-[var(--text-primary)]">{selectedFacility.name || selectedFacility.facilityName} — {selectedFacility.type}</p>
                                  : <p className="text-sm text-[var(--text-muted)]">Not selected</p>
                          }
                        </ReviewSection>

                        <ReviewSection label="Category & Priority" editAction={() => setStep(2)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[var(--text-primary)]">{CATEGORIES.find((c) => c.value === formData.category)?.label || 'N/A'}</span>
                            {selectedPriority && (
                                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', selectedPriority.bg, selectedPriority.color)}>
                            {selectedPriority.label}
                          </span>
                            )}
                          </div>
                        </ReviewSection>

                        <ReviewSection label="Description" editAction={() => setStep(2)}>
                          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap line-clamp-3">
                            {formData.description || 'N/A'}
                          </p>
                        </ReviewSection>

                        <ReviewSection label="Contact" editAction={() => setStep(3)}>
                          <p className="text-sm text-[var(--text-primary)]">{formData.contactEmail}</p>
                          {formData.contactPhone && <p className="text-xs text-[var(--text-muted)]">{formData.contactPhone}</p>}
                        </ReviewSection>

                        {images.length > 0 && (
                            <ReviewSection label={`Attachments (${images.length})`} editAction={() => setStep(3)}>
                              <div className="flex gap-2">
                                {images.map((img, i) => (
                                    <img key={i} src={img.preview} alt={img.name} className="w-12 h-12 object-cover rounded" />
                                ))}
                              </div>
                            </ReviewSection>
                        )}
                      </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[var(--border-default)]">
                  {step > 1 ? (
                      <Button type="button" variant="secondary" onClick={prevStep} icon={<FiArrowLeft />}>Back</Button>
                  ) : (
                      <Link to="/tickets"><Button type="button" variant="ghost" icon={<FiArrowLeft />}>Cancel</Button></Link>
                  )}
                  {step < totalSteps ? (
                      <Button type="button" variant="primary" onClick={nextStep} icon={<FiArrowRight />} iconPosition="right" className="flex-1">
                        Continue
                      </Button>
                  ) : (
                      <Button type="submit" variant="primary" isLoading={submitting} className="flex-1">
                        {submitting ? 'Submitting...' : 'Submit Ticket'}
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
            onClose={() => navigate('/tickets')}
            title="Ticket Submitted Successfully!"
            size="md"
            footer={
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="secondary" onClick={() => navigate(`/tickets/${ticketRef}`)}>
                  View Ticket
                </Button>
                <Button variant="primary" onClick={() => { setSuccessModal(false); navigate('/tickets/create') }}>
                  Report Another Issue
                </Button>
              </div>
            }
        >
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-status-success" />
            </div>
            <p className="text-[var(--text-secondary)] mb-2">
              Your ticket has been created successfully.
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Reference: <code className="text-primary font-mono font-bold">{ticketRef}</code>
            </p>
          </div>
        </Modal>
      </ErrorBoundary>
  )
}