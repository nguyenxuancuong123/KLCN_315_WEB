import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Chặn mọi route con nếu chưa đăng nhập. Dùng: <Route element={<PrivateRoute />}>...</Route> */
export default function PrivateRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <div className="route-guard-loading">Đang kiểm tra đăng nhập...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
