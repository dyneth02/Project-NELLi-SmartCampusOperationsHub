import apiClient from './axiosConfig.js'

export const analyticsApi = {
    getOverview: () => apiClient.get('/api/v1/analytics/overview'),

    getTopUsedFacilities: (limit) =>
        apiClient.get('/api/v1/analytics/facilities/top-used', {
            params: limit != null ? { limit } : undefined,
        }),

    getPeakHours: () =>
        apiClient.get('/api/v1/analytics/bookings/peak-hours'),

    getTicketMetrics: () =>
        apiClient.get('/api/v1/analytics/tickets/metrics'),

    getFacilityUsage: (startDate, endDate) =>
        apiClient.get('/api/v1/analytics/facilities/usage', {
            params: { startDate, endDate },
        }),
}
