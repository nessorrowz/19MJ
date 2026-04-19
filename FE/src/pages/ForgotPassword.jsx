import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import { getLoginRouteByRole, saveResetFlow, setResetResendCooldown } from '../utils/passwordReset';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'company' ? 'company' : 'candidate';
  const [form, setForm] = useState({ email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

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
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedEmail) {
      triggerShake();
      setError('Email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      triggerShake();
      setError('Format email tidak valid.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password/request', { email: normalizedEmail });
      // Email dan cooldown disimpan supaya step verifikasi tetap punya konteks yang sama.
      setResetResendCooldown();
      saveResetFlow({ email: normalizedEmail, role, resetToken: '' });
      navigate('/verify-reset-pin', { state: { email: normalizedEmail, role } });
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
            <h2>Lupa Password</h2>
            <p>Masukkan email akunmu untuk menerima PIN reset password.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@gmail.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim PIN Reset'}
          </button>

          <div className="bottom-link" style={{ marginTop: 16 }}>
            Kembali ke <Link to={getLoginRouteByRole(role)}>login</Link>
          </div>
        </form>
      </div>

      <RightPanel />
    </div>
  );
}
