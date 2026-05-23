import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import {
  GoogleOAuthProvider
} from "@react-oauth/google";

import {
  AnimatePresence
} from "framer-motion";

import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

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

    if (
      user.role !==
      allowedRole
    ) {
      return (
        <Navigate
          to={
            user.role ===
              "company"
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
        user.role ===
          "company"
          ? "/company/dashboard"
          : "/dashboard"
      }
      replace
    />
  );
}


function AppRoutes() {
  const location =
    useLocation();

  return (
    <AnimatePresence mode="wait">

      <Routes
        location={location}
        key={
          location.pathname
        }
      >

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

        {/* Recovery */}
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

        {/* OAuth */}
        <Route
          path="/auth/callback"
          element={
            <AuthCallback />
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRole="candidate">
              <CandidateDashboard />
            </PrivateRoute>
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

        {/* Root */}
        <Route
          path="/"
          element={
            <RootRedirect />
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

    </AnimatePresence>
  );
}


export default function App() {
  return (
    <GoogleOAuthProvider clientId="674676669844-o0kpk4l33dv4gq0mhgljevpnqtgism1o.apps.googleusercontent.com">

      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>

    </GoogleOAuthProvider>
  );
}