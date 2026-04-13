import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

export default function Login() {
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
      setError('Format email tidak valid. Contoh: nama@gmail.com');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post('/auth/login', form);
      // Pastikan yang login adalah kandidat
      if (data.user.role !== 'candidate') {
        triggerShake();
        setError('Akun ini bukan akun kandidat. Gunakan halaman login perusahaan.');
        return;
      }
      localStorage.setItem('token',       data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('isLogin',     'true');
      navigate('/dashboard');
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
            <h2>Log In</h2>
            <p>Selamat datang kembali! Masukkan akunmu.</p>
          </div>

          {success && <div className="success-banner">{success}</div>}
          {error   && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              placeholder="nama@gmail.com"
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
            <label className="remember">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot">Forgot Password?</a>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Log in'}
          </button>

          <div className="divider">Or With</div>

          <button
            type="button"
            className="btn btn-google"
            onClick={() => window.location.href = 'http://localhost:3000/api/auth/google'}
          >
            <GoogleIcon />
            Log in with Google
          </button>

          <div className="bottom-link">
            Belum punya akun? <Link to="/register">Daftar di sini</Link>
          </div>
        </form>
      </div>

      <RightPanel />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function RightPanel() {
  return (
    <div className="auth-right">
      <div className="right-circle" />
      <div className="right-circle2" />
      <img src="/gambar/19mj.png" className="logo" alt="19MJ Logo" />
      <svg className="wave-svg" viewBox="0 0 80 800" preserveAspectRatio="none">
        <path d="M80,0 C30,200 30,600 80,800 L80,800 L80,0 Z" fill="#0f7c82"/>
      </svg>
      <img src="/gambar/ceweray.png" className="hero-img" alt="Illustration" />
    </div>
  );
}
