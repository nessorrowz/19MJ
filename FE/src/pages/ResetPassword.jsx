import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import { clearResetFlow, getLoginRouteByRole, getResetFlow, getRoleFromSearch } from '../utils/passwordReset';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getRoleFromSearch(location.search);
  const [flow, setFlow] = useState(getResetFlow());
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const savedFlow = getResetFlow();
    if (!savedFlow.resetToken || !savedFlow.email) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    setFlow(savedFlow);
  }, [navigate]);

  const email = flow.email || location.state?.email || '';
  const activeRole = flow.role || role || location.state?.role || 'candidate';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.newPassword || !form.confirmPassword) {
      triggerShake();
      setError('Password baru dan konfirmasi wajib diisi.');
      return;
    }

    if (form.newPassword.length < 6) {
      triggerShake();
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      triggerShake();
      setError('Password baru dan konfirmasi tidak sama.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password/reset', {
        resetToken: flow.resetToken,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      // Setelah reset sukses, konteks sementara dibersihkan supaya token tidak dipakai ulang.
      clearResetFlow();
      navigate(getLoginRouteByRole(activeRole), {
        replace: true,
        state: { resetSuccess: true },
      });
    } catch (err) {
      triggerShake();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <form className={`auth-card ${shake ? 'shake' : ''}`} onSubmit={handleSubmit} noValidate>
          <div className="card-header">
            <h2>Reset Password</h2>
            <p>Buat password baru untuk akun {email || 'yang sedang diproses'}.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="newPassword">Password Baru</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Konfirmasi Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Ulangi password baru"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Reset Password'}
          </button>

          <div className="bottom-link" style={{ marginTop: 16 }}>
            <Link to={getLoginRouteByRole(activeRole)}>Kembali ke login</Link>
          </div>
        </form>
      </div>

      <RightPanel />
    </div>
  );
}
