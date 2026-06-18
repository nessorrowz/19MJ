import { useState } from "react";

import {
  Link,
  useNavigate,
  useLocation
} from "react-router-dom";

import api from "../utils/api";
import "./Auth.css";

import {
  FiUser,
  FiMail,
  FiLock,
  FiBriefcase,
  FiEye,
  FiEyeOff
} from "react-icons/fi";

import {
  GoogleLogin
} from "@react-oauth/google";

import {
  jwtDecode
} from "jwt-decode";

import PageTransition from "../components/PageTransition";
import AuthLeftPanel from "../components/AuthLeftPanel";

export default function LoginCompany() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [form, setForm] =
    useState({
      email: "",
      password: ""
    });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [shake, setShake] =
    useState(false);

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const success =
    location.state?.registered
      ? "Registrasi berhasil! Silakan login."
      : "";

  const handleChange =
    (e) => {
      setForm({
        ...form,
        [e.target.name]:
          e.target.value
      });

      setError("");
    };

  const triggerShake =
    () => {
      setShake(true);

      setTimeout(() => {
        setShake(false);
      }, 400);
    };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      if (
        !form.email ||
        !form.password
      ) {
        triggerShake();

        setError(
          "Email dan password wajib diisi."
        );

        return;
      }

      setLoading(true);

      try {
        const data =
          await api.post(
            "/auth/login",
            form
          );

        if (
          data.user.role !==
          "company"
        ) {
          throw new Error(
            "Akun ini bukan akun company."
          );
        }

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "currentUser",
          JSON.stringify(
            data.user
          )
        );

        localStorage.setItem(
          "isLogin",
          "true"
        );

        navigate(
          "/company/dashboard"
        );

      } catch (err) {
        triggerShake();

        setError(
          err.response
            ?.data
            ?.message ||
          err.message ||
          "Login gagal"
        );

      } finally {
        setLoading(false);
      }
    };

  const handleGoogleLogin =
    async (
      credentialResponse
    ) => {
      try {
        setLoading(true);

        const data =
          await api.post(
            "/auth/google/token",
            {
              credential: credentialResponse.credential,
              role: "company"
            }
          );

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "currentUser",
          JSON.stringify(
            data.user
          )
        );

        localStorage.setItem(
          "isLogin",
          "true"
        );

        navigate(
          "/company/dashboard"
        );

      } catch (err) {
        triggerShake();

        setError(
          err.message ||
          "Google login gagal"
        );
      }
    };

  const inputStyle = {
    width: "100%",
    height: "52px",
    padding: "0 18px",
    borderRadius: "12px",
    border:
      "1.5px solid #D1D5DB",
    fontSize: "15px",
    fontFamily:
      "Inter, sans-serif",
    boxSizing:
      "border-box",
    outline: "none",
    background:
      "white"
  };

  const inputWrapper = {
    position:
      "relative",
    marginBottom:
      "16px"
  };

  const leftIconStyle = {
    position:
      "absolute",
    left: "16px",
    top: "50%",
    transform:
      "translateY(-50%)",
    color: "#94A3B8",
    zIndex: 2
  };

  const inputWithIcon = {
    ...inputStyle,
    paddingLeft:
      "48px"
  };

  return (
    <PageTransition>
      <div className="auth-layout">

        {/* LEFT */}
        <AuthLeftPanel />

        {/* RIGHT */}
        <div
          className="auth-right-panel"
          style={{
            flex: 1,
            background:
              "white",
            borderRadius:
              "32px",
            display:
              "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
            padding:
              "40px"
          }}
        >

          <form
            onSubmit={
              handleSubmit
            }
            className={
              shake
                ? "shake"
                : ""
            }
            style={{
              width: "100%",
              maxWidth:
                "420px",
              fontFamily:
                "Inter, sans-serif"
            }}
          >

            {/* HEADER */}
            <div
              style={{
                marginBottom:
                  "28px"
              }}
            >
              <h1
                style={{
                  textAlign:
                    "center",
                  fontSize:
                    "28px",
                  fontWeight:
                    700,
                  color:
                    "#0F172A",
                  marginBottom:
                    "8px"
                }}
              >
                Welcome to 19MJ
              </h1>

              <p
                style={{
                  textAlign:
                    "center",
                  color:
                    "#64748B",
                  fontSize:
                    "15px"
                }}
              >
                Sign in to your 19 MJ account
              </p>
            </div>

            {/* ROLE SWITCH */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px"
              }}
            >

              {/* INACTIVE */}
              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
                style={{
                  flex: 1,
                  height: "48px",
                  border:
                    "1px solid #0f7c82",
                  borderRadius: "12px",
                  background: "white",
                  color: "#0f7c82",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <FiUser /> Job Seeker
              </button>

              {/* ACTIVE */}
              <button
                type="button"
                style={{
                  flex: 1,
                  height: "48px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#0f7c82",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.06)"
                }}
              >
                <FiBriefcase /> Company
              </button>

            </div>

            {success && (
              <div className="success-banner">
                {success}
              </div>
            )}

            {error && (
              <div className="error-banner">
                {error}
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

            {/* PASSWORD */}
            <div style={inputWrapper}>
              <FiLock style={leftIconStyle} />

              <input
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                style={{
                  ...inputWithIcon,
                  paddingRight:
                    "50px"
                }}
              />

              <div
                className="eye-icon"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword
                  ? <FiEyeOff />
                  : <FiEye />}
              </div>
            </div>

            {/* FORGOT */}
            <div
              style={{
                textAlign:
                  "right",
                marginBottom:
                  "24px"
              }}
            >
              <Link to="/forgot-password?role=company">
                Forgot your password?
              </Link>
            </div>

            {/* LOGIN */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "#0f7c82",
                color: "white",
                fontWeight: 600,
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              {loading
                ? "Loading..."
                : "Sign In"}
            </button>

            {/* DIVIDER */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "24px 0"
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "#D1D5DB"
                }}
              />

              <span>
                Or With
              </span>

              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "#D1D5DB"
                }}
              />
            </div>

            {/* GOOGLE */}
            <div
              style={{
                display: "flex",
                justifyContent: "center"
              }}
            >
              <GoogleLogin
                onSuccess={
                  handleGoogleLogin
                }
                onError={() =>
                  setError(
                    "Google login gagal"
                  )
                }
                theme="outline"
                size="large"
                width="400"
              />
            </div>

            {/* FOOTER */}
            <div
              style={{
                textAlign: "center",
                marginTop: "24px",
                color: "#64748B"
              }}
            >
              Don’t have an account?{" "}
              <Link to="/company/register">
                Create one
              </Link>
            </div>

          </form>

        </div>

      </div>
    </PageTransition>
  );
}