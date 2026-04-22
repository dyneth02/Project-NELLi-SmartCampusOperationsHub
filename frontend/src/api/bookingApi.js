import apiClient from './axiosConfig.js'

export const bookingApi = {
    createBooking: (data) => apiClient.post('/api/v1/bookings', data),

    createRecurringBooking: (data) =>
        apiClient.post('/api/v1/bookings/recurring', data),

    getMyBookings: (status) =>
        apiClient.get('/api/v1/bookings/my-bookings', {
            params: status != null ? { status } : undefined,
        }),

    getAllBookings: (filters = {}) =>
        apiClient.get('/api/v1/bookings', { params: filters }),

    getBookingById: (id) => apiClient.get(`/api/v1/bookings/${id}`),

    approveBooking: (id) =>
        apiClient.patch(`/api/v1/bookings/${id}/approve`),

    rejectBooking: (id, reason) =>
        apiClient.patch(`/api/v1/bookings/${id}/reject`, { reason }),

    cancelBooking: (id) => apiClient.delete(`/api/v1/bookings/${id}`),

    getFacilityBookings: (facilityId) =>
        apiClient.get(`/api/v1/bookings/facility/${facilityId}`),

    getFacilityAvailability: (facilityId, params) =>
        apiClient.get(`/api/v1/facilities/${facilityId}/availability`, { params }),
}
