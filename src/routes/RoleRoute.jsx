import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Chặn route con theo role, dùng LỒNG BÊN TRONG PrivateRoute (đặt sau PrivateRoute trong cây route)
 * vì component này không tự kiểm tra "đã đăng nhập chưa", chỉ kiểm tra "đủ quyền chưa".
 * Dùng: <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>...</Route>
 */
export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
