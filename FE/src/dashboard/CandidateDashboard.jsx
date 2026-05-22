import React from "react";
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

  const user = JSON.parse(
    localStorage.getItem(
      "currentUser"
    ) || "{}"
  );

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const profileStorageKey =
    `candidateProfile_${currentUser.email}`;

  const profile = JSON.parse(
    localStorage.getItem(profileStorageKey) || "{}"
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

  const percentage =
    Math.round(
      (
        fields.filter(
          Boolean
        ).length /
        fields.length
      ) * 100
    );

  return (
    <div style={styles.container}>

      <CandidateSidebar active="dashboard" />

      <div style={styles.main}>


        {/* HEADER */}
        <div
          style={{
            background:
              "white",
            height: "88px",
            padding:
              "0 32px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            borderBottom:
              "1px solid #eee",
            boxSizing:
              "border-box"
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700
            }}
          >
            Candidate
          </h2>


          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 16
            }}
          >

            <FiBell size={18} />

            {profile.photo ? (

              <img
                src={
                  profile.photo
                }
                alt="profile"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius:
                    "50%",
                  objectFit:
                    "cover"
                }}
              />

            ) : (

              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius:
                    "50%",
                  background:
                    "#0f7c82",
                  color:
                    "white",
                  display:
                    "flex",
                  justifyContent:
                    "center",
                  alignItems:
                    "center",
                  fontWeight:
                    700
                }}
              >
                {(
                  profile.fullName ||
                  "U"
                )[0]}
              </div>

            )}

            <div>

              <div
                style={{
                  fontWeight:
                    600
                }}
              >
                {
                  profile.fullName ||
                  "User"
                }
              </div>

              <div
                style={{
                  fontSize:
                    12,
                  color:
                    "#666"
                }}
              >
                Job Seeker
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

            <p
              style={{
                color:
                  "#666"
              }}
            >
              You have things to complete.
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
                  width:
                    `${percentage}%`
                }}
              />

            </div>

            <button
              style={
                styles.outlineButton
              }
              onClick={() =>
                navigate(
                  "/my-profile"
                )
              }
            >
              Complete Profile
            </button>

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
            title="Practice Interview"
            desc="Practice interview with AI"
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
        <h2
          style={{
            padding:
              "0 30px",
            marginBottom:
              20
          }}
        >
          Your Progress
        </h2>

        <div style={styles.progressGrid}>

          <SmallCard
            icon={
              <FiFileText />
            }
            title="CV Review"
            button="Upload"
            onClick={() =>
              navigate(
                "/cv-review"
              )
            }
          />

          <SmallCard
            icon={
              <FiMap />
            }
            title="Career Plan"
            button="Create"
            onClick={() =>
              navigate(
                "/career-planner"
              )
            }
          />

          <SmallCard
            icon={
              <FiMic />
            }
            title="Interview Practice"
            button="View"
          />

          <SmallCard
            icon={
              <FiBriefcase />
            }
            title="Applications"
            button="View"
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

    "Practice Interview":
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
        style={
          styles.link
        }
      >
        Get Started →
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

        <strong>
          {title}
        </strong>

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
    background: "white",
    margin: 30,
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent:
      "space-between"
  },

  progressBar: {
    width: 220,
    height: 8,
    background: "#eee",
    borderRadius: 10,
    margin:
      "8px 0 15px"
  },

  progressFill: {
    height: "100%",
    background:
      "#0f7c82",
    borderRadius: 10
  },

  outlineButton: {
    border:
      "1px solid #0f7c82",
    background:
      "white",
    color:
      "#0f7c82",
    padding:
      "8px 16px",
    borderRadius: 10,
    cursor: "pointer"
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