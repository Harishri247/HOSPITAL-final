import axiosInstance from './axiosInstance';

export const authApi = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  register: (data) => axiosInstance.post('/auth/register', data),
  logout: () => axiosInstance.post('/auth/logout'),
};

export const userApi = {
  getProfile: () => axiosInstance.get('/users/profile'),
  updateProfile: (data) => axiosInstance.put('/users/profile', data),
  getDoctors: () => axiosInstance.get('/users/doctors'),
  getDepartments: () => axiosInstance.get('/users/departments'),
};

export const patientApi = {
  getAll: () => axiosInstance.get('/patients'),
  getPaged: (page = 0, size = 10) => axiosInstance.get(`/patients/paged?page=${page}&size=${size}`),
  getById: (id) => axiosInstance.get(`/patients/${id}`),
  register: (data) => axiosInstance.post('/patients/register', data),
  update: (id, data) => axiosInstance.put(`/patients/${id}`, data),
  delete: (id) => axiosInstance.delete(`/patients/${id}`),
  search: (query) => axiosInstance.get(`/patients/search?query=${encodeURIComponent(query || '')}`),
  getHistory: (id) => axiosInstance.get(`/patients/${id}/history`),
};

export const appointmentApi = {
  filter: (doctorId, date, status) => {
    const params = new URLSearchParams();
    if (doctorId) params.append('doctorId', doctorId);
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    return axiosInstance.get(`/appointments?${params.toString()}`);
  },
  getById: (id) => axiosInstance.get(`/appointments/${id}`),
  getByPatient: (patientId) => axiosInstance.get(`/appointments/patient/${patientId}`),
  getByDoctor: (doctorId) => axiosInstance.get(`/appointments/doctor/${doctorId}`),
  book: (data) => axiosInstance.post('/appointments', data),
  update: (id, data) => axiosInstance.put(`/appointments/${id}`, data),
  updateStatus: (id, status) => axiosInstance.put(`/appointments/${id}/status?status=${status}`),
  cancel: (id) => axiosInstance.delete(`/appointments/${id}`),
  getSlots: (doctorId, date) => axiosInstance.get(`/appointments/available-slots?doctorId=${doctorId}&date=${date}`),
};

export const recordApi = {
  create: (data) => axiosInstance.post('/records', data),
  getByPatient: (patientId) => axiosInstance.get(`/records/patient/${patientId}`),
  getById: (id) => axiosInstance.get(`/records/${id}`),
  update: (id, data) => axiosInstance.put(`/records/${id}`, data),
};

export const prescriptionApi = {
  create: (data) => axiosInstance.post('/prescriptions', data),
  getByPatient: (patientId) => axiosInstance.get(`/prescriptions/patient/${patientId}`),
  getPending: () => axiosInstance.get('/prescriptions/pending'),
  dispense: (id, data) => axiosInstance.put(`/prescriptions/${id}/dispense`, data),
};

export const wardApi = {
  createWard: (data) => axiosInstance.post('/wards', data),
  getAllWards: () => axiosInstance.get('/wards'),
  getWardById: (id) => axiosInstance.get(`/wards/${id}`),
  createBed: (data) => axiosInstance.post('/beds', data),
  getAvailableBeds: () => axiosInstance.get('/beds/available'),
  getBedsByWard: (wardId) => axiosInstance.get(`/beds/ward/${wardId}`),
  assignBed: (data) => axiosInstance.post('/beds/assign', data),
  transferBed: (data) => axiosInstance.post('/beds/transfer', data),
  releaseBed: (bedId) => axiosInstance.post(`/beds/${bedId}/release`),
  updateBedStatus: (bedId, status) => axiosInstance.put(`/beds/${bedId}/status?status=${status}`),
  getDoctorPatientBeds: () => axiosInstance.get('/beds/doctor-beds'),
  getStats: () => axiosInstance.get('/wards/stats'),
};

export const labApi = {
  getAll: () => axiosInstance.get('/lab/orders'),
  createOrder: (data) => axiosInstance.post('/lab/orders', data),
  getByPatient: (patientId) => axiosInstance.get(`/lab/orders/patient/${patientId}`),
  getById: (id) => axiosInstance.get(`/lab/orders/${id}`),
  getPending: () => axiosInstance.get('/lab/results/pending'),
  recordResult: (orderId, data) => axiosInstance.put(`/lab/results/${orderId}`, data),
  getCritical: () => axiosInstance.get('/lab/critical-values'),
};

export const billingApi = {
  getAll: () => axiosInstance.get('/billing'),
  generate: (data) => axiosInstance.post('/billing/generate', data),
  getByPatient: (patientId) => axiosInstance.get(`/billing/patient/${patientId}`),
  getById: (id) => axiosInstance.get(`/billing/${id}`),
  recordPayment: (billId, data) => axiosInstance.put(`/billing/${billId}/payment`, data),
  submitInsurance: (data) => axiosInstance.post('/billing/insurance-claim', data),
  getReports: () => axiosInstance.get('/billing/reports'),
};

export const pharmacyApi = {
  getAll: () => axiosInstance.get('/pharmacy/medicines'),
  add: (data) => axiosInstance.post('/pharmacy/medicines', data),
  getById: (id) => axiosInstance.get(`/pharmacy/medicines/${id}`),
  update: (id, data) => axiosInstance.put(`/pharmacy/medicines/${id}`, data),
  updateStock: (id, data) => axiosInstance.put(`/pharmacy/medicines/${id}/stock`, data),
  delete: (id) => axiosInstance.delete(`/pharmacy/medicines/${id}`),
  getLowStock: () => axiosInstance.get('/pharmacy/low-stock'),
  search: (query) => axiosInstance.get(`/pharmacy/search?query=${encodeURIComponent(query || '')}`),
  dispense: (id, data) => axiosInstance.post(`/pharmacy/medicines/${id}/dispense`, data),
  getControlledLogs: () => axiosInstance.get('/pharmacy/controlled-logs'),
};

export const notificationApi = {
  getAll: () => axiosInstance.get('/notifications'),
  getUnreadCount: () => axiosInstance.get('/notifications/unread-count'),
  markRead: (id) => axiosInstance.put(`/notifications/${id}/read`),
  markAllRead: () => axiosInstance.put('/notifications/read-all'),
};

export const adminApi = {
  getAnalytics: () => axiosInstance.get('/admin/analytics'),
  getAuditLogs: () => axiosInstance.get('/admin/audit-logs'),
  getAuditLogsPaged: (page = 0, size = 15) => axiosInstance.get(`/admin/audit-logs/paged?page=${page}&size=${size}`),
  getSystemHealth: () => axiosInstance.get('/admin/system-health'),
  broadcast: (message) => axiosInstance.post('/admin/notifications', { message }),
  getUsers: () => axiosInstance.get('/admin/users'),
  createUser: (userData) => axiosInstance.post('/admin/users', userData),
  updateUser: (userId, userData) => axiosInstance.put(`/admin/users/${userId}`, userData),
  updateRole: (userId, role) => axiosInstance.put(`/admin/users/${userId}/role?role=${role}`),
  updateStatus: (userId, active) => axiosInstance.put(`/admin/users/${userId}/status?active=${active}`),
};
