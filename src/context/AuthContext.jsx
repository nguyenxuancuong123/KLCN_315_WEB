import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/authApi';
import { 
  getAccessToken, 
  setAccessToken, 
  getRefreshToken, 
  setRefreshToken, 
  getUser as getStoreUser,
  setUser as setStoreUser,
  clearTokens 
} from '../utils/tokenStore';

const AuthContext = createContext(null);

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    const exp = decoded.exp;
    // Hết hạn hoặc sắp hết hạn trong 10 giây tới
    return (Date.now() / 1000) > (exp - 10);
  } catch (e) {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, email, fullName, role }
  const [initializing, setInitializing] = useState(true);

  const applyAuthResponse = useCallback((data) => {
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    if (data.user) {
      setStoreUser(data.user);
      setUser(data.user);
    } else {
      // If refresh API doesn't return user, keep the existing one
      setUser(getStoreUser());
    }
  }, []);

  useEffect(() => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    const storedUser = getStoreUser();

    // Nếu accessToken còn hợp lệ và có thông tin user, cho vào thẳng Home
    if (accessToken && storedUser && !isTokenExpired(accessToken)) {
      setUser(storedUser);
      setInitializing(false);
      return;
    }

    // Nếu accessToken hết hạn nhưng còn refreshToken thì gọi API refresh
    if (refreshToken) {
      authApi
        .refresh(refreshToken)
        .then(applyAuthResponse)
        .catch(() => clearTokens())
        .finally(() => setInitializing(false));
    } else {
      // Không có token nào
      setInitializing(false);
    }
  }, [applyAuthResponse]);

  async function login(credentials) {
    const data = await authApi.login(credentials);
    applyAuthResponse(data);
    return data;
  }

  async function changePassword(payload) {
    await authApi.changePassword(payload);
    // Backend đã thu hồi toàn bộ refresh token của user -> buộc đăng nhập lại
    clearTokens();
    setUser(null);
  }

  async function logout() {
    const existingRefreshToken = getRefreshToken();
    try {
      if (existingRefreshToken) await authApi.logout(existingRefreshToken);
    } catch {
      // đăng xuất phía client vẫn tiếp tục dù request logout thất bại
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, initializing, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() phải được gọi bên trong <AuthProvider>');
  return ctx;
}
