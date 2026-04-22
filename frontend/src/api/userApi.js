import apiClient from './axiosConfig.js'

export const userApi = {
    getAllUsers: (params) => apiClient.get('/api/v1/users', { params }),
    getUserById: (id) => apiClient.get(`/api/v1/users/${id}`),
    getTechnicians: () => apiClient.get('/api/v1/users/technicians'),
    updateUserRole: (id, role) => apiClient.patch(`/api/v1/users/${id}/role`, { role }),
    updateUserStatus: (id, enabled) => apiClient.patch(`/api/v1/users/${id}/status`, { enabled }),
}
