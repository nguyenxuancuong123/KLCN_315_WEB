import { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchDashboardStats,
  fetchUsers, updateUserRole, updateUserStatus, deleteUser,
  fetchElderly, fetchElderlyOverview, fetchElderlyLatestSensor,
  fetchTrendReport,
  fetchAlerts,
  createDoctor,
  assignDoctor, fetchDoctorAssignments, deleteDoctorAssignment,
} from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BASE_URL, getErrorMessage } from '../../api/httpClient';
import { getAccessToken } from '../../utils/tokenStore';
import './AdminDashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: '📊 Tổng quan' },
  { id: 'users', label: '👥 Người dùng' },
  { id: 'doctors', label: '👨‍⚕️ Quản lý Bác sĩ' },
  { id: 'elderly', label: '🏥 Thông tin sức khỏe người lớn tuổi' },
  // { id: 'realtime', label: '📡 Real-time' },
  { id: 'trends', label: '📈 Xu hướng' },
  { id: 'alerts', label: '🔔 Danh sách cảnh báo' },
  { id: 'profile', label: '👤 Hồ sơ' },
];

// Role ELDERLY đã bị xóa khỏi hệ thống users (chỉ còn ADMIN, DOCTOR, CAREGIVER)
const ROLE_LABELS = { ADMIN: 'Quản trị viên', DOCTOR: 'Bác sĩ', CAREGIVER: 'Người chăm sóc' };
const STATUS_LABELS = { ACTIVE: 'Hoạt động', LOCKED: 'Đang khóa'};
const SEVERITY_LABELS = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' };
const ALERT_STATUS_LABELS = { NEW: 'Mới', ACKNOWLEDGED: 'Đã xác nhận', RESOLVED: 'Đã xử lý' };
const PAGE_SIZE = 10;

// ─── Shared helpers ────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function RoleBadge({ role }) {
  return <span className={`badge badge--role-${role?.toLowerCase()}`}>{ROLE_LABELS[role] || role}</span>;
}
function StatusBadge({ status }) {
  return <span className={`badge badge--status-${status?.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}
function SeverityBadge({ severity }) {
  return <span className={`badge badge--sev-${severity?.toLowerCase()}`}>{SEVERITY_LABELS[severity] || severity}</span>;
}
function AlertStatusBadge({ status }) {
  return <span className={`badge badge--alert-${status?.toLowerCase()}`}>{ALERT_STATUS_LABELS[status] || status}</span>;
}

function Spinner() {
  return <div className="state-message state-message--loading">Đang tải...</div>;
}
function ErrMsg({ msg }) {
  return msg ? <div className="state-message state-message--error">{msg}</div> : null;
}
function SuccessMsg({ msg }) {
  return msg ? <div className="state-message state-message--success">{msg}</div> : null;
}
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>← Trước</button>
      <span className="pagination__label">Trang {page + 1} / {totalPages}</span>
      <button disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sau →</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Tổng quan hệ thống
// ═══════════════════════════════════════════════════════════════════════════════
function TabOverview() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((e) => setErr(e.response?.data?.message || 'Không tải được số liệu'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (err) return <ErrMsg msg={err} />;
  if (!stats) return null;

  return (
    <div className="tab-overview">
      <div className="stats-grid">
        <div className="stats-card stats-card--primary">
          <div className="stats-card__number">{stats.totalUsers}</div>
          <div className="stats-card__label">Tổng tài khoản</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__number">{stats.byStatus?.ACTIVE ?? '—'}</div>
          <div className="stats-card__label">Đang hoạt động</div>
        </div>
        <div className="stats-card stats-card--warn">
          <div className="stats-card__number">{stats.lockedAccounts ?? stats.byStatus?.LOCKED ?? '—'}</div>
          <div className="stats-card__label">Đang khóa</div>
        </div>
        <div className="stats-card stats-card--danger">
          <div className="stats-card__number">{stats.openAlerts ?? '—'}</div>
          <div className="stats-card__label">Cảnh báo mở</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__number">{stats.connectedDevices ?? '—'}</div>
          <div className="stats-card__label">Thiết bị kết nối</div>
        </div>
      </div>

      <div className="stats-breakdown">
        <h3>Phân bổ theo vai trò</h3>
        <div className="stats-roles">
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <div key={key} className="stats-role-item">
              <RoleBadge role={key} />
              <span className="stats-role-count">{stats.byRole?.[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Quản lý người dùng
// ═══════════════════════════════════════════════════════════════════════════════
function TabUsers() {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [actionErr, setActionErr] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    fetchUsers({ role: role || undefined, status: status || undefined, keyword: keyword || undefined, page, size: PAGE_SIZE })
      .then(setData)
      .catch((e) => setErr(e.response?.data?.message || 'Không tải được danh sách'))
      .finally(() => setLoading(false));
  }, [role, status, keyword, page]);

  useEffect(() => { load(); }, [load]);

  function onFilter(setter) { return (e) => { setter(e.target.value); setPage(0); }; }

  // Xử lý đổi vai trò qua Dropdown
  async function handleRoleChange(user, newRole) {
    if (!newRole || newRole === user.role) return;

    const roleLabel = ROLE_LABELS[newRole] || newRole;
    if (!window.confirm(`Xác nhận đổi vai trò của ${user.email} sang ${roleLabel}?`)) {
      return;
    }

    setActionErr(null);
    try {
      await updateUserRole(user.id, newRole);
      load();
    } catch (e) {
      setActionErr(e.response?.data?.message || 'Đổi vai trò thất bại');
    }
  }

  async function handleStatus(user, newStatus) {
    const msgs = { DISABLED: `Vô hiệu hóa ${user.email}?`, LOCKED: `Khóa ${user.email}?`, ACTIVE: `Kích hoạt lại ${user.email}?` };
    if (!window.confirm(msgs[newStatus])) return;
    setActionErr(null);
    try { await updateUserStatus(user.id, newStatus); load(); }
    catch (e) { setActionErr(e.response?.data?.message || 'Thao tác thất bại'); }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Xác nhận xóa tài khoản ${user.email}?`)) return;
    setActionErr(null);
    try { 
      const res = await deleteUser(user.id); 
      const msg = typeof res === 'string' ? res : (res?.message || 'Tài khoản đã bị xóa');
      alert(msg);
      load(); 
    }
    catch (e) { setActionErr(e.response?.data?.message || 'Xóa thất bại'); }
  }

  return (
    <div className="tab-users">
      <div className="filters">
        <input type="text" placeholder="Tìm email hoặc họ tên..." value={keyword} onChange={onFilter(setKeyword)} />
        <select value={role} onChange={onFilter(setRole)}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={onFilter(setStatus)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-refresh" onClick={load}>🔄 Làm mới</button>
      </div>

      <ErrMsg msg={actionErr} />

      {loading ? <Spinner /> : err ? <ErrMsg msg={err} /> : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th>
                  <th>Đăng nhập gần nhất</th><th>Ngày tạo</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data?.content?.length ? data.content.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-name">{u.fullName}</div>
                      <div className="user-email">{u.email}</div>
                    </td>
                    <td>
                     
                      <select
                        className="role-dropdown-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                      >
                        <option value="CAREGIVER">{ROLE_LABELS['CAREGIVER'] || 'Người chăm sóc'}</option>
                        <option value="DOCTOR">{ROLE_LABELS['DOCTOR'] || 'Bác sĩ'}</option>
                        {u.role === 'ADMIN' && (
                          <option value="ADMIN">{ROLE_LABELS['ADMIN'] || 'Quản trị viên'}</option>
                        )}
                      </select>
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>{fmt(u.lastLoginAt)}</td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        {/* Bỏ nút "Đổi Role" dạng prompt cũ */}
                        {u.status === 'ACTIVE' && (
                          <button onClick={() => handleStatus(u, 'LOCKED')} className="btn-sm btn-warn">Khóa</button>
                        )}
                        {u.status !== 'ACTIVE' && (
                          <button onClick={() => handleStatus(u, 'ACTIVE')} className="btn-sm btn-success">Kích hoạt</button>
                        )}
                        <button onClick={() => handleDelete(u)} className="btn-sm btn-danger" style={{ marginLeft: '8px' }}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="table-empty">Không tìm thấy tài khoản nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Sức khỏe người cao tuổi
// ═══════════════════════════════════════════════════════════════════════════════
function TabElderly() {
  const [page, setPage] = useState(0);
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);   // elderly object
  const [overview, setOverview] = useState(null);
  const [sensor, setSensor] = useState(null);        // SensorLatestResponse
  const [ovLoading, setOvLoading] = useState(false);
  const [ovErr, setOvErr] = useState(null);
  const selectedIdRef = useRef(null);

  const loadList = useCallback(() => {
    setLoading(true); setErr(null);
    fetchElderly({ page, size: PAGE_SIZE })
      .then(setList)
      .catch((e) => setErr(getErrorMessage(e, 'Không tải được danh sách hồ sơ')))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { loadList(); }, [loadList]);

  function selectElderly(el) {
    selectedIdRef.current = el.id;
    setSelected(el); setOverview(null); setSensor(null); setOvErr(null); setOvLoading(true);
    // Tổng quan + dữ liệu cảm biến mới nhất (do App Flutter đẩy lên /api/v1/sensor-data)
    Promise.allSettled([fetchElderlyOverview(el.id), fetchElderlyLatestSensor(el.id)])
      .then(([ov, se]) => {
        if (selectedIdRef.current !== el.id) return; // người dùng đã chọn hồ sơ khác
        if (ov.status === 'fulfilled') setOverview(ov.value);
        else setOvErr(getErrorMessage(ov.reason, 'Không tải được dữ liệu'));
        if (se.status === 'fulfilled') setSensor(se.value);
      })
      .finally(() => { if (selectedIdRef.current === el.id) setOvLoading(false); });
  }

  const DEVICE_STATUS_COLOR = { CONNECTED: '#22c55e', DISCONNECTED: '#ef4444', EXPIRED: '#f59e0b' };

  return (
    <div className="tab-elderly">
      <div className="elderly-layout">
        <div className="elderly-list">
          <h3>Danh sách người cao tuổi ({list?.totalElements ?? '—'})</h3>
          {loading ? <Spinner /> : err ? <ErrMsg msg={err} /> : (
            <>
              {list?.content?.map((el) => (
                <div
                  key={el.id}
                  className={`elderly-item ${selected?.id === el.id ? 'elderly-item--active' : ''}`}
                  onClick={() => selectElderly(el)}
                >
                  <div className="elderly-item__name">{el.fullName}</div>
            
                  {el.caregiverName && (
                    <div className="elderly-item__caregiver">👤 {el.caregiverName}</div>
                  )}
                  <div className="elderly-item__meta">
                    <span style={{ color: DEVICE_STATUS_COLOR[el.deviceStatus] || '#888' }}>
                      ● {el.deviceStatus ?? 'N/A'}
                    </span>
                    <span className="elderly-item__sync">Sync: {fmt(el.lastSyncedAt)}</span>
                  </div>
                </div>
              ))}
              <Pagination page={page} totalPages={list?.totalPages ?? 0} onChange={setPage} />
            </>
          )}
        </div>

        <div className="elderly-detail">
          {!selected && <div className="state-message">Chọn một người cao tuổi để xem thông tin sức khỏe</div>}
          {selected && (
            <>
              <div className="threshold-list__header">
                <h3>{selected.fullName} — Tổng quan</h3>
                <button className="btn-refresh" onClick={() => selectElderly(selected)} disabled={ovLoading}>🔄 Làm mới</button>
              </div>
              {ovLoading ? <Spinner /> : !overview ? <ErrMsg msg={ovErr || 'Không tải được dữ liệu'} /> : (
                <>
                  

                  {/* ── Chỉ số sức khỏe mới nhất (từ overview = SensorReading snapshot) ── */}
                  <h4 style={{ margin: '0.5rem 0' }}>💓 Chỉ số sinh hiệu mới nhất</h4>
                  {!overview.latestReadingAt ? (
                    <div className="state-message">Chưa có dữ liệu cảm biến được đồng bộ.</div>
                  ) : (
                    <>
                      <div className="health-cards">
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestHeartRate ?? '—'}</div>
                          <div className="health-card__label">Nhịp tim (bpm)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestRestingHeartRate ?? '—'}</div>
                          <div className="health-card__label">Nhịp tim nghỉ (bpm)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestBloodOxygen != null ? `${overview.latestBloodOxygen}%` : '—'}</div>
                          <div className="health-card__label">SpO₂</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestHrv ?? '—'}</div>
                          <div className="health-card__label">HRV (ms)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestStepCount ?? '—'}</div>
                          <div className="health-card__label">Bước chân</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestDistanceMeters ?? '—'}</div>
                          <div className="health-card__label">Quãng đường (m)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestCaloriesBurned ?? '—'}</div>
                          <div className="health-card__label">Calo (kcal)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestExerciseMinutes ?? '—'}</div>
                          <div className="health-card__label">Vận động (phút)</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">
                            {overview.latestSleepDurationMinutes != null
                              ? `${Math.floor(overview.latestSleepDurationMinutes / 60)}h${overview.latestSleepDurationMinutes % 60}m`
                              : '—'}
                          </div>
                          <div className="health-card__label">Giấc ngủ</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestSleepQualityScore ?? '—'}</div>
                          <div className="health-card__label">Chất lượng ngủ</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestMoodScore ?? '—'}/5</div>
                          <div className="health-card__label">Tâm trạng</div>
                        </div>
                        <div className="health-card">
                          <div className="health-card__value">{overview.latestStressLevel ?? '—'}/5</div>
                          <div className="health-card__label">Căng thẳng</div>
                        </div>
                      </div>
                      <div className="elderly-item__sync" style={{ marginTop: '0.5rem' }}>
                        Cập nhật lúc: {fmt(overview.latestReadingAt)}
                        {overview.latestActivityLevel ? ` · Mức vận động: ${overview.latestActivityLevel}` : ''}
                        {overview.latestSourceName ? ` · Nguồn: ${overview.latestSourceName}` : ''}
                      </div>
                    </>
                  )}

                  {/* ── Dữ liệu cảm biến raw mới nhất (realtime block) ── */}
                  {sensor?.recordedAt && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem', opacity: 0.75 }}>
                      📡 Cảm biến realtime · Ghi nhận: {fmt(sensor.recordedAt)}
                      {sensor.sourceName ? ` · ${sensor.sourceName}` : ''}
                    </div>
                  )}

                  {overview.openAlerts?.length > 0 && (
                    <div className="open-alerts">
                      <h4>⚠️ Cảnh báo đang mở ({overview.openAlerts.length})</h4>
                      {overview.openAlerts.map((a) => (
                        <div key={a.id} className="alert-item">
                          <SeverityBadge severity={a.severity} />
                          <span className="alert-item__msg">{a.message}</span>
                          <span className="alert-item__time">{fmt(a.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Real-time SSE
// ═══════════════════════════════════════════════════════════════════════════════
function TabRealtime() {
  const [connected, setConnected] = useState(false);
  const [sseErr, setSseErr] = useState(null);
  const [sensorEvents, setSensorEvents] = useState([]);
  const [alertEvents, setAlertEvents] = useState([]);
  const esRef = useRef(null); // AbortController của kết nối hiện tại

  function handleEvent(name, raw) {
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    const item = { ...data, _ts: `${Date.now()}-${Math.random()}` };
    if (name === 'sensor-update') setSensorEvents((prev) => [item, ...prev].slice(0, 20));
    if (name === 'alert-created') setAlertEvents((prev) => [item, ...prev].slice(0, 20));
  }

  // EventSource gốc của trình duyệt KHÔNG gửi được header Authorization,
  // trong khi BE yêu cầu ROLE_ADMIN cho /api/admin/** → dùng fetch + ReadableStream để đọc SSE.
  async function connect() {
    if (esRef.current) return;
    const controller = new AbortController();
    esRef.current = controller;
    setSseErr(null);
    const clientId = crypto.randomUUID();
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sse/sensor-stream?clientId=${clientId}`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${getAccessToken()}` },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      setConnected(true);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value.replace(/\r\n/g, '\n');
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          let eventName = 'message';
          const dataLines = [];
          frame.split('\n').forEach((line) => {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
          });
          if (dataLines.length) handleEvent(eventName, dataLines.join('\n'));
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setSseErr(`Mất kết nối SSE (${e.message})`);
    } finally {
      if (esRef.current === controller) esRef.current = null;
      setConnected(false);
    }
  }

  function disconnect() {
    esRef.current?.abort();
    esRef.current = null;
    setConnected(false);
  }

  useEffect(() => () => { esRef.current?.abort(); }, []);

  return (
    <div className="tab-realtime">
      <div className="sse-controls">
        <div className={`sse-status ${connected ? 'sse-status--on' : 'sse-status--off'}`}>
          ● {connected ? 'Đang kết nối SSE' : 'Chưa kết nối'}
        </div>
        {!connected
          ? <button className="btn btn--primary" onClick={connect}>Kết nối SSE</button>
          : <button className="btn btn--danger" onClick={disconnect}>Ngắt kết nối</button>
        }
      </div>
      <ErrMsg msg={sseErr} />

      <div className="realtime-layout">
        <div className="realtime-col">
          <h3>📡 Sensor Updates ({sensorEvents.length})</h3>
          {sensorEvents.length === 0 && <div className="state-message">Chưa có dữ liệu sensor...</div>}
          {sensorEvents.map((e) => (
            <div key={e._ts} className="rt-event rt-event--sensor">
              <div className="rt-event__header">
                <span className="rt-event__id">{e.elderlyId?.slice(0, 8)}...</span>
                <span className="rt-event__time">{fmt(e.recordedAt)}</span>
              </div>
              <div className="rt-event__body">
                ❤️ {e.heartRate} bpm · 🩸 SpO₂ {e.bloodOxygen}% · 👣 {e.stepCount} bước
              </div>
            </div>
          ))}
        </div>

        <div className="realtime-col">
          <h3>🔔 Alert Events ({alertEvents.length})</h3>
          {alertEvents.length === 0 && <div className="state-message">Chưa có cảnh báo mới...</div>}
          {alertEvents.map((e) => (
            <div key={e._ts} className="rt-event rt-event--alert">
              <div className="rt-event__header">
                <SeverityBadge severity={e.severity} />
                <span className="rt-event__time">{fmt(e.createdAt)}</span>
              </div>
              <div className="rt-event__body">{e.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Báo cáo xu hướng
// ═══════════════════════════════════════════════════════════════════════════════
function TabTrends() {
  const [elderlyId, setElderlyId] = useState('');
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Load danh sách elderly để chọn
  const [elderlyList, setElderlyList] = useState([]);
  useEffect(() => {
    fetchElderly({ size: 100 }).then((d) => setElderlyList(d.content || [])).catch(() => { });
  }, []);

  function loadReport() {
    if (!elderlyId) return;
    setLoading(true); setErr(null);
    fetchTrendReport(elderlyId, period)
      .then(setReport)
      .catch((e) => setErr(getErrorMessage(e, 'Không tải được báo cáo')))
      .finally(() => setLoading(false));
  }

  const tickFormatter = (t) => {
    try { return new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); }
    catch { return t; }
  };

  const hasData = report?.dataPoints && report.dataPoints.length > 0;
  const showDots = (report?.dataPoints?.length ?? 0) <= 15;

  return (
    <div className="tab-trends">
      <div className="trends-controls">
        <select value={elderlyId} onChange={(e) => { setElderlyId(e.target.value); setReport(null); }}>
          <option value="">— Chọn Người cao tuổi —</option>
          {elderlyList.map((el) => (
            <option key={el.id} value={el.id}>
              {el.fullName}{el.caregiverName ? ` (${el.caregiverName})` : ''}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="week">7 ngày</option>
          <option value="month">30 ngày</option>
        </select>
        <button className="btn btn--primary" onClick={loadReport} disabled={!elderlyId || loading}>
          {loading ? 'Đang tải...' : 'Xem báo cáo'}
        </button>
      </div>

      <ErrMsg msg={err} />

      {loading && <Spinner />}

      {!loading && report && (
        <>
          <div className="trends-meta">
            Từ <strong>{fmtDate(report.from)}</strong> đến <strong>{fmtDate(report.to)}</strong>
            {' '}— {report.dataPoints?.length ?? 0} mốc dữ liệu
          </div>

          {!hasData ? (
            <div className="state-message">Chưa có dữ liệu cảm biến được đồng bộ trong khoảng thời gian này.</div>
          ) : (
            <>
              <div className="chart-card">
                <h4>❤️ Nhịp tim (bpm)</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="recordedAt" tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={(v) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="Nhịp tim trung bình" dot={showDots} strokeWidth={2} />
                    <Line type="monotone" dataKey="restingHeartRate" stroke="#f97316" name="Nhịp tim nghỉ" dot={showDots} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h4>🫁 Nồng độ oxy trong máu (SpO₂ %)</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="recordedAt" tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[85, 100]} />
                    <Tooltip labelFormatter={(v) => fmt(v)} />
                    <Line type="monotone" dataKey="bloodOxygen" stroke="#06b6d4" name="SpO₂ (%)" dot={showDots} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h4>👣 Vận động & Bước chân</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="recordedAt" tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="stepCount" stroke="#3b82f6" name="Bước chân" dot={showDots} strokeWidth={2} />
                    <Line type="monotone" dataKey="exerciseMinutes" stroke="#10b981" name="Phút vận động" dot={showDots} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h4>😴 Giấc ngủ (phút)</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="recordedAt" tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="sleepDurationMinutes" stroke="#8b5cf6" name="Phút ngủ" dot={showDots} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 7 — Danh sách cảnh báo
// ═══════════════════════════════════════════════════════════════════════════════
function TabAlerts() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    fetchAlerts({ status: filterStatus || undefined, severity: filterSeverity || undefined, page, size: 20 })
      .then(setData)
      .catch((e) => setErr(getErrorMessage(e, 'Không tải được danh sách cảnh báo')))
      .finally(() => setLoading(false));
  }, [filterStatus, filterSeverity, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="tab-alerts">
      <div className="filters">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ALERT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(0); }}>
          <option value="">Tất cả mức độ</option>
          {Object.entries(SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-refresh" onClick={load}>🔄</button>
      </div>

      {loading ? <Spinner /> : err ? <ErrMsg msg={err} /> : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người lớn tuổi</th><th>Loại</th><th>Mức độ</th><th>Giá trị</th>
                  <th>Nội dung</th><th>Trạng thái</th><th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data?.content?.length ? data.content.map((a) => (
                  <tr key={a.id}>
                    <td>{a.elderlyName}</td>
                    <td><code className="alert-type">{a.alertType}</code></td>
                    <td><SeverityBadge severity={a.severity} /></td>
                    <td>{a.metricValue}</td>
                    <td className="alert-msg">{a.message}</td>
                    <td><AlertStatusBadge status={a.status} /></td>
                    <td>{fmt(a.createdAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="table-empty">Không có cảnh báo nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — Quản lý Bác sĩ 
// ═══════════════════════════════════════════════════════════════════════════════
function TabDoctors() {
  const EMPTY_FORM = { email: '', password: '', fullName: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [created, setCreated] = useState(null); // bản ghi bác sĩ vừa tạo
  const [showPw, setShowPw] = useState(false);

  // Danh sách bác sĩ hiện có (filter role=DOCTOR từ /api/admin/users)
  const [doctors, setDoctors] = useState([]);
  const [docLoading, setDocLoading] = useState(true);
  const [docErr, setDocErr] = useState(null);
  const [docPage, setDocPage] = useState(0);
  const [docData, setDocData] = useState(null);

  const loadDoctors = useCallback(() => {
    setDocLoading(true); setDocErr(null);
    fetchUsers({ role: 'DOCTOR', page: docPage, size: PAGE_SIZE })
      .then((d) => { setDocData(d); setDoctors(d.content || []); })
      .catch((e) => setDocErr(e.response?.data?.message || 'Không tải được danh sách bác sĩ'))
      .finally(() => setDocLoading(false));
  }, [docPage]);

  useEffect(() => { loadDoctors(); }, [loadDoctors]);


  function handleChange(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErr(null);
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 6) {
      setErr('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    setSubmitting(true); setErr(null); setCreated(null);
    try {
      const result = await createDoctor(form);
      setCreated({ ...result, _plainPw: form.password }); // lưu pw để hiển thị một lần
      setForm(EMPTY_FORM);
      loadDoctors();
    } catch (ex) {
      setErr(getErrorMessage(ex, 'Tạo tài khoản thất bại. Kiểm tra email đã tồn tại chưa.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tab-users">
      <div className="thresholds-layout">
        {/* ── Form tạo tài khoản Bác sĩ ── */}
        <div className="threshold-form-card">
          <h3>➕ Tạo tài khoản Bác sĩ</h3>

          {created && (
            <div className="profile-banner profile-banner--success" style={{ marginBottom: '1rem' }}>
              <div>✅ Tạo thành công!</div>
              <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px' }}>
                <div>📧 Email: <strong>{created.email}</strong></div>
                <div>🔑 Mật khẩu: <strong>{created._plainPw}</strong></div>
                <div>👤 Họ tên: <strong>{created.fullName}</strong></div>
              </div>
              <button
                className="btn btn--outline"
                style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                onClick={() => setCreated(null)}
              >
                Đóng thông báo
              </button>
            </div>
          )}

          {err && <ErrMsg msg={err} />}

          <form onSubmit={handleSubmit} className="threshold-form">
            <label htmlFor="doc-fullname">Họ và tên</label>
            <input
              id="doc-fullname"
              type="text"
              required
              placeholder="VD: BS. Nguyễn Văn An"
              value={form.fullName}
              onChange={handleChange('fullName')}
              disabled={submitting}
            />

            <label htmlFor="doc-email">Email</label>
            <input
              id="doc-email"
              type="email"
              required
              placeholder="VD: bacsi.nguyen@gmail.com"
              value={form.email}
              onChange={handleChange('email')}
              disabled={submitting}
            />

            <label htmlFor="doc-password">Mật khẩu</label>
            <div className="profile-input-wrapper">
              <input
                id="doc-password"
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="VD: Doctor@2026"
                value={form.password}
                onChange={handleChange('password')}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="profile-eye-btn"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang tạo...' : '✔ Tạo tài khoản Bác sĩ'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Danh sách Bác sĩ hiện có ── */}
        <div className="threshold-list">
          <div className="threshold-list__header">
            <h3>📋 Danh sách Bác sĩ ({docData?.totalElements ?? '—'})</h3>
            <button className="btn-refresh" onClick={loadDoctors}>🔄 Làm mới</button>
          </div>
          {docLoading ? <Spinner /> : docErr ? <ErrMsg msg={docErr} /> : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Đăng nhập gần nhất</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.length ? doctors.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className="user-name">{d.fullName}</div>
                      </td>
                      <td>
                        <div className="user-email">{d.email}</div>
                      </td>
                      <td><StatusBadge status={d.status} /></td>
                      <td>{fmt(d.lastLoginAt)}</td>
                      <td>{fmtDate(d.createdAt)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="table-empty">Chưa có Bác sĩ nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={docPage} totalPages={docData?.totalPages ?? 0} onChange={setDocPage} />
        </div>
      </div>

      {/* ── Phân công Bác sĩ phụ trách hồ sơ người cao tuổi ── */}
      <DoctorAssignmentCard refreshKey={docData} />
    </div>
  );
}

// ─── Phân công Bác sĩ (POST & GET /api/admin/doctor-assignments) ─────────────
function DoctorAssignmentCard({ refreshKey }) {
  const [elderlyList, setElderlyList] = useState([]);
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [form, setForm] = useState({ elderlyId: '', doctorId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [assignErr, setAssignErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Danh sách phân công từ Database
  const [assignData, setAssignData] = useState(null);
  const [assignPage, setAssignPage] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // 1. Tải danh sách người cao tuổi
  useEffect(() => {
    fetchElderly({ page: 0, size: 200, sort: 'fullName,asc' })
      .then((d) => setElderlyList(d.content || []))
      .catch((e) => setAssignErr(getErrorMessage(e, 'Không tải được danh sách hồ sơ người cao tuổi')));
  }, []);

  // 2. Tải danh sách bác sĩ ACTIVE
  useEffect(() => {
    fetchUsers({ role: 'DOCTOR', status: 'ACTIVE', page: 0, size: 200, sort: 'fullName,asc' })
      .then((d) => setActiveDoctors(d.content || []))
      .catch((e) => setAssignErr(getErrorMessage(e, 'Không tải được danh sách bác sĩ')));
  }, [refreshKey]);

  // 3. Tải danh sách phân công từ DB
  const loadAssignments = useCallback((page = 0) => {
    setLoadingList(true);
    setListErr(null);
    fetchDoctorAssignments({ page, size: 10, sort: 'createdAt,desc' })
      .then((data) => setAssignData(data))
      .catch((e) => setListErr(getErrorMessage(e, 'Không tải được danh sách phân công')))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    loadAssignments(assignPage);
  }, [loadAssignments, assignPage, refreshKey]);

  // Xử lý thực hiện phân công
  async function handleAssign(e) {
    e.preventDefault();
    if (!form.elderlyId || !form.doctorId) {
      setAssignErr('Vui lòng chọn đầy đủ hồ sơ người cao tuổi và bác sĩ.');
      return;
    }
    setSubmitting(true);
    setAssignErr(null);
    setSuccessMsg(null);
    try {
      const res = await assignDoctor(form);
      setSuccessMsg(`Phân công thành công: Bác sĩ ${res.doctorName} phụ trách ${res.elderlyName}`);
      setForm({ elderlyId: '', doctorId: '' });
      // Tải lại trang đầu tiên của danh sách
      if (assignPage === 0) {
        loadAssignments(0);
      } else {
        setAssignPage(0);
      }
    } catch (ex) {
      setAssignErr(getErrorMessage(ex, 'Phân công thất bại'));
    } finally {
      setSubmitting(false);
    }
  }

  // Xử lý hủy phân công
  async function handleUnassign(id, elderlyName, doctorName) {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy phân công Bác sĩ ${doctorName} cho hồ sơ ${elderlyName}?`)) {
      return;
    }
    setDeletingId(id);
    setAssignErr(null);
    setSuccessMsg(null);
    try {
      await deleteDoctorAssignment(id);
      setSuccessMsg(`Đã hủy phân công Bác sĩ ${doctorName} phụ trách ${elderlyName}`);
      loadAssignments(assignPage);
    } catch (ex) {
      setListErr(getErrorMessage(ex, 'Hủy phân công thất bại'));
    } finally {
      setDeletingId(null);
    }
  }

  const assignments = assignData?.content || [];

  return (
    <div className="thresholds-layout" style={{ marginTop: '1.5rem' }}>
      {/* ── Form phân công ── */}
      <div className="threshold-form-card">
        <h3>🩺 Phân công Bác sĩ phụ trách</h3>
        <SuccessMsg msg={successMsg} />
        <ErrMsg msg={assignErr} />
        <form onSubmit={handleAssign} className="threshold-form">
          <label htmlFor="assign-elderly">Hồ sơ người cao tuổi</label>
          <select
            id="assign-elderly"
            required
            value={form.elderlyId}
            onChange={(e) => {
              setForm((f) => ({ ...f, elderlyId: e.target.value }));
              setAssignErr(null);
              setSuccessMsg(null);
            }}
            disabled={submitting}
          >
            <option value="">— Chọn người cao tuổi —</option>
            {elderlyList.map((el) => (
              <option key={el.id} value={el.id}>
                {el.fullName}{el.caregiverName ? ` (NCS: ${el.caregiverName})` : ''}
              </option>
            ))}
          </select>

          <label htmlFor="assign-doctor">Bác sĩ</label>
          <select
            id="assign-doctor"
            required
            value={form.doctorId}
            onChange={(e) => {
              setForm((f) => ({ ...f, doctorId: e.target.value }));
              setAssignErr(null);
              setSuccessMsg(null);
            }}
            disabled={submitting}
          >
            <option value="">— Chọn bác sĩ —</option>
            {activeDoctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName} — {d.email}</option>
            ))}
          </select>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Đang phân công...' : '✔ Phân công'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Danh sách phân công từ Database ── */}
      <div className="threshold-list">
        <div className="threshold-list__header">
          <h3>📋 Danh sách Phân công Bác sĩ ({assignData?.totalElements ?? '—'})</h3>
          <button className="btn-refresh" onClick={() => loadAssignments(assignPage)}>🔄 Làm mới</button>
        </div>

        {loadingList ? (
          <Spinner />
        ) : listErr ? (
          <ErrMsg msg={listErr} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người cao tuổi</th>
                  <th>Bác sĩ phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Thời gian phân công</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length ? assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="user-name">{a.elderlyName}</div>
                    </td>
                    <td>
                      <div className="user-name">{a.doctorName}</div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>{fmt(a.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        disabled={deletingId === a.id}
                        onClick={() => handleUnassign(a.id, a.elderlyName, a.doctorName)}
                      >
                        {deletingId === a.id ? 'Đang hủy...' : 'Hủy phân công'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      Chưa có phân công bác sĩ nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={assignPage}
          totalPages={assignData?.totalPages ?? 0}
          onChange={setAssignPage}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT: AdminDashboard
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 9 — Hồ sơ tài khoản
// ═══════════════════════════════════════════════════════════════════════════════
function TabProfile() {
  const { user, changePassword, logout } = useAuth();


  const ROLE_LABELS_LOCAL = { ADMIN: 'Quản trị viên', DOCTOR: 'Bác sĩ', CAREGIVER: 'Người chăm sóc' };

  // ── Đổi mật khẩu ──
  const EMPTY_PW = { oldPassword: '', newPassword: '', confirmPassword: '' };
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  // toggle ẩn/hiện riêng cho mỗi ô
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handlePwChange(field) {
    return (e) => {
      setPwForm((f) => ({ ...f, [field]: e.target.value }));
      setPwError(null);
      setPwSuccess(false);
    };
  }

  async function handlePwSubmit(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Mật khẩu mới nhập lại không khớp.');
      return;
    }
    setPwError(null);
    setPwSubmitting(true);
    try {
      await changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      setPwSuccess(true);
      setPwForm(EMPTY_PW);
      // AuthContext đã clearTokens + setUser(null) → sẽ tự redirect về /login qua PrivateRoute
    } catch (err) {
      setPwError(err.response?.data?.message || 'Đổi mật khẩu thất bại, kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setPwSubmitting(false);
    }
  }

  function openPwForm() {
    setShowPwForm(true);
    setPwError(null);
    setPwSuccess(false);
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function closePwForm() {
    setShowPwForm(false);
    setPwForm(EMPTY_PW);
    setPwError(null);
    setPwSuccess(false);
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleLogout() {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) logout();
  }

  return (
    <div className="tab-profile">
      {/* ── Thông tin tài khoản ── */}
      <div className="profile-card">
        <div className="profile-card__avatar">
          {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="profile-card__info">
          <div className="profile-info__name">{user?.fullName}</div>
          <div className="profile-info__role">
            <span className={`badge badge--role-${user?.role?.toLowerCase()}`}>
              {ROLE_LABELS_LOCAL[user?.role] || user?.role}
            </span>
          </div>
          <div className="profile-info__email">
            <span className="profile-info__label">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="profile-info__id">
            <span className="profile-info__label">ID tài khoản</span>
            <span className="profile-info__mono">{user?.id || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Đổi mật khẩu ── */}
      <div className="profile-section">
        <div className="profile-section__header">
          <h3 className="profile-section__title">🔑 Đổi mật khẩu</h3>
          {!showPwForm && (
            <button className="btn btn--outline" onClick={openPwForm}>
              Đổi mật khẩu
            </button>
          )}
        </div>

        {showPwForm && (
          <form className="profile-pw-form" onSubmit={handlePwSubmit}>
            {pwSuccess && (
              <div className="profile-banner profile-banner--success">
                ✅ Đổi mật khẩu thành công! Đang đăng xuất...
              </div>
            )}
            {pwError && (
              <div className="profile-banner profile-banner--error">⚠️ {pwError}</div>
            )}

            {/* Mật khẩu hiện tại */}
            <div className="profile-field">
              <label htmlFor="oldPassword">Mật khẩu hiện tại</label>
              <div className="profile-input-wrapper">
                <input
                  id="oldPassword"
                  type={showOld ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={pwForm.oldPassword}
                  onChange={handlePwChange('oldPassword')}
                  disabled={pwSubmitting || pwSuccess}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowOld((v) => !v)}
                  tabIndex={-1}
                  aria-label={showOld ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showOld ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div className="profile-field">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <div className="profile-input-wrapper">
                <input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự, 1 chữ hoa, 1 số, 1 ký tự đặc biệt"
                  value={pwForm.newPassword}
                  onChange={handlePwChange('newPassword')}
                  disabled={pwSubmitting || pwSuccess}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                  aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNew ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Nhập lại mật khẩu mới */}
            <div className="profile-field">
              <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
              <div className="profile-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={pwForm.confirmPassword}
                  onChange={handlePwChange('confirmPassword')}
                  disabled={pwSubmitting || pwSuccess}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirm ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="profile-form-actions">
              <button type="submit" className="btn btn--primary" disabled={pwSubmitting || pwSuccess}>
                {pwSubmitting ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={closePwForm}
                disabled={pwSubmitting}
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Đăng xuất ── */}
      <div className="profile-section">
        <div className="profile-section__header">
          <h3 className="profile-section__title">🚪 Đăng xuất</h3>
        </div>
        <button className="btn btn--danger" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT: AdminDashboard

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user, logout, initializing } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (initializing) return <div className="route-guard-loading">Đang kiểm tra đăng nhập...</div>;

  const TAB_COMPONENTS = {
    overview: <TabOverview />,
    users: <TabUsers />,
    doctors: <TabDoctors />,
    elderly: <TabElderly />,
    // realtime: <TabRealtime />,
    trends: <TabTrends />,
    alerts: <TabAlerts />,
    profile: <TabProfile />,
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__mark" />
          <div className="sidebar-brand__name">Admin</div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`sidebar-nav__item ${activeTab === t.id ? 'sidebar-nav__item--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-main__header">
          <h2 className="admin-main__title">{TABS.find((t) => t.id === activeTab)?.label}</h2>
        </div>
        <div className="admin-main__body">
          {TAB_COMPONENTS[activeTab]}
        </div>
      </main>
    </div>
  );
}
