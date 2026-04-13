import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import './Auth.css';

// US-001: Register Candidate
export default function RegisterCandidate() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
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
    if (!form.username || !form.email || !form.password || !form.confirm) {
      triggerShake(); setError('Semua field wajib diisi.'); return;
    }
    if (form.password !== form.confirm) {
      triggerShake(); setError('Password tidak sama.'); return;
    }
    if (form.password.length < 6) {
      triggerShake(); setError('Password minimal 6 karakter.'); return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register/candidate', {
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
      <div className="auth-left">
        <form className={`auth-card ${shake ? 'shake' : ''}`} onSubmit={handleSubmit} noValidate>
          <div className="card-header">
            <h2>Daftar sebagai<br/>Kandidat</h2>
            <p>Temukan karir impianmu bersama 19MJ.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text"
              placeholder="johndoe123" value={form.username} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email"
              placeholder="contoh@email.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="full_name">Nama Lengkap <span className="optional">(opsional)</span></label>
            <input id="full_name" name="full_name" type="text"
              placeholder="John Doe" value={form.full_name} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
              placeholder="••••••••" value={form.password} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" name="confirm" type="password"
              placeholder="••••••••" value={form.confirm} onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Buat Akun Kandidat'}
          </button>

          <div className="bottom-link" style={{ marginTop: 16 }}>
            Perusahaan? <Link to="/register/company">Daftar sebagai Perusahaan</Link>
          </div>
          <div className="bottom-link">
            Sudah punya akun? <Link to="/login">Log in</Link>
          </div>
        </form>
      </div>
      <RightPanel />
    </div>
  );
}
