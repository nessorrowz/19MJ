import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';
import {
  FiUser,
  FiMail,
  FiLock,
  FiGlobe,
  FiBriefcase,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const success = location.state?.registered
    ? 'Registrasi berhasil! Silakan login.'
    : location.state?.resetSuccess
    ? 'Password berhasil direset. Silakan login kembali.'
    : '';

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

      if (data.user.role !== 'candidate') {
        triggerShake();
        setError('Akun ini bukan akun kandidat. Gunakan login perusahaan.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('isLogin', 'true');

      navigate('/dashboard');

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
  boxSizing: "border-box",
  outline: "none",
  transition: "all 0.2s ease"
  };

  const inputWrapper = {
    position: "relative",
    marginBottom: "14px"
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

        {/* Logo */}
        <img
          src="/gambar/19mj.png"
          alt="logo"
          style={{
            width: "150px",
            marginBottom: "20px"
          }}
        />

        {/* Illustration */}
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
          noValidate
          className={shake ? "shake" : ""}
          style={{
            width: "100%",
            maxWidth: "500px"
          }}
        >

          {/* HEADER */}
          <div style={{ marginBottom: "45px" }}>
            <h1
              style={{
                textAlign: "center",
                fontSize: "42px",
                marginBottom: "12px"
              }}
            >
              Welcome Back
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#777"
              }}
            >
              Sign in to your account
            </p>
          </div>


          {/* ROLE SWITCH */}
          <div
            style={{
              display: "flex",
              background: "#f5f5f5",
              borderRadius: "14px",
              padding: "4px",
              gap: "4px",
              marginBottom: "40px"
            }}
          >

            {/* Candidate */}
            <button
              type="button"
              style={{
                flex: 1,
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "#0f7c82",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontSize: "15px"
              }}
            >
              <FiUser size={18} />
              Candidate
            </button>


            {/* Company */}
            <button
              type="button"
              onClick={() => navigate("/company/login")}
              style={{
                flex: 1,
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "white",
                color: "#475467",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontSize: "15px"
              }}
            >
              <FiBriefcase size={18} />
              Company
            </button>

          </div>


          {success && <div className="success-banner">{success}</div>}
          {error && <div className="error-banner">{error}</div>}


          {/* INPUT SECTION */}
          <div style={{ marginBottom: "30px" }}>

            {/* EMAIL */}
            <div style={inputWrapper}>

              <FiMail style={leftIconStyle} />

              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                style={inputWithIcon}
              />

            </div>


            {/* PASSWORD */}
            <div style={inputWrapper}>

              <FiLock style={leftIconStyle} />

              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
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

          </div>

          {/* FORGOT */}
          <div
            style={{
              textAlign: "right",
              marginBottom: "35px"
            }}
          >
            <Link to="/forgot-password?role=candidate">
              Forgot Password?
            </Link>
          </div>


          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: "#0f7c82",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            {loading ? "Loading..." : "Sign In"}
          </button>


          {/* FOOTER */}
          <div
            style={{
              textAlign: "center",
              marginTop: "35px",
              color: "#666"
            }}
          >
            Don’t have an account?{" "}
            <Link to="/register">
              Create one
            </Link>
          </div>

        </form>

      </div>

    </div>
  );
}