import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Auth.css';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const userStr = params.get('user');
    const redirect =
      params.get('redirect') || '/dashboard';

    const error = params.get('error');

    if (error) {
      navigate(
        '/login?error=google_failed',
        { replace: true }
      );

      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(
          decodeURIComponent(userStr)
        );

        localStorage.setItem(
          'token',
          token
        );

        localStorage.setItem(
          'currentUser',
          JSON.stringify(user)
        );

        localStorage.setItem(
          'isLogin',
          'true'
        );

        navigate(
          redirect,
          { replace: true }
        );

      } catch {
        navigate(
          '/login',
          { replace: true }
        );
      }

    } else {
      navigate(
        '/login',
        { replace: true }
      );
    }

  }, [navigate, params]);


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
              maxHeight: "95%",
              objectFit: "contain"
            }}
          />

        </div>

      </div>


      {/* RIGHT */}
      <div className="auth-right-panel">

        <div
          style={{
            textAlign: "center"
          }}
        >

          <h1>
            Signing you in...
          </h1>

          <p
            style={{
              color: "#777"
            }}
          >
            Processing Google login
          </p>

        </div>

      </div>

    </div>
  );
}