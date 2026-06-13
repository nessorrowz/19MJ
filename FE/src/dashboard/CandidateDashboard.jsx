import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiBell,
  FiUpload,
  FiMic,
  FiSearch,
  FiFileText,
  FiMap,
  FiBriefcase
} from "react-icons/fi";

import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import api from "../utils/api";


// ====================
// ICON HELPERS
// ====================

const createIconCircle = (
  bg,
  color
) => ({
  wrapper: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "18px"
  },

  color
});


const uploadIcon =
  createIconCircle(
    "rgba(16,185,129,0.12)",
    "#059669"
  );

const interviewIcon =
  createIconCircle(
    "rgba(245,158,11,0.12)",
    "#D97706"
  );

const jobsIcon =
  createIconCircle(
    "rgba(99,102,241,0.12)",
    "#4F46E5"
  );


// ====================
// COMPONENT
// ====================

export default function CandidateDashboard() {
  const navigate =
    useNavigate();

  const CACHE_KEY = "candidateDashboardProfileCache";

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return {
      fullName: "",
      photo: "",
      headline: "",
      location: "",
      about: "",
      experiences: [],
      educationList: [],
      skills: []
    };
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [stats, setStats] = useState({
    cvReview: { analyzed: false, score: null },
    careerPlan: { created: false },
    interviews: { count: 0, avgScore: 0 },
    applications: { count: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cvRes, planRes, intRes, appRes] = await Promise.allSettled([
          api.get('/ai/cv-review/latest').catch(() => null),
          api.get('/ai/career-roadmap/latest').catch(() => null),
          api.get('/ai/interviews').catch(() => null),
          api.get('/jobs/candidate/applications').catch(() => null)
        ]);

        const newStats = {
          cvReview: { analyzed: false, score: null },
          careerPlan: { created: false },
          interviews: { count: 0, avgScore: 0 },
          applications: { count: 0 }
        };

        if (cvRes.status === 'fulfilled' && cvRes.value && cvRes.value.result) {
          const resJson = cvRes.value.result.result_json || cvRes.value.result;
          newStats.cvReview = {
            analyzed: true,
            score: resJson.overallScore || null
          };
        }

        if (planRes.status === 'fulfilled' && planRes.value && planRes.value.result) {
          newStats.careerPlan = { created: true };
        }

        if (intRes.status === 'fulfilled' && intRes.value && intRes.value.result) {
          const sessions = intRes.value.result;
          const evaluated = sessions.filter(s => s.overall_score !== null);
          const avg = evaluated.length ? Math.round(evaluated.reduce((acc, curr) => acc + curr.overall_score, 0) / evaluated.length) : 0;
          newStats.interviews = { count: sessions.length, avgScore: avg };
        }

        if (appRes.status === 'fulfilled' && appRes.value) {
          const apps = appRes.value; 
          newStats.applications = { count: apps.length };
        }

        setStats(newStats);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        const newProfile = {
          fullName: user.full_name || user.username || "",
          photo: user.photo || "",
          headline: user.headline || "",
          location: user.location || "",
          about: user.about || "",
          experiences: user.experiences || [],
          educationList: user.education_list || [],
          skills: user.skills || []
        };
        setProfile(newProfile);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
    window.addEventListener("candidateProfileUpdated", fetchProfile);
    return () => window.removeEventListener("candidateProfileUpdated", fetchProfile);
  }, []);

  const displayName = profile.fullName || "User";

  const completedFields = [
    profile.photo,
    profile.fullName,
    profile.headline,
    profile.location,
    profile.about,
    profile.experiences && profile.experiences.length > 0,
    profile.educationList && profile.educationList.length > 0,
    profile.skills && profile.skills.length > 0
  ];

  const percentage = Math.round(
    (completedFields.filter(Boolean).length / completedFields.length) * 100
  );

  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  return (
    <div style={styles.container}>

      <CandidateSidebar active="dashboard" />

      <div style={styles.main}>


        {/* HEADER */}
        <CandidateHeader title="Dashboard" />

        {/* GREETING */}
        <div style={styles.greetingCard}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
              {greeting}, {displayName}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", marginTop: 8, fontSize: 16 }}>
              {percentage === 100 
                ? "Your profile is looking great! You are ready to apply for jobs."
                : "You have a few items to complete to strengthen your profile."}
            </p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.1)", padding: "16px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.2)" }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>
              Profile {percentage}% complete
            </p>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${percentage}%`
                }}
              />
            </div>
            {percentage < 100 && (
              <button
                style={styles.outlineButton}
                onClick={() => navigate("/my-profile")}
              >
                Complete Profile
              </button>
            )}
          </div>
        </div>


        {/* FEATURE */}
        <div style={styles.featureGrid}>

          <FeatureCard
            icon={
              <FiUpload />
            }
            title="Upload Your CV"
            desc="Get instant feedback on your CV"
            onClick={() =>
              navigate(
                "/cv-review"
              )
            }
          />

          <FeatureCard
            icon={
              <FiMic />
            }
            title="Interview Practice"
            desc="Get instant feedback on your practice"
            onClick={() =>
              navigate(
                "/interview-practice"
              )
            }
          />

          <FeatureCard
            icon={
              <FiSearch />
            }
            title="Find Jobs"
            desc="Browse roles that match you"
            onClick={() =>
              navigate(
                "/find-jobs"
              )
            }
          />

        </div>


        {/* PROGRESS */}
        <h2 style={{ padding: "0 30px", marginBottom: 20 }}>
          Your Progress
        </h2>

        <div style={styles.progressGrid}>
          <SmallCard
            icon={<FiFileText />}
            title="CV Review"
            subtitle={stats.cvReview.analyzed ? `Score: ${stats.cvReview.score}/100` : "Not analyzed yet"}
            subtitleColor={stats.cvReview.analyzed ? "#0f7c82" : "#DC2626"}
            button={stats.cvReview.analyzed ? "View" : "Upload"}
            onClick={() => navigate("/cv-review")}
          />

          <SmallCard
            icon={<FiMap />}
            title="Career Plan"
            subtitle={stats.careerPlan.created ? "Roadmap Active" : "No roadmap yet"}
            subtitleColor={stats.careerPlan.created ? "#0f7c82" : "#94A3B8"}
            button={stats.careerPlan.created ? "View" : "Create"}
            onClick={() => navigate("/career-planner")}
          />

          <SmallCard
            icon={<FiMic />}
            title="Interview Practice"
            subtitle={stats.interviews.count > 0 ? `${stats.interviews.count} sessions · Avg Score: ${stats.interviews.avgScore}/100` : "No sessions yet"}
            subtitleColor={stats.interviews.count > 0 ? "#0f7c82" : "#94A3B8"}
            button={stats.interviews.count > 0 ? "View" : "Practice"}
            onClick={() => navigate("/interview-practice")}
          />

          <SmallCard
            icon={<FiBriefcase />}
            title="Applications"
            subtitle={stats.applications.count > 0 ? `${stats.applications.count} active` : "No applications"}
            subtitleColor={stats.applications.count > 0 ? "#D97706" : "#94A3B8"}
            button="View"
            onClick={() => navigate("/my-applications")}
          />
        </div>

      </div>

    </div>
  );
}


// ====================
// FEATURE CARD
// ====================

function FeatureCard({
  icon,
  title,
  desc,
  onClick
}) {

  const iconStyles = {
    "Upload Your CV":
      uploadIcon,

    "Interview Practice":
      interviewIcon,

    "Find Jobs":
      jobsIcon
  };

  const selectedStyle =
    iconStyles[
    title
    ];

  return (
    <div style={styles.featureCard}>

      <div
        style={
          selectedStyle.wrapper
        }
      >
        {React.cloneElement(
          icon,
          {
            size: 22,
            color:
              selectedStyle.color
          }
        )}
      </div>

      <h3
        style={{
          margin: 0,
          marginBottom:
            14
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          marginBottom:
            22,
          color:
            "#666"
        }}
      >
        {desc}
      </p>

      <p
        onClick={onClick}
        style={styles.link}
      >
        Get Started
      </p>

    </div>
  );
}


// ====================
// SMALL CARD
// ====================

function SmallCard({
  icon,
  title,
  subtitle,
  subtitleColor,
  button,
  onClick
}) {
  return (
    <div style={styles.smallCard}>

      <div
        style={{
          display:
            "flex",
          gap: 12,
          alignItems:
            "center"
        }}
      >

        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius:
              "50%",
            background:
              "rgba(15,124,130,0.08)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            color:
              "#0f7c82"
          }}
        >
          {icon}
        </div>

        <div>
          <strong>
            {title}
          </strong>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                marginTop: 4,
                color: subtitleColor || "#94A3B8",
                fontWeight: 500
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

      </div>

      <button
        onClick={onClick}
        style={
          styles.smallButton
        }
      >
        {button}
      </button>

    </div>
  );
}


// ====================
// STYLES
// ====================

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "Inter, sans-serif"
  },

  main: {
    flex: 1
  },

  greetingCard: {
    background: "linear-gradient(135deg, #0f7c82 0%, #14b8a6 100%)",
    color: "white",
    margin: 30,
    borderRadius: 24,
    padding: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 10px 25px -5px rgba(15, 124, 130, 0.4)"
  },

  progressBar: {
    width: 200,
    height: 8,
    background: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    margin: "8px 0 16px"
  },

  progressFill: {
    height: "100%",
    background: "white",
    borderRadius: 10
  },

  outlineButton: {
    border: "none",
    background: "white",
    color: "#0f7c82",
    padding: "8px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    width: "100%"
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 20,
    padding:
      "0 30px",
    marginBottom: 30
  },

  featureCard: {
    background: "white",
    borderRadius: 20,
    padding:
      "32px 28px"
  },

  link: {
    margin: 0,
    color: "#0f7c82",
    fontWeight: 600,
    cursor: "pointer"
  },

  progressGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 20,
    padding:
      "0 30px 30px"
  },

  smallCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center"
  },

  smallButton: {
    border:
      "1px solid #0f7c82",
    background:
      "white",
    color:
      "#0f7c82",
    padding:
      "8px 14px",
    borderRadius: 8,
    cursor: "pointer"
  }
};