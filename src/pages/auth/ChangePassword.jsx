import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const PASSWORD_HINT = 'Tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.newPassword !== form.confirmNewPassword) {
      setError('Mật khẩu mới nhập lại không khớp');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setSuccess(true);
      // Backend đã thu hồi mọi refresh token -> phiên hiện tại cũng phải đăng nhập lại
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      const data = err.response?.data;
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
      setError(data?.message || 'Đổi mật khẩu thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__intro">
        <div className="auth-screen__eyebrow-mark" />
        <h1>Đổi mật khẩu định kỳ giúp tài khoản an toàn hơn.</h1>
        <p>Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại trên mọi thiết bị.</p>
        <div className="auth-screen__pills">
          <span className="auth-screen__pill">🔐 Bảo mật tài khoản</span>
          <span className="auth-screen__pill">🛡️ Mã hóa đầu cuối</span>
        </div>
      </div>

      <div className="auth-screen__form-panel">
        <div className="auth-card">
          <div className="auth-card__brand">
            <div className="auth-card__brand-dot" />
            <span className="auth-card__brand-name">KLCN Health</span>
          </div>
          <div className="auth-card__title">Đổi mật khẩu</div>
          <div className="auth-card__subtitle">Nhập mật khẩu hiện tại và mật khẩu mới</div>

          {success && <div className="auth-banner auth-banner--success">Đổi mật khẩu thành công, đang chuyển sang trang đăng nhập...</div>}
          {error && !success && <div className="auth-banner auth-banner--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="oldPassword">Mật khẩu hiện tại</label>
              <input
                id="oldPassword"
                type="password"
                required
                autoComplete="current-password"
                value={form.oldPassword}
                onChange={handleChange('oldPassword')}
              />
              {fieldErrors.oldPassword && <div className="auth-field__error">{fieldErrors.oldPassword}</div>}
            </div>

            <div className="auth-field">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={form.newPassword}
                onChange={handleChange('newPassword')}
              />
              {fieldErrors.newPassword ? (
                <div className="auth-field__error">{fieldErrors.newPassword}</div>
              ) : (
                <div className="auth-field__hint">{PASSWORD_HINT}</div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="confirmNewPassword">Nhập lại mật khẩu mới</label>
              <input
                id="confirmNewPassword"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmNewPassword}
                onChange={handleChange('confirmNewPassword')}
              />
            </div>

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
