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

export default function Login() {
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
      : location.state?.resetSuccess
      ? "Password berhasil direset."
      : "";

  const handleChange = (
    e
  ) => {
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
          "candidate"
        ) {
          throw new Error(
            "Akun ini bukan akun kandidat."
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
          "/dashboard"
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
          err.message ||
            "Google login gagal"
        );
      }
    };

  const inputStyle = {
    width: "100%",
    height: "58px",
    padding: "0 18px",
    borderRadius: "14px",
    border:
      "1px solid #E5E7EB",
    fontSize: "15px",
    boxSizing:
      "border-box",
    outline: "none"
  };

  const inputWrapper =
    {
      position:
        "relative",
      marginBottom:
        "14px"
    };

  const leftIconStyle =
    {
      position:
        "absolute",
      left: "18px",
      top: "50%",
      transform:
        "translateY(-50%)",
      color: "#9CA3AF",
      zIndex: 2
    };

  const inputWithIcon =
    {
      ...inputStyle,
      paddingLeft:
        "48px"
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
            marginBottom:
              "20px"
          }}
        />

        <div
          style={{
            background:
              "#8FA5B8",
            borderRadius:
              "25px",
            height:
              "500px",
            position:
              "relative",
            overflow:
              "hidden"
          }}
        >
          <img
            src="/gambar/ceweray.png"
            alt="character"
            style={{
              position:
                "absolute",
              bottom: 0,
              left: "50%",
              width:
                "85%",
              transform:
                "translateX(-50%)"
            }}
          />
        </div>

      </div>

      {/* RIGHT */}
      <div className="auth-right-panel">

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
              "500px"
          }}
        >

          {/* HEADER */}
          <div
            style={{
              marginBottom:
                "45px"
            }}
          >
            <h1
              style={{
                textAlign:
                  "center",
                fontSize:
                  "42px"
              }}
            >
              Welcome Back
            </h1>

            <p
              style={{
                textAlign:
                  "center",
                color:
                  "#777"
              }}
            >
              Sign in to your account
            </p>
          </div>

          {/* ROLE SWITCH */}
          <div
            style={{
              display:
                "flex",
              background:
                "#f5f5f5",
              borderRadius:
                "14px",
              padding:
                "4px",
              gap: "4px",
              marginBottom:
                "40px"
            }}
          >

            <button
              type="button"
              style={{
                flex: 1,
                height:
                  "52px",
                border:
                  "none",
                borderRadius:
                  "12px",
                background:
                  "#0f7c82",
                color:
                  "white"
              }}
            >
              <FiUser />
              Candidate
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/company/login"
                )
              }
              style={{
                flex: 1,
                height:
                  "52px",
                border:
                  "none",
                borderRadius:
                  "12px",
                background:
                  "white"
              }}
            >
              <FiBriefcase />
              Company
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
          <div
            style={
              inputWrapper
            }
          >
            <FiMail
              style={
                leftIconStyle
              }
            />

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={
                form.email
              }
              onChange={
                handleChange
              }
              style={
                inputWithIcon
              }
            />
          </div>

          {/* PASSWORD */}
          <div
            style={
              inputWrapper
            }
          >
            <FiLock
              style={
                leftIconStyle
              }
            />

            <input
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={
                form.password
              }
              onChange={
                handleChange
              }
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
                "35px"
            }}
          >
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {/* LOGIN */}
          <button
            type="submit"
            disabled={
              loading
            }
            style={{
              width: "100%",
              height:
                "58px",
              border:
                "none",
              borderRadius:
                "14px",
              background:
                "#0f7c82",
              color:
                "white",
              cursor:
                "pointer"
            }}
          >
            {loading
              ? "Loading..."
              : "Sign In"}
          </button>

          {/* DIVIDER */}
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "14px",
              margin:
                "28px 0"
            }}
          >
            <div
              style={{
                flex: 1,
                height:
                  "1px",
                background:
                  "#E5E7EB"
              }}
            />

            <span>
              Or With
            </span>

            <div
              style={{
                flex: 1,
                height:
                  "1px",
                background:
                  "#E5E7EB"
              }}
            />
          </div>

          {/* GOOGLE */}
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center"
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
              width="420"
            />
          </div>

          {/* FOOTER */}
          <div
            style={{
              textAlign:
                "center",
              marginTop:
                "30px"
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