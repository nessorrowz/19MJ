import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login            from './pages/Login';
import RegisterCandidate from './pages/RegisterCandidate';
import RegisterCompany   from './pages/RegisterCompany';
import LoginCompany      from './pages/LoginCompany';
import AuthCallback      from './pages/AuthCallback';
import ForgotPassword    from './pages/ForgotPassword';
import VerifyResetPin    from './pages/VerifyResetPin';
import ResetPassword     from './pages/ResetPassword';
import CandidateDashboard from './dashboard/CandidateDashboard';
import CandidateProfile from "./dashboard/CandidateProfile";
import CVReview from "./dashboard/CVReview";
import CareerPlannerPage from "./dashboard/CareerPlannerPage";

// Protected route
function PrivateRoute({ children, allowedRole }) {
  const isLogin = localStorage.getItem('isLogin') === 'true';
  if (!isLogin) return <Navigate to="/login" replace />;

  if (allowedRole) {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== allowedRole) {
      return <Navigate to={user.role === 'company' ? '/company/dashboard' : '/dashboard'} replace />;
    }
  }

  return children;
}

// Placeholder dashboard (Sprint 2 akan diisi)
function Dashboard({ role }) {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const name = role === 'company' ? user.company_name : (user.username || user.email);
  return (
    <div style={{ padding: 40, fontFamily: 'DM Sans, sans-serif' }}>
      <h1>🎉 Selamat datang, {name}!</h1>
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
        {/* ── Candidate routes (default, no prefix) ── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<RegisterCandidate />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-pin" element={<VerifyResetPin />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Company routes (/company prefix) ── */}
        <Route path="/company/login"    element={<LoginCompany />} />
        <Route path="/company/register" element={<RegisterCompany />} />
        <Route path="/company/dashboard" element={
          <PrivateRoute allowedRole="company"><Dashboard role="company" /></PrivateRoute>
        } />

        {/* Legacy redirects */}
        <Route path="/register/candidate" element={<Navigate to="/register"         replace />} />
        <Route path="/register/company"   element={<Navigate to="/company/register" replace />} />

        {/* Google OAuth callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Root: redirect sesuai login status & role */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

        {/*dashboard route */}
        <Route path="/dashboard" element={<CandidateDashboard />}/>
        <Route path="/my-profile" element={ <PrivateRoute allowedRole="candidate"> <CandidateProfile /> </PrivateRoute> }/>
        <Route path="/cv-review" element={ <PrivateRoute allowedRole="candidate"> <CVReview /> </PrivateRoute>}/>

<Route
  path="/career-planner"
  element={
    <PrivateRoute allowedRole="candidate">
      <CareerPlannerPage />
    </PrivateRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const isLogin = localStorage.getItem('isLogin') === 'true';
  if (!isLogin) return <Navigate to="/login" replace />;
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return <Navigate to={user.role === 'company' ? '/company/dashboard' : '/dashboard'} replace />;
}
