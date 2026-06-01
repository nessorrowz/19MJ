import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import api from '../utils/api';

import {
  getLoginRouteByRole,
  saveResetFlow,
  setResetResendCooldown
} from '../utils/passwordReset';

import './Auth.css';

import {
  FiUser,
  FiMail
} from 'react-icons/fi';

import AuthLeftPanel from '../components/AuthLeftPanel';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const role =
    searchParams.get('role') === 'company'
      ? 'company'
      : 'candidate';

  const [form, setForm] =
    useState({
      email: '',
      companyName: ''
    });

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [shake, setShake] =
    useState(false);


  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    setError('');
  };


  const triggerShake = () => {
    setShake(true);

    setTimeout(() => {
      setShake(false);
    }, 400);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail =
      form.email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      triggerShake();
      setError('Email wajib diisi.');
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      triggerShake();
      setError('Format email tidak valid.');
      return;
    }

    try {
      setLoading(true);

      await api.post(
        '/auth/forgot-password/request',
        {
          email: normalizedEmail
        }
      );

      setResetResendCooldown();

      saveResetFlow({
        email: normalizedEmail,
        role,
        resetToken: ''
      });

      navigate(
        '/verify-reset-pin',
        {
          state: {
            email: normalizedEmail,
            role
          }
        }
      );

    } catch (err) {
      triggerShake();

      setError(
        err.message ||
        'Failed to send verification code.'
      );

    } finally {
      setLoading(false);
    }
  };


  const inputStyle = {
    width: "100%",
    height: "52px",
    padding: "0 18px",
    borderRadius: "12px",
    border: "1.5px solid #D1D5DB",
    fontSize: "15px",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    outline: "none",
    background: "white"
  };

  const inputWrapper = {
    position: "relative",
    marginBottom: "16px"
  };

  const leftIconStyle = {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94A3B8",
    zIndex: 2
  };

  const inputWithIcon = {
    ...inputStyle,
    paddingLeft: "48px"
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
          className={
            shake
              ? "shake"
              : ""
          }
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
              Reset Password
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#64748B",
                fontSize: "15px",
                lineHeight: "1.5"
              }}
            >
              Please enter your email address. You will then receive
              an email containing a code to reset your password.
            </p>
          </div>


          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}


          {/* COMPANY NAME (only for company role) */}
          {role === 'company' && (
            <div style={inputWrapper}>
              <FiUser style={leftIconStyle} />

              <input
                name="companyName"
                placeholder="Company Name"
                value={form.companyName}
                onChange={handleChange}
                style={inputWithIcon}
              />
            </div>
          )}


          {/* EMAIL */}
          <div style={inputWrapper}>
            <FiMail style={leftIconStyle} />

            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              style={inputWithIcon}
            />
          </div>


          {/* BUTTON */}
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
            {
              loading
                ? "Sending..."
                : "Send Verification Code"
            }
          </button>


          {/* FOOTER */}
          <div
            style={{
              textAlign: "center",
              marginTop: "24px",
              color: "#64748B"
            }}
          >
            Back to{" "}

            <Link
              to={
                getLoginRouteByRole(role)
              }
            >
              Login
            </Link>

          </div>

        </form>

      </div>

    </div>
  );
}