import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import api from '../utils/api';

import {
  getLoginRouteByRole,
  saveResetFlow,
  setResetResendCooldown
} from '../utils/passwordReset';

import './Auth.css';

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
      email: ''
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
        'Failed to send reset PIN.'
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-layout">

      {/* LEFT */}
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
              maxHeight: "95%"
            }}
          />

        </div>

      </div>


      {/* RIGHT */}
      <div className="auth-right-panel">

        <form
          onSubmit={handleSubmit}
          className={
            shake
              ? "shake"
              : ""
          }
          style={{
            width: "100%",
            maxWidth: "500px"
          }}
        >

          <h1
            style={{
              textAlign: "center",
              marginBottom: "8px"
            }}
          >
            Forgot Password
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "30px"
            }}
          >
            Enter your email
          </p>


          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}


          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            style={{
              width: "100%",
              height: "58px",
              padding: "0 18px",
              borderRadius: "14px",
              border: "1px solid #ddd",
              marginBottom: "20px"
            }}
          />


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
              cursor: "pointer"
            }}
          >
            {
              loading
                ? "Sending..."
                : "Send Reset PIN"
            }
          </button>


          <div
            style={{
              textAlign: "center",
              marginTop: "20px"
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