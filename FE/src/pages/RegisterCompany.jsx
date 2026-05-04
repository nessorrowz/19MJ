import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

import {
  FiUser,
  FiBriefcase,
  FiMail,
  FiGlobe,
  FiLayers,
  FiLock,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

// US-003: Register Company
export default function RegisterCompany() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    company_name: '',
    email: '',
    password: '',
    confirm: '',
    industry: '',
    website: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    if (!form.company_name || !form.email || !form.password || !form.confirm) {
      triggerShake();
      setError('Nama perusahaan, email, dan password wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      triggerShake();
      setError('Format email tidak valid.');
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

    try {
      setLoading(true);

      await api.post('/auth/register/company', {
        company_name: form.company_name,
        email: form.email,
        password: form.password,
        industry: form.industry || undefined,
        website: form.website || undefined
      });

      navigate('/company/login', {
        state: {
          registered: true
        }
      });

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
            Create company account
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "30px"
            }}
          >
            Find the best talents with 19MJ
          </p>


          {/* ROLE SWITCH */}
          <div
            style={{
              display: "flex",
              background: "#f5f5f5",
              borderRadius: "14px",
              padding: "4px",
              gap: "4px",
              marginBottom: "35px"
            }}
          >

            <button
              type="button"
              onClick={() => navigate("/register")}
              style={{
                flex: 1,
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px"
              }}
            >
              <FiUser size={18} />
              Candidate
            </button>

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px"
              }}
            >
              <FiBriefcase size={18} />
              Company
            </button>

          </div>


          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}


          {/* COMPANY NAME */}
          <div style={inputWrapper}>
            <FiBriefcase style={leftIconStyle} />

            <input
              name="company_name"
              placeholder="Company Name"
              value={form.company_name}
              onChange={handleChange}
              style={inputWithIcon}
            />
          </div>


          {/* EMAIL */}
          <div style={inputWrapper}>
            <FiMail style={leftIconStyle} />

            <input
              name="email"
              type="email"
              placeholder="Company Email"
              value={form.email}
              onChange={handleChange}
              style={inputWithIcon}
            />
          </div>


          {/* INDUSTRY */}
          <div style={inputWrapper}>
            <FiLayers style={leftIconStyle} />

            <input
              name="industry"
              placeholder="Industry (Optional)"
              value={form.industry}
              onChange={handleChange}
              style={inputWithIcon}
            />
          </div>


          {/* WEBSITE */}
          <div style={inputWrapper}>
            <FiGlobe style={leftIconStyle} />

            <input
              name="website"
              placeholder="Website (Optional)"
              value={form.website}
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


          {/* CONFIRM PASSWORD */}
          <div style={inputWrapper}>
            <FiLock style={leftIconStyle} />

            <input
              name="confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirm}
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
              fontWeight: "600",
              marginTop: "10px"
            }}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>


          {/* FOOTER */}
          <div
            style={{
              textAlign: "center",
              marginTop: "25px"
            }}
          >
            Already have an account?{" "}
            <Link to="/company/login">
              Sign In
            </Link>
          </div>

        </form>

      </div>

    </div>
  );
}