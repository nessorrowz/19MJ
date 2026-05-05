  import { useState } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import api from '../utils/api';
  import './Auth.css';
  import { FiEye, FiEyeOff } from "react-icons/fi";

  export default function Register() {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake]   = useState(false);

    const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
      setError('');
    };

    const triggerShake = () => {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!form.username || !form.email || !form.password || !form.confirm) {
        triggerShake();
        setError('Semua field wajib diisi.');
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

      setLoading(true);
      setError('');

      try {
        await api.post('/auth/register', {
          username:  form.username,
          email:     form.email,
          password:  form.password,
          full_name: form.full_name || undefined,
        });
        navigate('/login', { state: { registered: true } });
      } catch (err) {
        triggerShake();
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  const inputStyle = {
    width: "100%",
    padding: "14px",
    marginBottom: "14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxSizing: "border-box"
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
          style={{ width: "100%" }}
        >

          <h1 style={{ textAlign: "center", marginBottom: "8px" }}>
            Create your account
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "30px"
            }}
          >
            Join thousands preparing for their next role
          </p>

          {error && (
            <div
              style={{
                color: "red",
                marginBottom: "15px"
              }}
            >
              {error}
            </div>
          )}

          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="confirm"
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={handleChange}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#0f7c82",
              color: "white",
              border: "none",
              borderRadius: "10px",
              marginTop: "10px",
              cursor: "pointer"
            }}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: "20px"
            }}
          >
            Already have an account? <Link to="/login">Sign In</Link>
          </div>

        </form>

      </div>

    </div>
  );
  }
