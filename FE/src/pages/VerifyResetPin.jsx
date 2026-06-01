import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
import AuthLeftPanel from '../components/AuthLeftPanel';

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
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(() =>
    getResetResendCooldownRemaining(getResetFlow())
  );
  const [shake, setShake] = useState(false);

  const inputRefs = useRef([]);

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
    ? `Resend code in ${formatCooldown(cooldownRemaining)}`
    : 'Resend code';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleDigitChange = (index, value) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');
    setStatus('');

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      setError('');
      setStatus('');

      // Focus last filled or next empty
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pin = digits.join('');
    if (pin.length !== 6) {
      triggerShake();
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      const data = await api.post('/auth/forgot-password/verify-pin', {
        email,
        pin,
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
      setDigits(['', '', '', '', '', '']);
      setFlow((current) => ({
        ...current,
        email,
        role: activeRole,
        resendAvailableAt: Date.now() + (RESET_PIN_RESEND_COOLDOWN_SECONDS * 1000),
      }));
      setCooldownRemaining(RESET_PIN_RESEND_COOLDOWN_SECONDS);
      setStatus('A new code has been sent to your email.');
      inputRefs.current[0]?.focus();
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
    <div className="auth-layout">

      {/* LEFT */}
      <AuthLeftPanel />

      {/* RIGHT */}
      <div
        className="auth-right-panel"
        style={{
          flex: 1,
          background: "white",
          borderRadius: "32px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px"
        }}
      >

        <form
          onSubmit={handleSubmit}
          className={shake ? "shake" : ""}
          style={{
            width: "100%",
            maxWidth: "420px",
            fontFamily: "Inter, sans-serif"
          }}
        >

          {/* HEADER */}
          <div
            style={{
              marginBottom: "28px"
            }}
          >
            <h1
              style={{
                textAlign: "center",
                fontSize: "28px",
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: "8px"
              }}
            >
              Verification Code
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#64748B",
                fontSize: "15px",
                lineHeight: "1.5"
              }}
            >
              Enter the 6-digit code sent to {email || 'your email'}
            </p>
          </div>


          {error && <div className="error-banner">{error}</div>}
          {status && <div className="success-banner">{status}</div>}


          {/* VERIFICATION CODE BOXES */}
          <div
            className="verification-code-container"
            onPaste={handlePaste}
          >
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`verification-digit-box ${digit ? 'filled' : ''}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>


          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "52px",
              background: "#0f7c82",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px"
            }}
          >
            {loading ? 'Verifying...' : 'Send Verification Code'}
          </button>


          {/* RESEND & LINKS */}
          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              color: "#64748B",
              fontSize: "14px"
            }}
          >
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendLoading || cooldownRemaining > 0 || !email}
              style={{
                background: "none",
                border: "none",
                color: cooldownRemaining > 0 ? "#94A3B8" : "#0f7c82",
                cursor: cooldownRemaining > 0 ? "default" : "pointer",
                fontWeight: 600,
                fontSize: "14px",
                fontFamily: "Inter, sans-serif"
              }}
            >
              {resendLoading ? 'Sending...' : resendLabel}
            </button>

            <div style={{ marginTop: "16px" }}>
              <Link to={`/forgot-password?role=${activeRole}`}>Change email</Link>
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>|</span>
              <Link to={getLoginRouteByRole(activeRole)}>Back to login</Link>
            </div>
          </div>

        </form>

      </div>

    </div>
  );
}
