import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import {
    FiUser,
    FiMail,
    FiLock,
    FiPhone,
    FiCreditCard,
    FiBriefcase,
    FiCheck,
    FiShield,
    FiZap,
    FiArrowLeft,
    FiArrowRight,
    FiEye,
    FiEyeOff,
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { useAuth } from '../context/AuthContext'
import { useFadeIn } from '../hooks/useAnimations'
import gsap from 'gsap'

const DEPARTMENTS = [
    { label: 'Computer Science & Engineering', value: 'CSE' },
    { label: 'Electronics & Communication', value: 'ECE' },
    { label: 'Mechanical Engineering', value: 'ME' },
    { label: 'Civil Engineering', value: 'CE' },
    { label: 'Electrical Engineering', value: 'EE' },
    { label: 'Information Technology', value: 'IT' },
    { label: 'Business Administration', value: 'BA' },
    { label: 'General', value: 'GENERAL' },
]

const PASSWORD_REGEX = {
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    minLen: /.{8,}/,
}

function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '', color: '' }
    let score = 0
    if (PASSWORD_REGEX.minLen.test(password)) score++
    if (PASSWORD_REGEX.lowercase.test(password)) score++
    if (PASSWORD_REGEX.uppercase.test(password)) score++
    if (PASSWORD_REGEX.number.test(password)) score++
    if (PASSWORD_REGEX.special.test(password)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'bg-status-error' }
    if (score <= 2) return { score, label: 'Fair', color: 'bg-status-warning' }
    if (score <= 3) return { score, label: 'Medium', color: 'bg-status-warning' }
    if (score <= 4) return { score, label: 'Strong', color: 'bg-status-success' }
    return { score, label: 'Very Strong', color: 'bg-status-success' }
}

function validateEmail(email) {
    if (!email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email'
    return ''
}

function validatePassword(password) {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!PASSWORD_REGEX.uppercase.test(password)) return 'Include at least one uppercase letter'
    if (!PASSWORD_REGEX.number.test(password)) return 'Include at least one number'
    if (!PASSWORD_REGEX.special.test(password)) return 'Include at least one special character'
    return ''
}

export default function Register() {
    const { register, loginWithGoogle } = useAuth()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState({})
    const [touched, setTouched] = useState({})
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [emailCheckTimer, setEmailCheckTimer] = useState(null)
    const [emailAvailable, setEmailAvailable] = useState(null)
    const [checkingEmail, setCheckingEmail] = useState(false)

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        studentId: '',
        department: '',
        acceptTerms: false,
        acceptPrivacy: false,
        emailNotifications: true,
        smsNotifications: false,
    })

    const formRef = useRef(null)
    const cardRef = useFadeIn({ duration: 0.6, y: 20 })
    const brandingRef = useFadeIn({ duration: 0.6, y: 20, delay: 0.1 })

    const totalSteps = 3

    /* ── Step slide animation ─────────────────────────────── */
    useEffect(() => {
        const el = formRef.current
        if (!el) return
        gsap.fromTo(el, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' })
    }, [step])

    /* ── Email availability debounce check ─────────────────── */
    useEffect(() => {
        return () => {
            if (emailCheckTimer) clearTimeout(emailCheckTimer)
        }
    }, [emailCheckTimer])

    const handleEmailCheck = useCallback(
        (email) => {
            if (emailCheckTimer) clearTimeout(emailCheckTimer)
            if (!email || validateEmail(email)) {
                setEmailAvailable(null)
                return
            }
            setCheckingEmail(true)
            // Debounce — in production this would call an API endpoint
            const timer = setTimeout(() => {
                // Simulated check — replace with: await authApi.checkEmail(email)
                setEmailAvailable(true)
                setCheckingEmail(false)
            }, 500)
            setEmailCheckTimer(timer)
        },
        [emailCheckTimer],
    )

    /* ── Helpers ────────────────────────────────────────────── */
    const updateField = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (touched[name]) {
            setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
        }
        if (name === 'email') {
            handleEmailCheck(value)
        }
    }

    const validateField = (name, value) => {
        switch (name) {
            case 'fullName':
                if (!value) return 'Full name is required'
                if (value.trim().length < 2) return 'Name must be at least 2 characters'
                return ''
            case 'email':
                return validateEmail(value)
            case 'password':
                return validatePassword(value)
            case 'confirmPassword':
                if (!value) return 'Please confirm your password'
                if (value !== formData.password) return 'Passwords do not match'
                return ''
            case 'phone':
                if (value && !/^[+]?[\d\s()-]{7,15}$/.test(value)) return 'Enter a valid phone number'
                return ''
            case 'acceptTerms':
                return value ? '' : 'You must accept the terms'
            case 'acceptPrivacy':
                return value ? '' : 'You must accept the privacy policy'
            default:
                return ''
        }
    }

    const handleBlur = (name) => () => {
        setTouched((prev) => ({ ...prev, [name]: true }))
        setErrors((prev) => ({ ...prev, [name]: validateField(name, formData[name]) }))
    }

    const validateStep = (stepNum) => {
        const newErrors = {}
        if (stepNum === 1) {
            const fullNameErr = validateField('fullName', formData.fullName)
            const emailErr = validateField('email', formData.email)
            const passwordErr = validateField('password', formData.password)
            const confirmErr = validateField('confirmPassword', formData.confirmPassword)
            if (fullNameErr) newErrors.fullName = fullNameErr
            if (emailErr) newErrors.email = emailErr
            if (passwordErr) newErrors.password = passwordErr
            if (confirmErr) newErrors.confirmPassword = confirmErr
        }
        if (stepNum === 3) {
            const termsErr = validateField('acceptTerms', formData.acceptTerms)
            const privacyErr = validateField('acceptPrivacy', formData.acceptPrivacy)
            if (termsErr) newErrors.acceptTerms = termsErr
            if (privacyErr) newErrors.acceptPrivacy = privacyErr
        }
        setErrors((prev) => ({ ...prev, ...newErrors }))
        setTouched((prev) => {
            const updated = { ...prev }
            if (stepNum === 1) {
                updated.fullName = true
                updated.email = true
                updated.password = true
                updated.confirmPassword = true
            }
            if (stepNum === 3) {
                updated.acceptTerms = true
                updated.acceptPrivacy = true
            }
            return updated
        })
        return Object.keys(newErrors).length === 0
    }

    const nextStep = () => {
        if (validateStep(step)) {
            setStep((prev) => Math.min(prev + 1, totalSteps))
        }
    }

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsSubmitting(true)
        try {
            const idToken = credentialResponse.credential
            await loginWithGoogle({ idToken })
            // Navigation to /dashboard is handled by AuthContext's pendingRedirect useEffect
            // to avoid race conditions with route guards
            toast.success('Account created with Google!')
        } catch {
            // Toast already shown by AuthContext
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleError = () => {
        toast.error('Google sign-up failed. Please try again.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateStep(3)) return

        setIsSubmitting(true)
        try {
            await register({
                name: formData.fullName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone || undefined,
                studentId: formData.studentId || undefined,
                department: formData.department || undefined,
                emailNotifications: formData.emailNotifications,
                smsNotifications: formData.smsNotifications,
            })
        } catch {
            // Toast already shown by AuthContext
        } finally {
            setIsSubmitting(false)
        }
    }

    const passwordStrength = getPasswordStrength(formData.password)

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)]">
            {/* Left: Branding side */}
            <div
                ref={brandingRef.ref}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-primary items-center justify-center p-12"
            >
                <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-glow" />
                <div
                    className="absolute bottom-10 right-10 w-96 h-96 bg-primary-cyan/20 rounded-full blur-3xl animate-glow"
                    style={{ animationDelay: '1s' }}
                />

                <div className="relative z-10 max-w-lg text-center">
                    <div className="inline-flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-glow-md">
                            <FiZap size={28} className="text-white" />
                        </div>
                        <span className="text-3xl font-display font-bold text-white">
              Smart Campus
            </span>
                    </div>

                    <h2 className="text-4xl font-display font-bold text-white mb-4">
                        Join the Hub
                    </h2>
                    <p className="text-lg text-white/80 mb-12">
                        Create your account and start managing campus operations smarter.
                    </p>

                    {/* Steps preview */}
                    <div className="space-y-4 text-left">
                        {['Basic information', 'Additional details', 'Terms & preferences'].map(
                            (label, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div
                                        className={clsx(
                                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300',
                                            step > i + 1
                                                ? 'bg-status-success text-white'
                                                : step === i + 1
                                                    ? 'bg-white/20 text-white ring-2 ring-white/40'
                                                    : 'bg-white/10 text-white/40',
                                        )}
                                    >
                                        {step > i + 1 ? <FiCheck size={14} /> : i + 1}
                                    </div>
                                    <span className="text-white/80 text-lg">{label}</span>
                                </div>
                            ),
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/20">
                        <p className="text-sm text-white/60 mb-2">Trusted by</p>
                        <p className="text-2xl font-bold text-white">10,000+ Users</p>
                        <p className="text-white/60 text-sm">and growing every day</p>
                    </div>
                </div>
            </div>

            {/* Right: Registration form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
                <div ref={cardRef.ref} className="w-full max-w-lg">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
                        <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center">
                            <FiZap size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-display font-bold text-[var(--text-primary)]">
              Smart Campus
            </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Step {step} of {totalSteps}
              </span>
                            <span className="text-sm text-[var(--text-muted)]">
                {step === 1 ? 'Basic info' : step === 2 ? 'Details' : 'Preferences'}
              </span>
                        </div>
                        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-accent rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(step / totalSteps) * 100}%` }}
                                role="progressbar"
                                aria-valuenow={step}
                                aria-valuemin={1}
                                aria-valuemax={totalSteps}
                            />
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)] mb-1">
                            {step === 1 ? 'Create Account' : step === 2 ? 'Tell Us More' : 'Terms & Preferences'}
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {step === 1
                                ? 'Fill in your basic information'
                                : step === 2
                                    ? 'Help us personalize your experience'
                                    : 'Review and accept our policies'}
                        </p>
                    </div>

                    {/* Google OAuth (step 1 only) */}
                    {step === 1 && (
                        <>
                            <div className="flex justify-center mb-5">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    useOneTap
                                    theme="outline_dark"
                                    shape="pill"
                                    size="large"
                                    width="320"
                                    text="signup_with"
                                />
                            </div>
                            <div className="relative mb-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--border-default)]" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                  <span className="bg-[var(--bg-primary)] px-4 text-[var(--text-muted)]">
                    or register with email
                  </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Form */}
                    <form ref={formRef} onSubmit={handleSubmit} noValidate>
                        {/* Step 1: Basic info */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <Input
                                    label="Full Name"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={(e) => updateField('fullName', e.target.value)}
                                    onBlur={handleBlur('fullName')}
                                    error={touched.fullName ? errors.fullName : undefined}
                                    required
                                    icon={<FiUser size={18} />}
                                    autoComplete="name"
                                />

                                <div className="relative">
                                    <Input
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        placeholder="you@university.edu"
                                        value={formData.email}
                                        onChange={(e) => updateField('email', e.target.value)}
                                        onBlur={handleBlur('email')}
                                        error={touched.email ? errors.email : undefined}
                                        required
                                        icon={<FiMail size={18} />}
                                        autoComplete="email"
                                    />
                                    {checkingEmail && (
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">Checking email availability…</p>
                                    )}
                                    {emailAvailable === true && !checkingEmail && formData.email && !errors.email && (
                                        <p className="mt-1 text-xs text-status-success flex items-center gap-1">
                                            <FiCheck size={12} /> Email is available
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="relative">
                                        <Input
                                            label="Password"
                                            name="password"
                                            type="password"
                                            placeholder="Min 8 characters"
                                            value={formData.password}
                                            onChange={(e) => updateField('password', e.target.value)}
                                            onBlur={handleBlur('password')}
                                            error={touched.password ? errors.password : undefined}
                                            required
                                            icon={<FiLock size={18} />}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    {formData.password && (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            'h-full rounded-full transition-all duration-300',
                                                            passwordStrength.color,
                                                        )}
                                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-[var(--text-muted)] w-20 text-right">
                          {passwordStrength.label}
                        </span>
                                            </div>
                                            {/* Password requirements */}
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                {[
                                                    { regex: PASSWORD_REGEX.minLen, label: '8+ chars' },
                                                    { regex: PASSWORD_REGEX.uppercase, label: 'Uppercase' },
                                                    { regex: PASSWORD_REGEX.number, label: 'Number' },
                                                    { regex: PASSWORD_REGEX.special, label: 'Special char' },
                                                ].map((req, i) => (
                                                    <p
                                                        key={i}
                                                        className={clsx(
                                                            'text-xs flex items-center gap-1 transition-colors',
                                                            req.regex.test(formData.password)
                                                                ? 'text-status-success'
                                                                : 'text-[var(--text-muted)]',
                                                        )}
                                                    >
                                                        <FiCheck
                                                            size={10}
                                                            className={req.regex.test(formData.password) ? 'text-status-success' : ''}
                                                        />
                                                        {req.label}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                                    onBlur={handleBlur('confirmPassword')}
                                    error={touched.confirmPassword ? errors.confirmPassword : undefined}
                                    required
                                    icon={<FiLock size={18} />}
                                    autoComplete="new-password"
                                />

                                {/* Password show/hide toggles — rendered outside Input since Input already has one for password */}
                            </div>
                        )}

                        {/* Step 2: Additional details */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <Input
                                    label="Phone Number (optional)"
                                    name="phone"
                                    type="tel"
                                    placeholder="+94 77 123 4567"
                                    value={formData.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    onBlur={handleBlur('phone')}
                                    error={touched.phone ? errors.phone : undefined}
                                    icon={<FiPhone size={18} />}
                                    autoComplete="tel"
                                />

                                <Input
                                    label="Student / Staff ID (optional)"
                                    name="studentId"
                                    placeholder="e.g. IT20261234"
                                    value={formData.studentId}
                                    onChange={(e) => updateField('studentId', e.target.value)}
                                    icon={<FiCreditCard size={18} />}
                                />

                                <Select
                                    label="Department / Faculty (optional)"
                                    name="department"
                                    value={formData.department}
                                    onChange={(val) => updateField('department', val)}
                                    options={DEPARTMENTS}
                                    placeholder="Select your department"
                                    icon={<FiBriefcase size={18} />}
                                />
                            </div>
                        )}

                        {/* Step 3: Terms & preferences */}
                        {step === 3 && (
                            <div className="space-y-5">
                                {/* Terms */}
                                <div>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptTerms}
                                            onChange={(e) => updateField('acceptTerms', e.target.checked)}
                                            onBlur={handleBlur('acceptTerms')}
                                            className={clsx(
                                                'w-5 h-5 mt-0.5 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary focus:ring-offset-0',
                                                errors.acceptTerms && touched.acceptTerms && 'border-status-error',
                                            )}
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">
                      I accept the{' '}
                                            <button
                                                type="button"
                                                onClick={() => setShowTermsModal(true)}
                                                className="text-primary hover:underline"
                                            >
                        Terms and Conditions
                      </button>
                      <span className="text-status-error ml-1">*</span>
                    </span>
                                    </label>
                                    {errors.acceptTerms && touched.acceptTerms && (
                                        <p className="mt-1 text-sm text-status-error" role="alert">
                                            {errors.acceptTerms}
                                        </p>
                                    )}
                                </div>

                                {/* Privacy */}
                                <div>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptPrivacy}
                                            onChange={(e) => updateField('acceptPrivacy', e.target.checked)}
                                            onBlur={handleBlur('acceptPrivacy')}
                                            className={clsx(
                                                'w-5 h-5 mt-0.5 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary focus:ring-offset-0',
                                                errors.acceptPrivacy && touched.acceptPrivacy && 'border-status-error',
                                            )}
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">
                      I accept the{' '}
                                            <button
                                                type="button"
                                                onClick={() => setShowPrivacyModal(true)}
                                                className="text-primary hover:underline"
                                            >
                        Privacy Policy
                      </button>
                      <span className="text-status-error ml-1">*</span>
                    </span>
                                    </label>
                                    {errors.acceptPrivacy && touched.acceptPrivacy && (
                                        <p className="mt-1 text-sm text-status-error" role="alert">
                                            {errors.acceptPrivacy}
                                        </p>
                                    )}
                                </div>

                                {/* Notification preferences */}
                                <div className="pt-2 border-t border-[var(--border-default)]">
                                    <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
                                        Notification Preferences
                                    </p>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.emailNotifications}
                                                onChange={(e) => updateField('emailNotifications', e.target.checked)}
                                                className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary focus:ring-offset-0"
                                            />
                                            <span className="text-sm text-[var(--text-secondary)]">
                        Email notifications
                      </span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.smsNotifications}
                                                onChange={(e) => updateField('smsNotifications', e.target.checked)}
                                                className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary focus:ring-offset-0"
                                            />
                                            <span className="text-sm text-[var(--text-secondary)]">
                        SMS notifications
                      </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation buttons */}
                        <div className="flex items-center gap-3 mt-8">
                            {step > 1 && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="lg"
                                    onClick={prevStep}
                                    icon={<FiArrowLeft />}
                                >
                                    Back
                                </Button>
                            )}
                            {step < totalSteps ? (
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="lg"
                                    onClick={nextStep}
                                    icon={<FiArrowRight />}
                                    iconPosition="right"
                                    className="flex-1"
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    isLoading={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            )}
                        </div>
                    </form>

                    {/* Sign in link */}
                    <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-primary hover:text-primary-cyan font-medium transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>

                    {/* Footer links */}
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--text-muted)]">
                        <Link to="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">
                            Privacy Policy
                        </Link>
                        <span>·</span>
                        <Link to="/terms" className="hover:text-[var(--text-secondary)] transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>

            {/* Terms Modal */}
            <Modal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                title="Terms and Conditions"
                size="lg"
                footer={
                    <div className="flex justify-end">
                        <Button variant="primary" onClick={() => setShowTermsModal(false)}>
                            I Understand
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 text-[var(--text-secondary)] text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                    <h3 className="text-[var(--text-primary)] font-semibold text-lg">
                        Smart Campus Hub — Terms and Conditions
                    </h3>
                    <p>
                        By accessing and using the Smart Campus Hub platform, you agree to be
                        bound by these Terms and Conditions. These terms apply to all users,
                        including students, staff, and administrators.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">1. Account Responsibility</h4>
                    <p>
                        You are responsible for maintaining the confidentiality of your account
                        credentials and for all activities under your account. You must notify
                        us immediately of any unauthorized access.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">2. Acceptable Use</h4>
                    <p>
                        You agree to use the platform only for lawful purposes related to campus
                        operations. You must not misuse the booking system, submit false
                        maintenance reports, or attempt to gain unauthorized access to any part
                        of the system.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">3. Booking Policies</h4>
                    <p>
                        All facility bookings are subject to approval by administrators.
                        Fraudulent or abusive bookings may result in account suspension.
                        Repeated no-shows or late cancellations may affect your booking
                        privileges.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">4. Content & Data</h4>
                    <p>
                        Any content you submit (maintenance reports, comments, etc.) must be
                        accurate and not contain offensive, defamatory, or harmful material.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">5. Termination</h4>
                    <p>
                        We reserve the right to suspend or terminate accounts that violate these
                        terms. Upon termination, your right to use the platform ceases
                        immediately.
                    </p>
                </div>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                title="Privacy Policy"
                size="lg"
                footer={
                    <div className="flex justify-end">
                        <Button variant="primary" onClick={() => setShowPrivacyModal(false)}>
                            I Understand
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 text-[var(--text-secondary)] text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                    <h3 className="text-[var(--text-primary)] font-semibold text-lg">
                        Smart Campus Hub — Privacy Policy
                    </h3>
                    <p>
                        Your privacy is important to us. This policy explains how we collect,
                        use, and protect your personal information.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">1. Information We Collect</h4>
                    <p>
                        We collect information you provide during registration (name, email,
                        department) and usage data (booking history, ticket submissions) to
                        improve our services.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">2. How We Use Your Information</h4>
                    <p>
                        Your information is used to manage your account, process bookings,
                        handle maintenance tickets, send notifications, and generate analytics
                        reports for administrators.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">3. Data Security</h4>
                    <p>
                        We implement industry-standard security measures including encryption,
                        secure token-based authentication, and regular security audits to
                        protect your data.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">4. Data Sharing</h4>
                    <p>
                        We do not sell or share your personal information with third parties
                        except as required for platform operations (e.g., Google OAuth) or as
                        required by law.
                    </p>
                    <h4 className="text-[var(--text-primary)] font-semibold">5. Your Rights</h4>
                    <p>
                        You have the right to access, correct, or delete your personal data at
                        any time through your profile settings. Contact us for assistance.
                    </p>
                </div>
            </Modal>
        </div>
    )
}
