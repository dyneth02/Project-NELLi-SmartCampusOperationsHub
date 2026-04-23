import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiAlertCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'
import { useFadeIn } from '../hooks/useAnimations'

export default function OAuthCallback() {
    const { loginWithGoogle } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('')
    const hasProcessed = useRef(false)
    const { ref: fadeInRef } = useFadeIn({ duration: 0.6, y: 20 })

    useEffect(() => {
        if (hasProcessed.current) return
        hasProcessed.current = true

        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        /* eslint-disable react-hooks/set-state-in-effect -- OAuth redirect handler: setState is legitimate response to external system (URL params) */
        // Check for OAuth error
        if (error) {
            const msg =
                error === 'access_denied'
                    ? 'Authentication was denied. Please try again.'
                    : 'An error occurred during authentication.'
            setErrorMessage(msg)
            setStatus('error')
            toast.error('Authentication failed')
            return
        }

        // No code present — redirect to login
        if (!code) {
            toast.error('Invalid authentication response')
            navigate('/login', { replace: true })
            return
        }

        // CSRF state validation (if state was stored)
        const storedState = sessionStorage.getItem('oauth_state')
        if (storedState && state !== storedState) {
            setErrorMessage('Session validation failed. Please try again.')
            setStatus('error')
            toast.error('Invalid session. Please sign in again.')
            sessionStorage.removeItem('oauth_state')
            return
        }
        sessionStorage.removeItem('oauth_state')
        /* eslint-enable react-hooks/set-state-in-effect */

        // Exchange code via loginWithGoogle
        const authenticate = async () => {
            try {
                await loginWithGoogle({ code, state })
                setStatus('success')
                // Redirect handled by AuthContext
            } catch (err) {
                const msg =
                    err.response?.data?.message ||
                    err.message ||
                    'Authentication failed. Please try again.'
                setErrorMessage(typeof msg === 'string' ? msg : 'Authentication failed')
                setStatus('error')
                toast.error('Sign-in failed')
            }
        }

        authenticate()
    }, [searchParams, loginWithGoogle, navigate])

    const handleRetry = () => {
        navigate('/login', { replace: true })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
            <div ref={fadeInRef} className="w-full max-w-md text-center">
                {status === 'processing' && (
                    <div className="py-12">
                        <LoadingSpinner size="xl" text="Completing sign-in..." className="mx-auto" />
                        <p className="mt-6 text-[var(--text-secondary)] text-sm">
                            Please wait while we complete your sign-in.
                        </p>
                        <div className="mt-4 w-48 h-1.5 bg-[var(--bg-tertiary)] rounded-full mx-auto overflow-hidden">
                            <div
                                className="h-full bg-gradient-accent rounded-full animate-pulse"
                                style={{ width: '60%' }}
                            />
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-12">
                        <div className="w-20 h-20 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiCheckCircle size={40} className="text-status-success" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-2">
                            Welcome!
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-2">
                            You have been signed in successfully.
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                            Redirecting to your dashboard...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-12">
                        <div className="w-20 h-20 bg-status-error/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiAlertCircle size={40} className="text-status-error" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-2">
                            Authentication Failed
                        </h2>
                        <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                            {errorMessage || 'Something went wrong during sign-in.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleRetry}
                                icon={<FiRefreshCw />}
                            >
                                Try Again
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => navigate('/login', { replace: true })}
                                icon={<FiArrowLeft />}
                            >
                                Back to Login
                            </Button>
                        </div>
                    </div>
                )}

                {/* Branding footer */}
                <div className="mt-12 pt-6 border-t border-[var(--border-default)]">
                    <p className="text-xs text-[var(--text-muted)]">
                        Secured by Google OAuth · Smart Campus Hub
                    </p>
                </div>
            </div>
        </div>
    )
}
