import axios from 'axios'
import { toast } from 'react-toastify'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

/** Plain client for refresh calls — avoids interceptor recursion. */
const refreshClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
})

const apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

function getErrorMessage(error) {
    const data = error.response?.data
    if (!data) return 'An error occurred'
    if (typeof data.message === 'string') return data.message
    if (Array.isArray(data.message)) return data.message.join(', ')
    if (data.error) return String(data.error)
    return 'An error occurred'
}

function isAuthPublicRoute(config) {
    const url = config.url || ''
    return /\/api\/v1\/auth\/(login|register|google)(\?|$)/.test(url)
}

function isRefreshRequest(config) {
    const url = config.url || ''
    return url.includes('/api/v1/auth/refresh-token')
}

let isRefreshing = false
/** @type {{ resolve: (v: string) => void; reject: (e: unknown) => void }[]} */
let failedQueue = []

function processQueue(error, token = null) {
    failedQueue.forEach((p) => {
        if (error) p.reject(error)
        else if (token) p.resolve(token)
    })
    failedQueue = []
}

function notifyHttpError(status, message) {
    switch (status) {
        case 403:
            toast.error('You do not have permission to perform this action')
            break
        case 404:
            toast.error('Resource not found')
            break
        case 409:
            toast.error(message)
            break
        case 500:
            toast.error('Server error. Please try again later.')
            break
        default:
            if (!status) {
                toast.error('Network error. Please check your connection.')
            } else {
                toast.error(message)
            }
    }
}

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }
        if (import.meta.env.DEV) {
            const method = (config.method || 'get').toUpperCase()
            const u = config.url || ''
            console.log('[API]', method, u)
        }
        return config
    },
    (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config || {}
        const status = error.response?.status
        const message = getErrorMessage(error)

        if (import.meta.env.DEV) {
            console.error('[API Error]', status, error.response?.data)
        }

        if (status === 401 && !originalRequest._retry) {
            if (isAuthPublicRoute(originalRequest) || isRefreshRequest(originalRequest)) {
                notifyHttpError(status, message)
                return Promise.reject(error)
            }

            const refreshToken = localStorage.getItem('refreshToken')
            if (!refreshToken) {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                toast.error('Session expired. Please login again.')
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login'
                }
                return Promise.reject(error)
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`
                            resolve(apiClient(originalRequest))
                        },
                        reject,
                    })
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const { data: body } = await refreshClient.post(
                    '/api/v1/auth/refresh-token',
                    { refreshToken },
                )
                const payload = body?.data ?? body
                const newAccessToken = payload?.accessToken ?? payload?.access_token
                if (!newAccessToken) {
                    throw new Error('No access token in refresh response')
                }
                localStorage.setItem('accessToken', newAccessToken)
                window.dispatchEvent(
                    new CustomEvent('smart-campus:access-token', {
                        detail: { accessToken: newAccessToken },
                    }),
                )
                processQueue(null, newAccessToken)
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                toast.error('Session expired. Please login again.')
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login'
                }
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        if (status && status !== 401) {
            notifyHttpError(status, message)
        } else if (!status) {
            notifyHttpError(undefined, message)
        }

        return Promise.reject(error)
    },
)

export default apiClient
export { baseURL }
