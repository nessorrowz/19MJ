import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import './Auth.css';

// US-004: Login Company
export default function LoginCompany() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(location.state?.registered ? 'Registrasi berhasil! Silakan login.' : '');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]     = useState(false);

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
    if (!form.email || !form.password) {
      triggerShake();
      setError('Email dan password wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      triggerShake();
      setError('Format email tidak valid. Contoh: hr@perusahaan.com');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', form);

      // Pastikan yang login memang company
      if (data.user.role !== 'company') {
        triggerShake();
        setError('Akun ini bukan akun perusahaan. Gunakan halaman login kandidat.');
        return;
      }

      localStorage.setItem('token',       data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('isLogin',     'true');
      navigate('/company/dashboard');
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
            <h2>Login Perusahaan</h2>
            <p>Masuk dan temukan talenta terbaik untuk timmu.</p>
          </div>

          <div className="role-switch">
            <button type="button" onClick={() => navigate('/login')}>👨‍💼 Kandidat</button>
            <button type="button" className="active">🏢 Perusahaan</button>
          </div>

          {success && <div className="success-banner">{success}</div>}
          {error   && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email Perusahaan</label>
            <input
              id="email" name="email" type="email"
              placeholder="hr@perusahaan.com"
              value={form.email} onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              placeholder="••••••••"
              value={form.password} onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <div className="meta-row">
            <span />
            <a href="#" className="forgot">Forgot Password?</a>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Masuk sebagai Perusahaan'}
          </button>

          <div className="bottom-link" style={{ marginTop: 20 }}>
            Belum punya akun perusahaan? <Link to="/company/register">Daftar di sini</Link>
          </div>
        </form>
      </div>
      <RightPanel />
    </div>
  );
}
