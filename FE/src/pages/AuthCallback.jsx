import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Halaman ini menangkap token dari Google OAuth callback
// URL: /auth/callback?token=xxx&user=xxx&redirect=/dashboard
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token    = params.get('token');
    const userStr  = params.get('user');
    const redirect = params.get('redirect') || '/dashboard';
    const error    = params.get('error');

    if (error) {
      navigate('/login?error=google_failed', { replace: true });
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token',       token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLogin',     'true');
        navigate(redirect, { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, params]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ color: '#7a8c91' }}>Sedang memproses login Google...</p>
    </div>
  );
}
