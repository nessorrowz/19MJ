import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login            from './pages/Login';
import RegisterCandidate from './pages/RegisterCandidate';
import RegisterCompany   from './pages/RegisterCompany';

// Protected route
function PrivateRoute({ children, allowedRole }) {
  const isLogin = localStorage.getItem('isLogin') === 'true';
  if (!isLogin) return <Navigate to="/login" replace />;

  if (allowedRole) {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== allowedRole) return <Navigate to="/" replace />;
  }

  return children;
}

// Placeholder dashboard (Sprint 2 akan diisi)
function Dashboard() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return (
    <div style={{ padding: 40, fontFamily: 'DM Sans, sans-serif' }}>
      <h1>🎉 Selamat datang, {user.username || user.company_name || user.email}!</h1>
      <p style={{ color: '#7a8c91', marginTop: 8 }}>
        Role: <strong>{user.role}</strong> · Dashboard akan dibuat di Sprint 2.
      </p>
      <button
        onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
        style={{ marginTop: 24, padding: '10px 20px', background: '#0f7c82', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        Logout
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login"              element={<Login />} />
        <Route path="/register/candidate" element={<RegisterCandidate />} />
        <Route path="/register/company"   element={<RegisterCompany />} />

        {/* Redirect /register → /register/candidate */}
        <Route path="/register" element={<Navigate to="/register/candidate" replace />} />

        {/* Dashboard — protected */}
        <Route path="/dashboard"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard/company" element={<PrivateRoute allowedRole="company"><Dashboard /></PrivateRoute>} />

        {/* Root redirect */}
        <Route path="/" element={
          localStorage.getItem('isLogin') === 'true'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login"    replace />
        } />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
