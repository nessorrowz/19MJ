import { FiBell, FiZap } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";

export default function CareerPlannerPage() {
  const profile = JSON.parse(
    localStorage.getItem("candidateProfile") || "{}"
  );

  return (
    <div style={styles.container}>
      <CandidateSidebar active="career" />

      <div style={styles.main}>
        {/* HEADER - follow candidate pages */}
        <div style={styles.header}>
          <h2 style={styles.pageTitle}>Career Planner</h2>

          <div style={styles.headerRight}>
            <FiBell size={18} />

            {profile.photo ? (
              <img
                src={profile.photo}
                alt="profile"
                style={styles.avatar}
              />
            ) : (
              <div style={styles.avatarFallback}>
                {(profile.fullName || "U")[0]}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600 }}>
                {profile.fullName || "User"}
              </div>

              <div style={styles.roleLabel}>
                Job Seeker
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={styles.contentWrapper}>
          <div style={styles.card}>
            <div style={styles.iconWrapper}>
              <FiZap size={24} />
            </div>

            <h2 style={styles.cardTitle}>
              What role are you aiming for?
            </h2>

            <p style={styles.cardDesc}>
              Tell our AI where you want to go, and it will map the exact
              path to get there based on your current skills.
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Target Role</label>
              <input
                type="text"
                placeholder="e.g. Senior Backend Engineer, Product Manager"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Experience Level</label>
              <input
                type="text"
                placeholder="e.g. Fresh Graduate, Junior, Mid-level"
                style={styles.input}
              />
            </div>

            <button style={styles.button}>
              Generate My Career Roadmap
            </button>

            <p style={styles.footerText}>
              Average generation time: under 5 seconds
            </p>
          </div>
        </div>
      </div>
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
    height: "88px",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee",
    boxSizing: "border-box"
  },

  pageTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    objectFit: "cover"
  },

  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#0f7c82",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700
  },

  roleLabel: {
    fontSize: 12,
    color: "#666"
  },

  contentWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "48px 24px"
  },

  card: {
    width: "100%",
    maxWidth: 700,
    background: "white",
    borderRadius: 20,
    padding: 40,
    border: "1px solid #eee",
    textAlign: "center"
  },

  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: "#eafaf7",
    color: "#0f7c82",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px"
  },

  cardTitle: {
    margin: 0,
    marginBottom: 12
  },

  cardDesc: {
    color: "#666",
    marginBottom: 30,
    lineHeight: 1.6
  },

  formGroup: {
    textAlign: "left",
    marginBottom: 18
  },

  label: {
    display: "block",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 600
  },

  input: {
    width: "100%",
    height: 48,
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "0 16px",
    boxSizing: "border-box"
  },

  button: {
    width: "100%",
    marginTop: 10,
    height: 52,
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "white",
    background: "linear-gradient(90deg, #8de2d3, #7c83ff)"
  },

  footerText: {
    marginTop: 20,
    fontSize: 12,
    color: "#999"
  }
};
