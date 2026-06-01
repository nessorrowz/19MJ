import { useState } from "react";
import {
  Link,
  useNavigate
} from "react-router-dom";

import api from "../utils/api";
import "./Auth.css";

import {
  FiUser,
  FiBriefcase,
  FiMail,
  FiLock,
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

export default function RegisterCandidate() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      fullname: "",
      email: "",
      password: "",
      confirm: ""
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

  const [
    showConfirm,
    setShowConfirm
  ] = useState(false);

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
        !form.fullname ||
        !form.email ||
        !form.password ||
        !form.confirm
      ) {
        triggerShake();

        setError(
          "Semua field wajib diisi."
        );

        return;
      }

      if (
        form.password !==
        form.confirm
      ) {
        triggerShake();

        setError(
          "Password tidak sama."
        );

        return;
      }

      try {
        setLoading(true);

        await api.post(
          "/auth/register",
          {
            fullname:
              form.fullname,

            email:
              form.email,

            password:
              form.password
          }
        );

        navigate(
          "/login",
          {
            state: {
              registered: true
            }
          }
        );

      } catch (err) {
        triggerShake();

        setError(
          err.message
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
        const userInfo =
          jwtDecode(
            credentialResponse.credential
          );

        const googleUser =
        {
          username:
            userInfo.name,

          email:
            userInfo.email,

          photo:
            userInfo.picture,

          role:
            "candidate"
        };

        localStorage.setItem(
          "currentUser",
          JSON.stringify(
            googleUser
          )
        );

        localStorage.setItem(
          "isLogin",
          "true"
        );

        navigate(
          "/dashboard"
        );

      } catch (err) {
        triggerShake();

        setError(
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
    boxSizing:
      "border-box",
    background:
      "white",
    outline: "none"
  };

  const inputWrapper = {
    position:
      "relative",
    marginBottom:
      "14px"
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
            borderRadius:
              "32px",
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
                "420px"
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
                  marginBottom:
                    "8px"
                }}
              >
                Create your account
              </h1>

              <p
                style={{
                  textAlign:
                    "center",
                  color:
                    "#64748B"
                }}
              >
                Join thousands preparing for their next role
              </p>
            </div>

            {/* ROLE SWITCH */}
            <div
              style={{
                display:
                  "flex",
                gap: "12px",
                marginBottom:
                  "24px"
              }}
            >

              <button
                type="button"
                style={{
                  flex: 1,
                  height:
                    "48px",
                  border:
                    "none",
                  borderRadius:
                    "12px",
                  background:
                    "#0f7c82",
                  color:
                    "white",
                  fontWeight:
                    600
                }}
              >
                <FiUser /> Job Seeker
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/company/register"
                  )
                }
                style={{
                  flex: 1,
                  height:
                    "48px",
                  border:
                    "1px solid #0f7c82",
                  borderRadius:
                    "12px",
                  background:
                    "white",
                  color:
                    "#0f7c82",
                  fontWeight:
                    600
                }}
              >
                <FiBriefcase /> Company
              </button>

            </div>

            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}

            {/* FULL NAME */}
            <div style={inputWrapper}>
              <FiUser style={leftIconStyle} />

              <input
                name="fullname"
                placeholder="Full Name"
                value={form.fullname}
                onChange={handleChange}
                style={inputWithIcon}
              />
            </div>

            {/* EMAIL */}
            <div style={inputWrapper}>
              <FiMail style={leftIconStyle} />

              <input
                name="email"
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

            {/* CONFIRM */}
            <div style={inputWrapper}>
              <FiLock style={leftIconStyle} />

              <input
                name="confirm"
                type={
                  showConfirm
                    ? "text"
                    : "password"
                }
                placeholder="Confirm Password"
                value={form.confirm}
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
                  setShowConfirm(
                    !showConfirm
                  )
                }
              >
                {showConfirm
                  ? <FiEyeOff />
                  : <FiEye />}
              </div>
            </div>

            {/* BUTTON */}
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
                marginTop: "10px"
              }}
            >
              {loading
                ? "Creating..."
                : "Create Account"}
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
              Already have an account?{" "}
              <Link to="/login">
                Log in
              </Link>
            </div>

          </form>

        </div>

      </div>
    </PageTransition>
  );
}