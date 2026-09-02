import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Inject auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clerk-token') || localStorage.getItem('mock-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('clerk-token');
      localStorage.removeItem('mock-token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  syncUser: (data) => api.post('/auth/sync', data),
  getNotifications: () => api.get('/auth/notifications'),
  markNotificationsRead: () => api.post('/auth/notifications/read'),
};

// Tournaments
export const tournamentAPI = {
  list: (params) => api.get('/tournaments', { params }),
  get: (id) => api.get(`/tournaments/${id}`),
  create: (data) => api.post('/tournaments', data),
  update: (id, data) => api.put(`/tournaments/${id}`, data),
  approve: (id, data) => api.post(`/tournaments/${id}/approve`, data),
  updateStatus: (id, data) => api.put(`/tournaments/${id}/status`, data),
  myTournaments: () => api.get('/tournaments/my'),
  pendingApprovals: () => api.get('/tournaments/pending'),
};

// Teams
export const teamAPI = {
  getTournamentTeams: (tid) => api.get(`/teams/tournament/${tid}`),
  getMyStatus: (tid) => api.get(`/teams/tournament/${tid}/my-status`),
  register: (data) => api.post('/teams', data),
  getInvite: (token) => api.get(`/teams/invite/${token}`),
  respondInvite: (token, data) => api.post(`/teams/invite/${token}/respond`, data),
  approveTeam: (id) => api.post(`/teams/${id}/approve`),
  rejectTeam: (id, data) => api.post(`/teams/${id}/reject`, { reason: data }),
};

// Organizer
export const organizerAPI = {
  apply: (data) => api.post('/organizer/apply', data),
  getStatus: () => api.get('/organizer/status'),
  listRequests: (status) => api.get('/organizer/requests', { params: { status } }),
  reviewRequest: (id, data) => api.post(`/organizer/requests/${id}/review`, data),
};

// Leaderboard
export const leaderboardAPI = {
  get: (tid) => api.get(`/leaderboard/${tid}`),
  update: (tid, data) => api.post(`/leaderboard/${tid}`, data),
};

// Reports
export const reportAPI = {
  file: (data) => api.post('/reports', data),
  list: (status) => api.get('/reports', { params: { status } }),
  resolve: (id, data) => api.post(`/reports/${id}/resolve`, data),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  listUsers: (role) => api.get('/admin/users', { params: { role } }),
  banUser: (id, data) => api.post(`/admin/users/${id}/ban`, data),
  unbanUser: (id) => api.post(`/admin/users/${id}/unban`),
  listStudents: () => api.get('/admin/students'),
  getStudentAnalytics: (studentId) => api.get(`/admin/students/${studentId}/analytics`),
};

export default api;
