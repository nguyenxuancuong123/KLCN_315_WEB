import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';

import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';
import AdminDashboard from './pages/admin/AdminDashboard';

function RootRedirect() {
  const { user, logout } = useAuth();
  
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Trang chủ</h1>
      <p>Chào mừng {user?.fullName}. Giao diện dành cho {user?.role} đang được phát triển.</p>
      <button onClick={logout} style={{ padding: '8px 16px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>
        Đăng xuất
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public-only: đã đăng nhập sẽ bị redirect về trang chủ đúng role */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Cần đăng nhập */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Cần đăng nhập + đúng role ADMIN */}
            <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
