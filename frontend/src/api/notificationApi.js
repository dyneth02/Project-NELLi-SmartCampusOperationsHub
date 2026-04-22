import apiClient from './axiosConfig.js'

export const notificationApi = {
    getNotifications: () => apiClient.get('/api/v1/notifications'),

    getUnreadNotifications: () =>
        apiClient.get('/api/v1/notifications/unread'),

    getUnreadCount: () =>
        apiClient.get('/api/v1/notifications/unread/count'),

    markAsRead: (id) =>
        apiClient.patch(`/api/v1/notifications/${id}/read`),

    markAllAsRead: () =>
        apiClient.patch('/api/v1/notifications/mark-all-read'),

    deleteNotification: (id) =>
        apiClient.delete(`/api/v1/notifications/${id}`),

    getPreferences: () =>
        apiClient.get('/api/v1/notifications/preferences'),

    updatePreferences: (data) =>
        apiClient.patch('/api/v1/notifications/preferences', data),
}
