import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authApi } from '../api/authApi.js'

const AuthContext = createContext(undefined)

const STORAGE_USER = 'user'
const STORAGE_ACCESS = 'accessToken'
const STORAGE_REFRESH = 'refreshToken'

function readJson(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw)
    } catch {
        return null
    }
}

/** Normalize API envelope: supports `{ data: T }` or flat `T`. */
function unwrapPayload(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function extractAuthBundle(res) {
    const outer = unwrapPayload(res)
    const inner = outer?.data !== undefined ? outer.data : outer
    if (!inner || typeof inner !== 'object') return null
    return {
        accessToken: inner.accessToken ?? inner.access_token,
        refreshToken: inner.refreshToken ?? inner.refresh_token,
        user: inner.user ?? inner.profile ?? null,
    }
}

function persistAuth(user, accessToken, refreshToken) {
    if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_USER)
    if (accessToken) localStorage.setItem(STORAGE_ACCESS, accessToken)
    else localStorage.removeItem(STORAGE_ACCESS)
    if (refreshToken) localStorage.setItem(STORAGE_REFRESH, refreshToken)
    else localStorage.removeItem(STORAGE_REFRESH)
}

/** Hydrate auth state from localStorage synchronously. */
function hydrateAuth() {
    const savedUser = readJson(STORAGE_USER)
    const savedAccess = localStorage.getItem(STORAGE_ACCESS)
    const savedRefresh = localStorage.getItem(STORAGE_REFRESH)
    if (savedUser && savedAccess) {
        return { user: savedUser, accessToken: savedAccess, refreshToken: savedRefresh ?? null }
    }
    return { user: null, accessToken: null, refreshToken: null }
}

export function AuthProvider({ children }) {
    const navigate = useNavigate()
    // Single consolidated state object — prevents race conditions from separate setState calls
    const [authState, setAuthState] = useState(() => ({
        ...hydrateAuth(),
        isLoading: false,
        pendingRedirect: null, // set after login/logout; useEffect handles navigation
    }))

    // Listen for access token updates from the HTTP interceptor
    useEffect(() => {
        const onToken = (e) => {
            const token = e.detail?.accessToken
            if (token) {
                setAuthState((prev) => ({ ...prev, accessToken: token }))
            }
        }
        window.addEventListener('smart-campus:access-token', onToken)
        return () => window.removeEventListener('smart-campus:access-token', onToken)
    }, [])

    // Navigate AFTER state has been committed (avoids race with route guards)
    useEffect(() => {
        if (authState.pendingRedirect) {
            const target = authState.pendingRedirect
            // Clear the flag so we don't re-navigate on every render
            setAuthState((prev) => ({ ...prev, pendingRedirect: null }))
            navigate(target, { replace: true })
        }
    }, [authState.pendingRedirect, navigate])

    const login = useCallback(
        async (email, password) => {
            try {
                const res = await authApi.login(email, password)
                const bundle = extractAuthBundle(res)
                if (!bundle?.accessToken || !bundle?.user) {
                    throw new Error('Invalid login response')
                }
                persistAuth(bundle.user, bundle.accessToken, bundle.refreshToken ?? null)
                setAuthState({
                    user: bundle.user,
                    accessToken: bundle.accessToken,
                    refreshToken: bundle.refreshToken ?? null,
                    isLoading: false,
                    pendingRedirect: bundle.user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
                })
                toast.success('Login successful!')
            } catch (error) {
                const msg =
                    error.response?.data?.message ||
                    error.message ||
                    'Login failed'
                toast.error(typeof msg === 'string' ? msg : 'Login failed')
                throw error
            }
        },
        [],
    )

    const loginWithGoogle = useCallback(
        async (googleToken) => {
            try {
                const body =
                    typeof googleToken === 'string'
                        ? { idToken: googleToken, token: googleToken }
                        : googleToken
                const res = await authApi.loginWithGoogle(body)
                const bundle = extractAuthBundle(res)
                if (!bundle?.accessToken || !bundle?.user) {
                    throw new Error('Invalid Google auth response')
                }
                persistAuth(bundle.user, bundle.accessToken, bundle.refreshToken ?? null)
                setAuthState({
                    user: bundle.user,
                    accessToken: bundle.accessToken,
                    refreshToken: bundle.refreshToken ?? null,
                    isLoading: false,
                    pendingRedirect: bundle.user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
                })
                toast.success('Signed in with Google')
            } catch (error) {
                const msg =
                    error.response?.data?.message ||
                    error.message ||
                    'Google sign-in failed'
                toast.error(typeof msg === 'string' ? msg : 'Google sign-in failed')
                throw error
            }
        },
        [],
    )

    const register = useCallback(
        async (userData) => {
            try {
                await authApi.register(userData)
                toast.success('Account created. You can sign in now.')
                setAuthState((prev) => ({ ...prev, pendingRedirect: '/login' }))
            } catch (error) {
                const msg =
                    error.response?.data?.message ||
                    error.message ||
                    'Registration failed'
                toast.error(typeof msg === 'string' ? msg : 'Registration failed')
                throw error
            }
        },
        [],
    )

    const logout = useCallback(async () => {
        try {
            if (localStorage.getItem(STORAGE_ACCESS)) {
                await authApi.logout()
            }
        } catch {
            /* still clear local session */
        } finally {
            localStorage.removeItem(STORAGE_USER)
            localStorage.removeItem(STORAGE_ACCESS)
            localStorage.removeItem(STORAGE_REFRESH)
            setAuthState({ user: null, accessToken: null, refreshToken: null, isLoading: false, pendingRedirect: '/login' })
            toast.info('Logged out successfully')
        }
    }, [])

    const refreshAccessToken = useCallback(async () => {
        const rt = authState.refreshToken || localStorage.getItem(STORAGE_REFRESH)
        if (!rt) {
            await logout()
            throw new Error('No refresh token')
        }
        try {
            const res = await authApi.refreshToken(rt)
            const bundle = extractAuthBundle(res)
            const newAccess = bundle?.accessToken
            const newRefresh = bundle?.refreshToken ?? rt
            if (!newAccess) throw new Error('Refresh failed')
            persistAuth(authState.user, newAccess, newRefresh)
            setAuthState((prev) => ({
                ...prev,
                accessToken: newAccess,
                refreshToken: newRefresh,
            }))
            return newAccess
        } catch (error) {
            toast.error('Session expired. Please login again.')
            await logout()
            throw error
        }
    }, [authState.refreshToken, authState.user, logout])

    const updateUser = useCallback((userData) => {
        setAuthState((prev) => {
            const next = { ...prev, user: { ...prev.user, ...userData } }
            localStorage.setItem(STORAGE_USER, JSON.stringify(next.user))
            return next
        })
    }, [])

    const isAuthenticated = !!authState.user && !!authState.accessToken

    const value = useMemo(
        () => ({
            user: authState.user,
            accessToken: authState.accessToken,
            refreshToken: authState.refreshToken,
            isAuthenticated,
            isLoading: authState.isLoading,
            login,
            loginWithGoogle,
            register,
            logout,
            refreshAccessToken,
            updateUser,
        }),
        [
            authState.user,
            authState.accessToken,
            authState.refreshToken,
            authState.isLoading,
            isAuthenticated,
            login,
            loginWithGoogle,
            register,
            logout,
            refreshAccessToken,
            updateUser,
        ],
    )

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (ctx === undefined) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}
