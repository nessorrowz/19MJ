import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

import {
  clearResetFlow,
  getLoginRouteByRole,
  getResetFlow,
  getRoleFromSearch
} from '../utils/passwordReset';

import './Auth.css';

import {
  FiLock,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = getRoleFromSearch(location.search);

  const [flow, setFlow] = useState(getResetFlow());

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const savedFlow = getResetFlow();

    if (!savedFlow.resetToken || !savedFlow.email) {
      navigate('/forgot-password', {
        replace: true
      });

      return;
    }

    setFlow(savedFlow);

  }, [navigate]);

  const email = flow.email || location.state?.email || '';

  const activeRole =
    flow.role ||
    role ||
    location.state?.role ||
    'candidate';

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

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
      setError('Password wajib diisi.');
      return;
    }

    if (form.newPassword.length < 6) {
      triggerShake();
      setError('Password minimal 6 karakter.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      triggerShake();
      setError('Password tidak sama.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/forgot-password/reset', {
        resetToken: flow.resetToken,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });

      clearResetFlow();

      navigate(
        getLoginRouteByRole(activeRole),
        {
          replace: true,
          state: {
            resetSuccess: true
          }
        }
      );

    } catch (err) {
      triggerShake();
      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    height: "58px",
    padding: "0 18px",
    borderRadius: "14px",
    border: "1px solid #E5E7EB",
    fontSize: "15px",
    boxSizing: "border-box"
  };

  const inputWrapper = {
    position: "relative",
    marginBottom: "16px"
  };

  const leftIconStyle = {
    position: "absolute",
    left: "18px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9CA3AF",
    fontSize: "18px",
    zIndex: 2
  };

  const inputWithIcon = {
    ...inputStyle,
    paddingLeft: "48px"
  };

  return (
    <div className="auth-layout">

      {/* LEFT SIDE */}
      <div className="auth-left-panel">

        <img
          src="/gambar/19mj.png"
          alt="logo"
          style={{
            width: "150px",
            marginBottom: "20px"
          }}
        />

        <div
          style={{
            position: "relative",
            background: "#8FA5B8",
            borderRadius: "25px",
            height: "500px",
            overflow: "hidden"
          }}
        >

          <img
            src="/gambar/ceweray.png"
            alt="character"
            className="character-animation"
            style={{
              position: "absolute",
              bottom: "0",
              left: "50%",
              width: "85%",
              maxHeight: "95%",
              objectFit: "contain"
            }}
          />

        </div>

      </div>


      {/* RIGHT SIDE */}
      <div className="auth-right-panel">

        <form
          onSubmit={handleSubmit}
          className={shake ? "shake" : ""}
          style={{
            width: "100%",
            maxWidth: "500px"
          }}
        >

          {/* HEADER */}
          <h1
            style={{
              textAlign: "center",
              marginBottom: "8px"
            }}
          >
            Reset Password
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "30px"
            }}
          >
            Create a new password for {email}
          </p>


          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}


          {/* PASSWORD */}
          <div style={inputWrapper}>

            <FiLock style={leftIconStyle} />

            <input
              name="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={form.newPassword}
              onChange={handleChange}
              style={{
                ...inputWithIcon,
                paddingRight: "50px"
              }}
            />

            <div
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </div>

          </div>


          {/* CONFIRM */}
          <div style={inputWrapper}>

            <FiLock style={leftIconStyle} />

            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              style={{
                ...inputWithIcon,
                paddingRight: "50px"
              }}
            />

            <div
              className="eye-icon"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </div>

          </div>


          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "58px",
              background: "#0f7c82",
              color: "white",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            {loading ? "Saving..." : "Reset Password"}
          </button>


          {/* FOOTER */}
          <div
            style={{
              textAlign: "center",
              marginTop: "25px"
            }}
          >
            <Link to={getLoginRouteByRole(activeRole)}>
              Back to Login
            </Link>
          </div>

        </form>

      </div>

    </div>
  );
}