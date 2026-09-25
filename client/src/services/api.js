import axios from 'axios';

export const AUTH_TOKEN_KEY = 'vastora_crm_token';
export const AUTH_USER_KEY = 'vastora_crm_user';

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const skipRedirect = url.includes('/auth/login') || url.includes('/auth/me') || url.includes('/studio/notifications');

    if (status === 401 && !skipRedirect) {
      clearAuthStorage();
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  delete: (id) => api.delete(`/users/${id}`),
};

export const areaManagerAPI = {
  getAll: (params) => api.get('/area-managers', { params }),
  getOne: (id) => api.get(`/area-managers/${id}`),
  create: (data) => api.post('/area-managers', data),
  update: (id, data) => api.put(`/area-managers/${id}`, data),
  delete: (id) => api.delete(`/area-managers/${id}`),
  toggleStatus: (id) => api.patch(`/area-managers/${id}/toggle-status`),
};

export const dealerAPI = {
  getAll: (params) => api.get('/dealers', { params }),
  getOne: (id) => api.get(`/dealers/${id}`),
  getProfile: (id) => api.get(`/dealers/${id}/profile`),
  getMyProfile: () => api.get('/dealers/me/profile'),
  create: (data) => api.post('/dealers', data),
  update: (id, data) => api.put(`/dealers/${id}`, data),
  delete: (id) => api.delete(`/dealers/${id}`),
  assign: (id, data) => api.post(`/dealers/${id}/assign`, data),
  createLogin: (id, data) => api.post(`/dealers/${id}/login`, data),
  getAssignmentHistory: (id) => api.get(`/dealers/${id}/assignment-history`),
};

export const visitAPI = {
  getAll: (params) => api.get('/visits', { params }),
  getOne: (id) => api.get(`/visits/${id}`),
  create: (data) => api.post('/visits', data),
  update: (id, data) => api.put(`/visits/${id}`, data),
  delete: (id) => api.delete(`/visits/${id}`),
};

export const mediaAPI = {
  getAll: (params) => api.get('/media', { params: { limit: 48, ...params } }),
  upload: (formData) => api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve: (id, data) => api.patch(`/media/${id}/approve`, data),
  delete: (id) => api.delete(`/media/${id}`),
};

export const dashboardAPI = {
  getSuperAdmin: () => api.get('/dashboard/super-admin'),
  getAdmin: () => api.get('/dashboard/admin'),
  getAreaManager: () => api.get('/dashboard/area-manager'),
  getDealer: () => api.get('/dashboard/dealer'),
  getActivities: (params) => api.get('/dashboard/activities', { params }),
};

export const reportAPI = {
  getAuditLogs: (params) => api.get('/reports/audit-logs', { params }),
  getDealers: () => api.get('/reports/dealers'),
  getVisits: (params) => api.get('/reports/visits', { params }),
  getUploads: (params) => api.get('/reports/uploads', { params }),
  getStateWise: () => api.get('/reports/state-wise'),
  getAreaWise: () => api.get('/reports/area-wise'),
};

export const postersAPI = {
  sendSheet: (formData) => api.post('/posters/sheets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sheets: () => api.get('/posters/sheets'),
  sheet: (id) => api.get(`/posters/sheets/${id}`),
  saveSheet: (id, data) => api.patch(`/posters/sheets/${id}`, data),
  sendToAm: (sheetId) => api.post(`/posters/sheets/${sheetId}/send`),
  save: (formData) => api.post('/posters/save', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/posters', { params }),
  review: (id, data) => api.patch(`/posters/${id}/review`, data),
  update: (id, formData) => api.patch(`/posters/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  bulkDelete: (data) => api.post('/posters/bulk-delete', data),
  delete: (id) => api.delete(`/posters/${id}`),
};

export const videoAPI = {
  list: (params) => api.get('/videos', { params }),
  get: (id) => api.get(`/videos/${id}`),
  upload: (formData) => api.post('/videos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  save: (id, formData) => api.patch(`/videos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  render: (id) => api.post(`/videos/${id}/render`),
  sendAm: (id) => api.post(`/videos/${id}/send-am`),
  review: (id, data) => api.post(`/videos/${id}/review`, data),
  publish: (id, data) => api.post(`/videos/${id}/publish`, data),
  retry: (id, data) => api.post(`/videos/${id}/retry`, data),
  trail: (id) => api.get(`/videos/${id}/trail`),
  restore: (id, index) => api.post(`/studio/videos/${id}/restore/${index}`),
  comment: (id, data) => api.post(`/studio/videos/${id}/comments`, data),
  analytics: (id) => api.get(`/studio/videos/${id}/analytics`),
  applyTemplate: (id, templateId) => api.post(`/studio/videos/${id}/template`, { templateId }),
};

export const studioAPI = {
  queue: () => api.get('/studio/queue'),
  library: (params) => api.get('/studio/library', { params }),
  addAsset: (formData) => api.post('/studio/library', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAsset: (id) => api.delete(`/studio/library/${id}`),
  templates: () => api.get('/studio/templates'),
  saveTemplate: (data) => api.post('/studio/templates', data),
  deleteTemplate: (id) => api.delete(`/studio/templates/${id}`),
  notifications: () => api.get('/studio/notifications'),
  readNotifications: (ids) => api.post('/studio/notifications/read', { ids }),
  ai: (data) => api.post('/studio/ai', data),
  health: () => api.get('/studio/health'),
};

export const socialAPI = {
  config: () => api.get('/social/config'),
  list: (params) => api.get('/social', { params }),
  publish: (formData) => api.post('/social', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLetterhead: (formData) =>
    api.post('/settings/letterhead', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
