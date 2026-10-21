import axios from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens, setUser as setStoreUser } from '../utils/tokenStore';

// Để trống (mặc định) => gọi cùng origin, Vite proxy chuyển /api sang BE (xem vite.config.js).
// Khi deploy FE tách biệt với BE, đặt VITE_API_BASE_URL=http://<host>:8080
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Lấy thông báo lỗi từ ErrorResponse của BE: { status, error, message, fieldErrors }.
 * Với lỗi validation (400), BE chỉ trả message chung "Dữ liệu không hợp lệ" → ghép thêm fieldErrors.
 */
export function getErrorMessage(error, fallback = 'Đã có lỗi xảy ra') {
  if (!error?.response) {
    return 'Không kết nối được tới máy chủ. Kiểm tra Backend (cổng 8080) đã chạy chưa.';
  }
  const data = error.response.data;
  if (data && typeof data === 'object') {
    const fieldErrors = data.fieldErrors ? Object.values(data.fieldErrors).filter(Boolean) : [];
    if (fieldErrors.length) return `${data.message || fallback}: ${fieldErrors.join('; ')}`;
    if (data.message) return data.message;
  }
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này';
  return fallback;
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Tự refresh access token 1 lần khi gặp 401, tránh bắt người dùng đăng nhập lại vì hết hạn 15 phút.
// Không áp dụng cho các auth endpoint (/api/auth/*) để tránh redirect khi nhập sai mật khẩu.
let isRefreshing = false;
let pendingQueue = [];

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Bỏ qua các auth endpoint — lỗi 401 ở đây là hợp lệ (sai mật khẩu, token hết hạn khi refresh),
    // cần trả thẳng về component để hiện thông báo lỗi cho người dùng.
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => originalRequest.url?.includes(path));
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return httpClient(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('Không có refresh token');

        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        if (data.user) setStoreUser(data.user);

        pendingQueue.forEach((p) => p.resolve(data.accessToken));
        pendingQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach((p) => p.reject(refreshError));
        pendingQueue = [];
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
