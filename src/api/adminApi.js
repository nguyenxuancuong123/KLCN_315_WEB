import httpClient from './httpClient';

// ─── Dashboard Stats ────────────────────────────────────────────────────────
export function fetchDashboardStats() {
  return httpClient.get('/api/admin/dashboard/stats').then((res) => res.data);
}

// ─── Quản lý người dùng ─────────────────────────────────────────────
export function fetchUsers({ role, status, keyword, page = 0, size = 10, sort = 'createdAt,desc' } = {}) {
  return httpClient
    .get('/api/admin/users', { params: { role, status, keyword, page, size, sort } })
    .then((res) => res.data);
}

export function fetchUserById(id) {
  return httpClient.get(`/api/admin/users/${id}`).then((res) => res.data);
}

export function updateUserRole(userId, role) {
  return httpClient.put(`/api/admin/users/${userId}/role`, { role }).then((res) => res.data);
}

export function updateUserStatus(userId, status) {
  return httpClient.put(`/api/admin/users/${userId}/status`, { status }).then((res) => res.data);
}

export function deleteUser(userId) {
  return httpClient.delete(`/api/admin/users/${userId}`).then((res) => res.data);
}

// ─── Sức khỏe Elderly ────────────────────────────────────────────────
export function fetchElderly({ page = 0, size = 10, sort = 'createdAt,desc' } = {}) {
  return httpClient.get('/api/admin/elderly', { params: { page, size, sort } }).then((res) => res.data);
}

export function fetchElderlyOverview(id) {
  return httpClient.get(`/api/admin/elderly/${id}/overview`).then((res) => res.data);
}

export function fetchElderlyLatestSensor(id) {
  return httpClient.get(`/api/admin/elderly/${id}/sensor-latest`).then((res) => res.data);
}

// ─── Báo cáo xu hướng ────────────────────────────────────────────────
export function fetchTrendReport(elderlyId, period = 'week') {
  return httpClient
    .get('/api/admin/reports/trend', { params: { elderlyId, period } })
    .then((res) => res.data);
}

// ─── Quản lý cảnh báo phát sinh ─────────────────────────────────────
// BE đã ORDER BY createdAt DESC trong query → không cần truyền sort
export function fetchAlerts({ elderlyId, status, severity, page = 0, size = 20 } = {}) {
  return httpClient
    .get('/api/admin/alerts', { params: { elderlyId, status, severity, page, size } })
    .then((res) => res.data);
}

export function acknowledgeAlert(id) {
  return httpClient.put(`/api/admin/alerts/${id}/acknowledge`).then((res) => res.data);
}

export function resolveAlert(id) {
  return httpClient.put(`/api/admin/alerts/${id}/resolve`).then((res) => res.data);
}

// ─── Quản lý Bác sĩ (Admin tạo tài khoản) ──────────────────────────
export function createDoctor(payload) {
  // payload: { email, password, fullName }
  // BE tự gán role = DOCTOR, status = ACTIVE
  return httpClient.post('/api/admin/doctors', payload).then((res) => res.data);
}

// ─── Phân công Bác sĩ phụ trách hồ sơ người cao tuổi ──────────────
// BE: POST /api/admin/doctor-assignments  body: { elderlyId, doctorId }
// Trả về DoctorAssignmentResponse: { id, elderlyId, elderlyName, doctorId, doctorName, status, createdAt }
export function assignDoctor({ elderlyId, doctorId }) {
  return httpClient
    .post('/api/admin/doctor-assignments', { elderlyId, doctorId })
    .then((res) => res.data);
}

export function fetchDoctorAssignments({ page = 0, size = 10, sort = 'createdAt,desc' } = {}) {
  return httpClient
    .get('/api/admin/doctor-assignments', { params: { page, size, sort } })
    .then((res) => res.data);
}

export function deleteDoctorAssignment(id) {
  return httpClient
    .delete(`/api/admin/doctor-assignments/${id}`)
    .then((res) => res.data);
}

