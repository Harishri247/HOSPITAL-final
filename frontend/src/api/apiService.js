import axiosInstance from './axiosInstance';

// Helper to validate and avoid sending 'null'/'undefined'/falsy IDs to Spring Boot
const isValidId = (id) => id != null && id !== '' && id !== 'null' && id !== 'undefined';

export const authApi = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  register: (data) => axiosInstance.post('/auth/register', data),
  activatePatient: (data) => axiosInstance.post('/auth/patient-activate', data),
  logout: () => axiosInstance.post('/auth/logout'),
};

export const userApi = {
  getProfile: () => axiosInstance.get('/users/profile'),
  updateProfile: (data) => axiosInstance.put('/users/profile', data),
  getDoctors: () => axiosInstance.get('/users/doctors'),
  getNurses: () => axiosInstance.get('/users/nurses'),
  getDepartments: () => axiosInstance.get('/users/departments'),
};

export const patientApi = {
  getMe: () => axiosInstance.get('/patients/me'),
  getAll: () => axiosInstance.get('/patients'),
  getPaged: (page = 0, size = 10) => axiosInstance.get(`/patients/paged?page=${page}&size=${size}`),
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid patient ID'));
    return axiosInstance.get(`/patients/${id}`);
  },
  register: (data) => axiosInstance.post('/patients/register', data),
  update: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid patient ID'));
    return axiosInstance.put(`/patients/${id}`, data);
  },
  delete: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid patient ID'));
    return axiosInstance.delete(`/patients/${id}`);
  },
  search: (query) => axiosInstance.get(`/patients/search?query=${encodeURIComponent(query || '')}`),
  getHistory: (id) => {
    if (!isValidId(id)) return Promise.resolve({ data: { appointments: [], records: [], prescriptions: [], labOrders: [] } });
    return axiosInstance.get(`/patients/${id}/history`);
  },
  allocateNurse: (id, nurseId) => {
    if (!isValidId(id) || !isValidId(nurseId)) return Promise.reject(new Error('Invalid patient or nurse ID'));
    return axiosInstance.post(`/patients/${id}/allocate-nurse?nurseId=${nurseId}`);
  },
};

export const appointmentApi = {
  getToday: () => axiosInstance.get('/appointments/today'),
  filter: (doctorId, date, status) => {
    const params = new URLSearchParams();
    if (isValidId(doctorId)) params.append('doctorId', doctorId);
    if (date && date !== 'null' && date !== 'undefined') params.append('date', date);
    if (status && status !== 'null' && status !== 'undefined' && status !== 'ALL') params.append('status', status);
    const qs = params.toString();
    return axiosInstance.get(`/appointments${qs ? '?' + qs : ''}`);
  },
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid appointment ID'));
    return axiosInstance.get(`/appointments/${id}`);
  },
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/appointments/patient/${patientId}`);
  },
  getByDoctor: (doctorId) => {
    if (!isValidId(doctorId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/appointments/doctor/${doctorId}`);
  },
  book: (data) => axiosInstance.post('/appointments', data),
  update: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid appointment ID'));
    return axiosInstance.put(`/appointments/${id}`, data);
  },
  updateStatus: (id, status) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid appointment ID'));
    return axiosInstance.put(`/appointments/${id}/status?status=${status}`);
  },
  cancel: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid appointment ID'));
    return axiosInstance.delete(`/appointments/${id}`);
  },
  getSlots: (doctorId, date) => {
    if (!isValidId(doctorId) || !date) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/appointments/available-slots?doctorId=${doctorId}&date=${date}`);
  },
  completeConsultation: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Valid appointment ID is required to complete consultation'));
    return axiosInstance.post(`/appointments/${id}/consultation`, data);
  },
};

export const recordApi = {
  create: (data) => axiosInstance.post('/records', data),
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/records/patient/${patientId}`);
  },
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid record ID'));
    return axiosInstance.get(`/records/${id}`);
  },
  update: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid record ID'));
    return axiosInstance.put(`/records/${id}`, data);
  },
};

export const prescriptionApi = {
  getAll: (doctorId, status) => {
    const params = new URLSearchParams();
    if (isValidId(doctorId)) params.append('doctorId', doctorId);
    if (status && status !== 'null' && status !== 'undefined' && status !== 'ALL') params.append('status', status);
    const query = params.toString();
    return axiosInstance.get(`/prescriptions${query ? '?' + query : ''}`);
  },
  create: (data) => axiosInstance.post('/prescriptions', data),
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/prescriptions/patient/${patientId}`);
  },
  getPending: (doctorId) => {
    const params = new URLSearchParams();
    if (isValidId(doctorId)) params.append('doctorId', doctorId);
    const query = params.toString();
    return axiosInstance.get(`/prescriptions/pending${query ? '?' + query : ''}`);
  },
  getSafetyCheck: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid prescription ID'));
    return axiosInstance.get(`/prescriptions/${id}/safety-check`);
  },
  dispense: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid prescription ID'));
    return axiosInstance.put(`/prescriptions/${id}/dispense`, data);
  },
};

export const wardApi = {
  createWard: (data) => axiosInstance.post('/wards', data),
  getAllWards: () => axiosInstance.get('/wards'),
  getWardById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid ward ID'));
    return axiosInstance.get(`/wards/${id}`);
  },
  createBed: (data) => axiosInstance.post('/beds', data),
  getAvailableBeds: () => axiosInstance.get('/beds/available'),
  getBedsByWard: (wardId) => {
    if (!isValidId(wardId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/beds/ward/${wardId}`);
  },
  assignBed: (data) => axiosInstance.post('/beds/assign', data),
  transferBed: (data) => axiosInstance.post('/beds/transfer', data),
  releaseBed: (bedId) => {
    if (!isValidId(bedId)) return Promise.reject(new Error('Invalid bed ID'));
    return axiosInstance.post(`/beds/${bedId}/release`);
  },
  updateBedStatus: (bedId, status) => {
    if (!isValidId(bedId)) return Promise.reject(new Error('Invalid bed ID'));
    return axiosInstance.put(`/beds/${bedId}/status?status=${status}`);
  },
  getDoctorPatientBeds: () => axiosInstance.get('/beds/doctor-beds'),
  getStats: () => axiosInstance.get('/wards/stats'),
};

export const admissionApi = {
  createOrder: (data) => axiosInstance.post('/admissions/orders', data),
  getOrders: (status, doctorId) => {
    const params = new URLSearchParams();
    if (status && status !== 'null' && status !== 'undefined' && status !== 'ALL') params.append('status', status);
    if (isValidId(doctorId)) params.append('doctorId', doctorId);
    const query = params.toString();
    return axiosInstance.get(`/admissions/orders${query ? '?' + query : ''}`);
  },
  getPendingOrders: () => axiosInstance.get('/admissions/orders/pending'),
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/admissions/orders/patient/${patientId}`);
  },
  cancelOrder: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid admission order ID'));
    return axiosInstance.post(`/admissions/orders/${id}/cancel`);
  },
};

export const dischargeApi = {
  saveDraft: (data) => axiosInstance.post('/discharge/draft', data),
  signSummary: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid discharge summary ID'));
    return axiosInstance.post(`/discharge/${id}/sign`, data);
  },
  clearBilling: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid discharge summary ID'));
    return axiosInstance.post(`/discharge/${id}/clear-billing`, data || {});
  },
  completeDischarge: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid discharge summary ID'));
    return axiosInstance.post(`/discharge/${id}/complete`);
  },
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid discharge summary ID'));
    return axiosInstance.get(`/discharge/${id}`);
  },
  getByAdmission: (admissionOrderId) => {
    if (!isValidId(admissionOrderId)) return Promise.resolve({ data: null });
    return axiosInstance.get(`/discharge/admission/${admissionOrderId}`);
  },
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/discharge/patient/${patientId}`);
  },
  getAll: () => axiosInstance.get('/discharge'),
};

export const labApi = {
  getAll: () => axiosInstance.get('/lab/orders'),
  createOrder: (data) => axiosInstance.post('/lab/orders', data),
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/lab/orders/patient/${patientId}`);
  },
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.get(`/lab/orders/${id}`);
  },
  getPending: () => axiosInstance.get('/lab/results/pending'),
  receiveOrder: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.put(`/lab/orders/${id}/receive`, data || {});
  },
  collectSpecimen: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.put(`/lab/orders/${id}/collect-specimen`, data || {});
  },
  startTesting: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.put(`/lab/orders/${id}/start-test`, data || {});
  },
  recordResult: (orderId, data) => {
    if (!isValidId(orderId)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.put(`/lab/results/${orderId}`, data);
  },
  doctorReview: (orderId, data) => {
    if (!isValidId(orderId)) return Promise.reject(new Error('Invalid lab order ID'));
    return axiosInstance.put(`/lab/orders/${orderId}/doctor-review`, data || {});
  },
  getCritical: () => axiosInstance.get('/lab/critical-values'),
};

export const billingApi = {
  getAll: () => axiosInstance.get('/billing'),
  generate: (data) => axiosInstance.post('/billing/generate', data),
  getConsultationPreview: (appointmentId) => {
    if (!isValidId(appointmentId)) return Promise.reject(new Error('Invalid appointment ID'));
    return axiosInstance.get(`/billing/consultation-preview/${appointmentId}`);
  },
  generateConsultationBill: (data) => axiosInstance.post('/billing/generate-consultation-bill', data),
  getByPatient: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/billing/patient/${patientId}`);
  },
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid bill ID'));
    return axiosInstance.get(`/billing/${id}`);
  },
  recordPayment: (billId, data) => {
    if (!isValidId(billId)) return Promise.reject(new Error('Invalid bill ID'));
    return axiosInstance.put(`/billing/${billId}/payment`, data);
  },
  submitInsurance: (data) => axiosInstance.post('/billing/insurance-claim', data),
  getReports: () => axiosInstance.get('/billing/reports'),
};

export const pharmacyApi = {
  getAll: () => axiosInstance.get('/pharmacy/medicines'),
  add: (data) => axiosInstance.post('/pharmacy/medicines', data),
  getById: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid medicine ID'));
    return axiosInstance.get(`/pharmacy/medicines/${id}`);
  },
  update: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid medicine ID'));
    return axiosInstance.put(`/pharmacy/medicines/${id}`, data);
  },
  updateStock: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid medicine ID'));
    return axiosInstance.put(`/pharmacy/medicines/${id}/stock`, data);
  },
  delete: (id) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid medicine ID'));
    return axiosInstance.delete(`/pharmacy/medicines/${id}`);
  },
  getLowStock: () => axiosInstance.get('/pharmacy/low-stock'),
  search: (query) => axiosInstance.get(`/pharmacy/search?query=${encodeURIComponent(query || '')}`),
  dispense: (id, data) => {
    if (!isValidId(id)) return Promise.reject(new Error('Invalid medicine ID'));
    return axiosInstance.post(`/pharmacy/medicines/${id}/dispense`, data);
  },
  getControlledLogs: () => axiosInstance.get('/pharmacy/controlled-logs'),
};

export const notificationApi = {
  getAll: () => axiosInstance.get('/notifications'),
  getUnreadCount: () => axiosInstance.get('/notifications/unread-count'),
  markRead: (id) => {
    if (!isValidId(id)) return Promise.resolve({ data: {} });
    return axiosInstance.put(`/notifications/${id}/read`);
  },
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
  updateUser: (userId, userData) => {
    if (!isValidId(userId)) return Promise.reject(new Error('Invalid user ID'));
    return axiosInstance.put(`/admin/users/${userId}`, userData);
  },
  updateRole: (userId, role) => {
    if (!isValidId(userId)) return Promise.reject(new Error('Invalid user ID'));
    const normalizedRole = String(role).toUpperCase().startsWith('ROLE_') ? String(role).toUpperCase() : `ROLE_${String(role).toUpperCase()}`;
    return axiosInstance.put(`/admin/users/${userId}/role?role=${encodeURIComponent(normalizedRole)}`);
  },
  updateStatus: (userId, active) => {
    if (!isValidId(userId)) return Promise.reject(new Error('Invalid user ID'));
    return axiosInstance.put(`/admin/users/${userId}/status?active=${active}`);
  },
  deleteUser: (userId) => {
    if (!isValidId(userId)) return Promise.reject(new Error('Invalid user ID'));
    return axiosInstance.delete(`/admin/users/${userId}`);
  },
};

export const nurseApi = {
  getDashboard: () => axiosInstance.get('/nurse/dashboard'),
  getPatients: () => axiosInstance.get('/nurse/patients'),
  getAssignedPatients: () => axiosInstance.get('/nurse/patients'),
  getPatientCareContext: (patientId) => {
    if (!isValidId(patientId)) return Promise.reject(new Error('Invalid patient ID'));
    return axiosInstance.get(`/nurse/patients/${patientId}/care-context`);
  },
  recordVitals: (data) => axiosInstance.post('/nurse/vitals', data),
  getPatientVitals: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/nurse/vitals/patient/${patientId}`);
  },
  getAlerts: () => axiosInstance.get('/nurse/vitals/alerts'),
  respondToAlert: (alertId, data) => {
    if (!isValidId(alertId)) return Promise.reject(new Error('Invalid alert ID'));
    return axiosInstance.post(`/nurse/vitals/alerts/${alertId}/respond`, data);
  },
  getMedicationSchedule: () => axiosInstance.get('/nurse/medications/schedule'),
  administerMedication: (data) => axiosInstance.post('/nurse/medications/administer', data),
  getPatientMedications: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/nurse/medications/patient/${patientId}`);
  },
  addNursingNote: (data) => axiosInstance.post('/nurse/notes', data),
  getPatientNursingNotes: (patientId) => {
    if (!isValidId(patientId)) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/nurse/notes/patient/${patientId}`);
  },
};

export const publicApi = {
  bookOpd: (data) => axiosInstance.post('/public/opd-schedule', data),
  getPublicSlots: (doctorId, date) => {
    if (!isValidId(doctorId) || !date) return Promise.resolve({ data: [] });
    return axiosInstance.get(`/public/available-slots?doctorId=${doctorId}&date=${date}`);
  },
};

