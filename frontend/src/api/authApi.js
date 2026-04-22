import apiClient from './axiosConfig.js'

export const authApi = {
    login: (email, password) =>
        apiClient.post('/api/v1/auth/login', { email, password }),

    register: (userData) => apiClient.post('/api/v1/auth/register', userData),

    loginWithGoogle: (googleData) =>
        apiClient.post('/api/v1/auth/google', googleData),

    refreshToken: (refreshToken) =>
        apiClient.post('/api/v1/auth/refresh-token', { refreshToken }),

    getCurrentUser: () => apiClient.get('/api/v1/auth/me'),

    logout: () => apiClient.post('/api/v1/auth/logout'),
}
