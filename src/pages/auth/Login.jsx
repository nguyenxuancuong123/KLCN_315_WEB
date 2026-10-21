import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await login(form);
      const redirectTo = location.state?.from?.pathname || (data.user.role === 'ADMIN' ? '/admin' : '/');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại, kiểm tra lại email và mật khẩu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__intro">
        <h1>Đồng hành theo dõi sức khỏe tinh thần người cao tuổi, ngay tại nhà.</h1>
        <p>Đăng nhập để xem tình trạng sức khỏe, nhận cảnh báo sớm và kết nối với người thân, bác sĩ phụ trách.</p>
        <div className="auth-screen__pills">
          <span className="auth-screen__pill">📊 Theo dõi 24/7</span>
          <span className="auth-screen__pill">🔔 Cảnh báo tức thì</span>
          <span className="auth-screen__pill">👨‍⚕️ Kết nối bác sĩ</span>
        </div>
      </div>

      <div className="auth-screen__form-panel">
        <div className="auth-card">
          <div className="auth-card__title">Đăng nhập</div>
          <div className="auth-card__subtitle">Nhập thông tin tài khoản để tiếp tục</div>

          {error && <div className="auth-banner auth-banner--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Nhập email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange('email')}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange('password')}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    /* Eye-off (nhắm mắt) */
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Eye (mở mắt) */
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
