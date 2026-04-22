import apiClient from './axiosConfig.js'

export const facilityApi = {
    getAllFacilities: (filters = {}) =>
        apiClient.get('/api/v1/facilities', { params: filters }),

    getFacilityById: (id) => apiClient.get(`/api/v1/facilities/${id}`),

    createFacility: (data) => apiClient.post('/api/v1/facilities', data),

    updateFacility: (id, data) => apiClient.put(`/api/v1/facilities/${id}`, data),

    deleteFacility: (id) => apiClient.delete(`/api/v1/facilities/${id}`),

    searchFacilities: (searchParams = {}) =>
        apiClient.get('/api/v1/facilities/search', { params: searchParams }),
}
