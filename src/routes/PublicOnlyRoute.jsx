import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Chặn người dùng đã đăng nhập khỏi các trang Public-only (Login, Register).
 * Nếu đã đăng nhập: ADMIN → /admin, còn lại → /
 * Nếu chưa đăng nhập: cho qua bình thường (render Outlet).
 * Dùng: <Route element={<PublicOnlyRoute />}>...</Route>
 */
export default function PublicOnlyRoute() {
  const { user, initializing } = useAuth();

  // Chờ AuthContext kiểm tra phiên (silent refresh) xong mới quyết định
  if (initializing) {
    return <div className="route-guard-loading">Đang kiểm tra đăng nhập...</div>;
  }

  if (user) {
    // Đã đăng nhập → redirect về đúng trang chủ theo role
    const destination = user.role === 'ADMIN' ? '/admin' : '/';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

