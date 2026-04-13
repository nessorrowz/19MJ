import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]   = useState(false);

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

    if (!form.username || !form.email || !form.password || !form.confirm) {
      triggerShake();
      setError('Semua field wajib diisi.');
      return;
    }
    if (form.password !== form.confirm) {
      triggerShake();
      setError('Password tidak sama.');
      return;
    }
    if (form.password.length < 6) {
      triggerShake();
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        username:  form.username,
        email:     form.email,
        password:  form.password,
        full_name: form.full_name || undefined,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      triggerShake();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── LEFT PANEL ── */}
      <div className="auth-left">
        <form className={`auth-card ${shake ? 'shake' : ''}`} onSubmit={handleSubmit} noValidate>
          <div className="card-header">
            <h2>Create Account</h2>
            <p>Daftarkan dirimu dan mulai perjalananmu.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="johndoe123"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="contoh@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="full_name">Nama Lengkap <span className="optional">(opsional)</span></label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="John Doe"
              value={form.full_name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>

          <div className="divider">Or With</div>

          <button type="button" className="btn btn-google">
            <svg className="google-icon" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign up with Google
          </button>

          <div className="bottom-link">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </form>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right">
        <div className="right-circle" />
        <div className="right-circle2" />
        <img src="/gambar/19mj.png" className="logo" alt="19MJ Logo" />
        <svg className="wave-svg" viewBox="0 0 80 800" preserveAspectRatio="none">
          <path d="M80,0 C30,200 30,600 80,800 L80,800 L80,0 Z" fill="#0f7c82"/>
        </svg>
        <img src="/gambar/ceweray.png" className="hero-img" alt="Illustration" />
      </div>
    </div>
  );
}
