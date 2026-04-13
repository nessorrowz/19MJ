import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import './Auth.css';

// US-003: Register Company
export default function RegisterCompany() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ company_name: '', email: '', password: '', confirm: '', industry: '', website: '' });
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
    if (!form.company_name || !form.email || !form.password || !form.confirm) {
      triggerShake(); setError('Nama perusahaan, email, dan password wajib diisi.'); return;
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
      await api.post('/auth/register/company', {
        company_name: form.company_name,
        email:        form.email,
        password:     form.password,
        industry:     form.industry || undefined,
        website:      form.website  || undefined,
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
            <h2>Daftar sebagai<br/>Perusahaan</h2>
            <p>Temukan talenta terbaik bersama 19MJ.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="company_name">Nama Perusahaan</label>
            <input id="company_name" name="company_name" type="text"
              placeholder="PT. Maju Bersama" value={form.company_name} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="email">Email Perusahaan</label>
            <input id="email" name="email" type="email"
              placeholder="hr@perusahaan.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="industry">Industri <span className="optional">(opsional)</span></label>
            <input id="industry" name="industry" type="text"
              placeholder="Teknologi, Keuangan, dll." value={form.industry} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="website">Website <span className="optional">(opsional)</span></label>
            <input id="website" name="website" type="url"
              placeholder="https://perusahaan.com" value={form.website} onChange={handleChange} />
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
            {loading ? 'Creating...' : 'Buat Akun Perusahaan'}
          </button>

          <div className="bottom-link" style={{ marginTop: 16 }}>
            Kandidat? <Link to="/register/candidate">Daftar sebagai Kandidat</Link>
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
