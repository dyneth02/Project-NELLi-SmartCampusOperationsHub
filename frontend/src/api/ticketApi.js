import apiClient from './axiosConfig.js'

export const ticketApi = {
    createTicket: (data) => apiClient.post('/api/v1/tickets', data),

    getMyTickets: () => apiClient.get('/api/v1/tickets/my-tickets'),

    getAssignedTickets: () => apiClient.get('/api/v1/tickets/assigned'),

    getAllTickets: (filters = {}) =>
        apiClient.get('/api/v1/tickets', { params: filters }),

    getTicketById: (id) => apiClient.get(`/api/v1/tickets/${id}`),

    updateTicket: (id, data) => apiClient.put(`/api/v1/tickets/${id}`, data),

    updateTicketStatus: (id, statusData) =>
        apiClient.patch(`/api/v1/tickets/${id}/status`, statusData),

    assignTicket: (id, technicianId) =>
        apiClient.patch(`/api/v1/tickets/${id}/assign`, { technicianId }),

    /**
     * @param {string|number} id
     * @param {File} file
     */
    uploadAttachment: (id, file) => {
        const formData = new FormData()
        formData.append('file', file)
        return apiClient.post(`/api/v1/tickets/${id}/attachments`, formData)
    },

    deleteAttachment: (attachmentId) =>
        apiClient.delete(`/api/v1/tickets/attachments/${attachmentId}`),

    getAttachments: (id) => apiClient.get(`/api/v1/tickets/${id}/attachments`),

    addComment: (id, content) =>
        apiClient.post(`/api/v1/tickets/${id}/comments`, { content }),

    updateComment: (commentId, content) =>
        apiClient.put(`/api/v1/tickets/comments/${commentId}`, { content }),

    deleteComment: (commentId) =>
        apiClient.delete(`/api/v1/tickets/comments/${commentId}`),

    getComments: (id) => apiClient.get(`/api/v1/tickets/${id}/comments`),
}
