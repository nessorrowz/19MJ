import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { RightPanel } from './Login';
import {
  RESET_PIN_RESEND_COOLDOWN_SECONDS,
  getLoginRouteByRole,
  getResetFlow,
  getResetResendCooldownRemaining,
  getRoleFromSearch,
  saveResetFlow,
  setResetResendCooldown,
} from '../utils/passwordReset';
import './Auth.css';

const formatCooldown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function VerifyResetPin() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getRoleFromSearch(location.search);
  const [flow, setFlow] = useState(getResetFlow());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(() =>
    getResetResendCooldownRemaining(getResetFlow())
  );
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const savedFlow = getResetFlow();

    if (!savedFlow.email) {
      navigate('/forgot-password', { replace: true });
      return;
    }

    setFlow(savedFlow);
    setCooldownRemaining(getResetResendCooldownRemaining(savedFlow));
  }, [navigate]);

  useEffect(() => {
    if (!flow.email) {
      return undefined;
    }

    const syncCooldown = () => {
      setCooldownRemaining(getResetResendCooldownRemaining(getResetFlow()));
    };

    syncCooldown();
    const timer = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(timer);
  }, [flow.email, flow.resendAvailableAt]);

  const email = flow.email || location.state?.email || '';
  const activeRole = flow.role || role || location.state?.role || 'candidate';
  const resendLabel = cooldownRemaining > 0
    ? `Kirim ulang PIN dalam ${formatCooldown(cooldownRemaining)}`
    : 'Kirim ulang PIN';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedPin = pin.replace(/\D/g, '');
    if (normalizedPin.length !== 6) {
      triggerShake();
      setError('PIN harus terdiri dari 6 digit.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      const data = await api.post('/auth/forgot-password/verify-pin', {
        email,
        pin: normalizedPin,
      });

      // Reset token hanya dipakai untuk langkah penggantian password berikutnya.
      saveResetFlow({ resetToken: data.resetToken, role: activeRole, email });
      navigate('/reset-password', { state: { email, role: activeRole } });
    } catch (err) {
      triggerShake();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendLoading || cooldownRemaining > 0) {
      return;
    }

    setResendLoading(true);
    setError('');
    setStatus('');

    try {
      await api.post('/auth/forgot-password/request', { email });
      setResetResendCooldown(RESET_PIN_RESEND_COOLDOWN_SECONDS);
      setPin('');
      setFlow((current) => ({
        ...current,
        email,
        role: activeRole,
        resendAvailableAt: Date.now() + (RESET_PIN_RESEND_COOLDOWN_SECONDS * 1000),
      }));
      setCooldownRemaining(RESET_PIN_RESEND_COOLDOWN_SECONDS);
      setStatus('PIN baru sudah dikirim ke email yang sama.');
    } catch (err) {
      const cooldownMatch = err.message.match(/Tunggu\s+(\d+)\s+detik/i);

      if (cooldownMatch) {
        const seconds = Number(cooldownMatch[1]);
        setResetResendCooldown(seconds);
        setFlow((current) => ({
          ...current,
          resendAvailableAt: Date.now() + (seconds * 1000),
        }));
        setCooldownRemaining(seconds);
      }

      triggerShake();
      setStatus('');
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <form className={`auth-card ${shake ? 'shake' : ''}`} onSubmit={handleSubmit} noValidate>
          <div className="card-header">
            <h2>Verifikasi PIN</h2>
            <p>Masukkan 6 digit PIN yang dikirim ke email {email || 'akunmu'}.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {status && <div className="success-banner">{status}</div>}

          <div className="field">
            <label htmlFor="pin">PIN 6 Digit</label>
            <input
              id="pin"
              name="pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
                setStatus('');
              }}
              style={{ letterSpacing: '0.35em', textAlign: 'center', fontWeight: 700, fontSize: '20px' }}
              autoComplete="one-time-code"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Memverifikasi...' : 'Verifikasi PIN'}
          </button>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={loading || resendLoading || cooldownRemaining > 0 || !email}
            >
              {resendLoading ? 'Mengirim ulang...' : resendLabel}
            </button>

            {cooldownRemaining > 0 && (
              <div className="resend-hint">
                PIN bisa dikirim ulang setelah {formatCooldown(cooldownRemaining)}.
              </div>
            )}

            <div className="bottom-link" style={{ marginTop: 16 }}>
              <Link to={`/forgot-password?role=${activeRole}`}>Ubah email</Link>
              <span style={{ margin: '0 8px' }}>-</span>
              <Link to={getLoginRouteByRole(activeRole)}>Kembali ke login</Link>
            </div>
          </div>
        </form>
      </div>

      <RightPanel />
    </div>
  );
}
