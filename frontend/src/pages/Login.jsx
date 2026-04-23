import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import {
    FiMail,
    FiLock,
    FiArrowRight,
    FiCheckCircle,
    FiShield,
    FiZap,
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useAuth } from '../context/AuthContext'
import { useFadeIn } from '../hooks/useAnimations'
import gsap from 'gsap'

const VALIDATION_RULES = {
    email: {
        required: 'Email is required',
        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
    },
    password: {
        required: 'Password is required',
    },
}

export default function Login() {
    const { login, loginWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [touched, setTouched] = useState({})

    const formRef = useRef(null)
    const brandingRef = useFadeIn({ duration: 0.8, y: 30 })
    const cardRef = useFadeIn({ duration: 0.8, y: 30, delay: 0.2 })

    // Shake animation for errors
    useEffect(() => {
        if (Object.keys(errors).length > 0 && formRef.current) {
            gsap.to(formRef.current, {
                x: [-8, 8, -6, 6, -3, 3, 0],
                duration: 0.5,
                ease: 'power2.out',
            })
        }
    }, [errors])

    const validate = (name, value) => {
        const rules = VALIDATION_RULES[name]
        if (!rules) return ''
        if (rules.required && !value) return rules.required
        if (rules.pattern && value && !rules.pattern.value.test(value)) return rules.pattern.message
        return ''
    }

    const handleChange = (name) => (e) => {
        const value = e.target.value
        if (name === 'email') setEmail(value)
        if (name === 'password') setPassword(value)

        if (touched[name]) {
            setErrors((prev) => ({ ...prev, [name]: validate(name, value) }))
        }
    }

    const handleBlur = (name) => () => {
        setTouched((prev) => ({ ...prev, [name]: true }))
        const value = name === 'email' ? email : password
        setErrors((prev) => ({ ...prev, [name]: validate(name, value) }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate all
        const emailError = validate('email', email)
        const passwordError = validate('password', password)
        const newErrors = {}
        if (emailError) newErrors.email = emailError
        if (passwordError) newErrors.password = passwordError

        setTouched({ email: true, password: true })
        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) return

        setIsSubmitting(true)
        try {
            await login(email, password)
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true')
            }
        } catch {
            // AuthContext already shows toast
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsSubmitting(true)
        try {
            const idToken = credentialResponse.credential
            await loginWithGoogle({ idToken })
        } catch {
            // AuthContext already shows toast
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleError = () => {
        toast.error('Google sign-in failed. Please try again.')
    }

    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)]">
            {/* Left: Branding side */}
            <div
                ref={brandingRef.ref}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-primary items-center justify-center p-12"
            >
                {/* Background blobs */}
                <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-glow" />
                <div
                    className="absolute bottom-10 right-10 w-96 h-96 bg-primary-cyan/20 rounded-full blur-3xl animate-glow"
                    style={{ animationDelay: '1s' }}
                />

                <div className="relative z-10 max-w-lg text-center">
                    {/* Logo */}
                    <div className="inline-flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-glow-md">
                            <FiZap size={28} className="text-white" />
                        </div>
                        <span className="text-3xl font-display font-bold text-[var(--text-primary)]">
              Smart Campus
            </span>
                    </div>

                    <h2 className="text-4xl font-display font-bold text-white mb-4">
                        Welcome Back
                    </h2>
                    <p className="text-lg text-white/80 mb-12">
                        Your campus operations hub — smarter, faster, simpler.
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-6 text-left">
                        {[
                            {
                                icon: <FiCheckCircle size={20} />,
                                text: 'Book facilities with zero conflicts',
                            },
                            {
                                icon: <FiShield size={20} />,
                                text: 'Secure authentication with Google SSO',
                            },
                            {
                                icon: <FiZap size={20} />,
                                text: 'Real-time notifications & analytics',
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-white/90">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                    {item.icon}
                                </div>
                                <span className="text-lg">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Social proof */}
                    <div className="mt-12 pt-8 border-t border-white/20">
                        <p className="text-sm text-white/60 mb-2">Trusted by</p>
                        <p className="text-2xl font-bold text-white">500+ Institutions</p>
                        <p className="text-white/60 text-sm">across 20 countries</p>
                    </div>
                </div>
            </div>

            {/* Right: Login form side */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
                <div ref={cardRef.ref} className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center">
                            <FiZap size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-display font-bold text-[var(--text-primary)]">
              Smart Campus
            </span>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] mb-2">
                            Sign In
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Welcome back! Please enter your credentials.
                        </p>
                    </div>

                    {/* Google OAuth */}
                    <div className="flex justify-center mb-6">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            useOneTap
                            theme="outline_dark"
                            shape="pill"
                            size="large"
                            width="320"
                            text="signin_with"
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border-default)]" />
                        </div>
                        <div className="relative flex justify-center text-sm">
              <span className="bg-[var(--bg-primary)] px-4 text-[var(--text-muted)]">
                or continue with email
              </span>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            placeholder="you@university.edu"
                            value={email}
                            onChange={handleChange('email')}
                            onBlur={handleBlur('email')}
                            error={touched.email ? errors.email : undefined}
                            required
                            icon={<FiMail size={18} />}
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={handleChange('password')}
                            onBlur={handleBlur('password')}
                            error={touched.password ? errors.password : undefined}
                            required
                            icon={<FiLock size={18} />}
                            autoComplete="current-password"
                            aria-invalid={!!errors.password}
                        />

                        {/* Remember me & Forgot password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-primary focus:ring-primary focus:ring-offset-0"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">
                  Remember me
                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary hover:text-primary-cyan transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            isLoading={isSubmitting}
                            icon={!isSubmitting ? <FiArrowRight /> : undefined}
                            iconPosition="right"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* Sign up link */}
                    <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
                        Don&apos;t have an account?{' '}
                        <Link
                            to="/register"
                            className="text-primary hover:text-primary-cyan font-medium transition-colors"
                        >
                            Sign up
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
        </div>
    )
}
