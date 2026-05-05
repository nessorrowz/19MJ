import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { GoogleOAuthProvider } from "@react-oauth/google";

import Login from "./pages/Login";
import RegisterCandidate from "./pages/RegisterCandidate";
import RegisterCompany from "./pages/RegisterCompany";
import LoginCompany from "./pages/LoginCompany";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetPin from "./pages/VerifyResetPin";
import ResetPassword from "./pages/ResetPassword";

import CandidateDashboard from "./dashboard/CandidateDashboard";
import CandidateProfile from "./dashboard/CandidateProfile";
import CVReview from "./dashboard/CVReview";
import CareerPlannerPage from "./dashboard/CareerPlannerPage";
import InterviewPracticePage from "./dashboard/InterviewPracticePage";
import FindJobsPage from "./dashboard/FindJobsPage";

function PrivateRoute({
  children,
  allowedRole
}) {
  const isLogin =
    localStorage.getItem("isLogin") === "true";

  if (!isLogin) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (allowedRole) {
    const user = JSON.parse(
      localStorage.getItem(
        "currentUser"
      ) || "{}"
    );

    if (user.role !== allowedRole) {
      return (
        <Navigate
          to={
            user.role === "company"
              ? "/company/dashboard"
              : "/dashboard"
          }
          replace
        />
      );
    }
  }

  return children;
}

function Dashboard({
  role
}) {
  const user = JSON.parse(
    localStorage.getItem(
      "currentUser"
    ) || "{}"
  );

  const name =
    role === "company"
      ? user.company_name
      : (
          user.username ||
          user.email
        );

  return (
    <div
      style={{
        padding: 40
      }}
    >
      <h1>
        Selamat datang, {name}
      </h1>

      <button
        onClick={() => {
          localStorage.clear();
          window.location.href =
            "/login";
        }}
      >
        Logout
      </button>
    </div>
  );
}

function RootRedirect() {
  const isLogin =
    localStorage.getItem("isLogin") === "true";

  if (!isLogin) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const user = JSON.parse(
    localStorage.getItem(
      "currentUser"
    ) || "{}"
  );

  return (
    <Navigate
      to={
        user.role === "company"
          ? "/company/dashboard"
          : "/dashboard"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId="GOOGLE_CLIENT_ID_KAMU">

      <BrowserRouter>

        <Routes>

          {/* Candidate */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={
              <RegisterCandidate />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPassword />
            }
          />

          <Route
            path="/verify-reset-pin"
            element={
              <VerifyResetPin />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPassword />
            }
          />

          {/* Company */}
          <Route
            path="/company/login"
            element={
              <LoginCompany />
            }
          />

          <Route
            path="/company/register"
            element={
              <RegisterCompany />
            }
          />

          <Route
            path="/company/dashboard"
            element={
              <PrivateRoute allowedRole="company">
                <Dashboard role="company" />
              </PrivateRoute>
            }
          />

          {/* OAuth */}
          <Route
            path="/auth/callback"
            element={
              <AuthCallback />
            }
          />

          {/* Redirects */}
          <Route
            path="/register/candidate"
            element={
              <Navigate
                to="/register"
                replace
              />
            }
          />

          <Route
            path="/register/company"
            element={
              <Navigate
                to="/company/register"
                replace
              />
            }
          />

          <Route
            path="/"
            element={
              <RootRedirect />
            }
          />

          {/* Candidate Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRole="candidate">
                <CandidateDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/my-profile"
            element={
              <PrivateRoute allowedRole="candidate">
                <CandidateProfile />
              </PrivateRoute>
            }
          />

          <Route
            path="/cv-review"
            element={
              <PrivateRoute allowedRole="candidate">
                <CVReview />
              </PrivateRoute>
            }
          />

          <Route
            path="/career-planner"
            element={
              <PrivateRoute allowedRole="candidate">
                <CareerPlannerPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/interview-practice"
            element={
              <PrivateRoute allowedRole="candidate">
                <InterviewPracticePage />
              </PrivateRoute>
            }
          />

          <Route
            path="/find-jobs"
            element={
              <PrivateRoute allowedRole="candidate">
                <FindJobsPage />
              </PrivateRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>

    </GoogleOAuthProvider>
  );
}