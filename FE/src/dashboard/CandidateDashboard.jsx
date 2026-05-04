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

export default function CandidateDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const profile = JSON.parse(
    localStorage.getItem("candidateProfile") || "{}"
  );

  const displayName =
    profile.fullName ||
    user.username ||
    user.email ||
    "User";

  const fields = [
    profile.fullName,
    profile.headline,
    profile.location,
    profile.about,
    profile.education,
    profile.experience
  ];

  const percentage = Math.round(
    (fields.filter(Boolean).length /
      fields.length) *
      100
  );

  return (
    <div style={styles.container}>

      <CandidateSidebar active="dashboard" />

      <div style={styles.main}>


        {/* HEADER */}
        
        <div
        style={{
            background: "white",
            height: "88px",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #eee",
            boxSizing: "border-box"
        }}
        >

        {/* LEFT */}
        <h2
            style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700
            }}
        >
            Profile
            {/* ganti sesuai page:
                Candidate
                Profile
                CV & AI Review
                Career Planner
            */}
        </h2>


        {/* RIGHT */}
        <div
            style={{
            display: "flex",
            alignItems: "center",
            gap: 16
            }}
        >

            <FiBell size={18} />

            {profile.photo ? (

            <img
                src={profile.photo}
                alt="profile"
                style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                objectFit: "cover"
                }}
            />

            ) : (

            <div
                style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "#0f7c82",
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: 700
                }}
            >
                {(profile.fullName || "U")[0]}
            </div>

            )}

            <div>

            <div
                style={{
                fontWeight: 600
                }}
            >
                {profile.fullName || "User"}
            </div>

            <div
                style={{
                fontSize: 12,
                color: "#666"
                }}
            >
                Candidate
            </div>

            </div>

        </div>

        </div>


        {/* GREETING */}
        <div style={styles.greetingCard}>

          <div>

            <h1>
              Good morning, {displayName} 👋
            </h1>

            <p style={{ color: "#666" }}>
              Complete your profile
            </p>

          </div>

          <div>

            <p>
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

            <button
              style={styles.outlineButton}
              onClick={() =>
                navigate("/my-profile")
              }
            >
              Complete Profile
            </button>

          </div>

        </div>


        {/* FEATURE */}
        <div style={styles.featureGrid}>

          <FeatureCard
            icon={<FiUpload />}
            title="Upload Your CV"
            desc="Get AI-powered review in seconds"
            onClick={() =>
              navigate("/cv-review")
            }
          />

          <FeatureCard
            icon={<FiMic />}
            title="Practice Interview"
            desc="Simulate interview with AI"
          />

          <FeatureCard
            icon={<FiSearch />}
            title="Find Jobs"
            desc="Browse matching jobs"
          />

        </div>


        {/* PROGRESS */}
        <h2
          style={{
            padding: "0 30px",
            marginBottom: 20
          }}
        >
          Your Progress
        </h2>

        <div style={styles.progressGrid}>

          <SmallCard
            icon={<FiFileText />}
            title="CV Review"
            button="Upload"
            onClick={() =>
              navigate("/cv-review")
            }
          />

          <SmallCard
            icon={<FiMap />}
            title="Career Plan"
            button="Create"
            onClick={() =>
              navigate("/career-planner")
            }
          />

          <SmallCard
            icon={<FiMic />}
            title="Interview Practice"
            button="View"
          />

          <SmallCard
            icon={<FiBriefcase />}
            title="Applications"
            button="View"
          />

        </div>

      </div>

    </div>
  );
}


function FeatureCard({
  icon,
  title,
  desc,
  onClick
}) {
  return (
    <div style={styles.featureCard}>

      <div
        style={{
          fontSize: 24,
          marginBottom: 22
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: 0,
          marginBottom: 14,
          lineHeight: 1.4
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          marginBottom: 22,
          color: "#666",
          lineHeight: 1.6
        }}
      >
        {desc}
      </p>

      <p
        onClick={onClick}
        style={styles.link}
      >
        Get Started →
      </p>

    </div>
  );
}


function SmallCard({
  icon,
  title,
  button,
  onClick
}) {
  return (
    <div style={styles.smallCard}>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center"
        }}
      >
        {icon}
        <strong>{title}</strong>
      </div>

      <button
        onClick={onClick}
        style={styles.smallButton}
      >
        {button}
      </button>

    </div>
  );
}


const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa"
  },

  main: {
    flex: 1
  },

  header: {
    background: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 35px",
    borderBottom: "1px solid #eee"
  },

  userSection: {
    display: "flex",
    gap: 14,
    alignItems: "center"
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#0f7c82",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  roleText: {
    fontSize: 12,
    color: "#666"
  },

  greetingCard: {
    background: "white",
    margin: 30,
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between"
  },

  progressBar: {
    width: 220,
    height: 8,
    background: "#eee",
    borderRadius: 10,
    margin: "8px 0 15px"
  },

  progressFill: {
    height: "100%",
    background: "#0f7c82",
    borderRadius: 10
  },

  outlineButton: {
    border: "1px solid #0f7c82",
    background: "white",
    color: "#0f7c82",
    padding: "8px 16px",
    borderRadius: 10,
    cursor: "pointer"
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 20,
    padding: "0 30px",
    marginBottom: 30
  },

  featureCard: {
    background: "white",
    borderRadius: 20,
    padding: "32px 28px"
  },

  link: {
    margin: 0,
    color: "#0f7c82",
    fontWeight: 600,
    cursor: "pointer"
  },

  progressGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 20,
    padding: "0 30px 30px"
  },

  smallCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  smallButton: {
    border: "1px solid #0f7c82",
    background: "white",
    color: "#0f7c82",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer"
  }
};