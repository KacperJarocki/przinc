const baseUrl = '/api/'; 

export const Endpoints = {
    login: `${baseUrl}auth/login`,
    register: `${baseUrl}auth/register`,
    logout: `${baseUrl}auth/logout`,
    checkStatus: `${baseUrl}auth/check`,
    
    getTickets: `${baseUrl}tickets`,
    getCategories: `${baseUrl}categories`,
    getTicket: (params: { id: number }) => `${baseUrl}tickets/${params.id}`,
    createTicket: `${baseUrl}tickets`,
    updateTicket: (params: { id: number }) => `${baseUrl}tickets/${params.id}`,
    deleteTicket: (params: { id: number }) => `${baseUrl}tickets/${params.id}`,
    
    getTicketMessages: (params: { ticketId: number }) => `${baseUrl}tickets/${params.ticketId}/messages`,
    sendTicketMessage: (params: { ticketId: number }) => `${baseUrl}tickets/${params.ticketId}/messages`,
    
    getTicketGroups: `${baseUrl}ticket-groups`,
    createTicketGroup: `${baseUrl}ticket-groups`,
    deleteTicketGroup: (params: { id: number }) => `${baseUrl}ticket-groups/${params.id}`,
    addTicketToGroup: (params: { groupId: number, ticketId: number }) => `${baseUrl}ticket-groups/${params.groupId}/tickets/${params.ticketId}`,
    removeTicketFromGroup: (params: { groupId: number, ticketId: number }) => `${baseUrl}ticket-groups/${params.groupId}/tickets/${params.ticketId}`,
    
    getAllUsers: `${baseUrl}admin/users`,
    createUser: `${baseUrl}admin/users`,
    updateUser: (params: { id: number }) => `${baseUrl}admin/users/${params.id}`,
    deleteUser: (params: { id: number }) => `${baseUrl}admin/users/${params.id}`,
    getAdminDashboard: `${baseUrl}admin/dashboard`,
    
    getAllowedDomains: `${baseUrl}admin/allowed-domains`,
    addAllowedDomain: `${baseUrl}admin/allowed-domains`,
    deleteAllowedDomain: (params: { id: number }) => `${baseUrl}admin/allowed-domains/${params.id}`,

    getAnalyticsStatistics: `${baseUrl}analytics/statistics`,
}
export type EndpointKeys = keyof typeof Endpoints; 
export type lambda = (param: any) => string; 