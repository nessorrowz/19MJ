import { FiBell, FiMic, FiZap } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";

export default function InterviewPracticePage() {
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const profileStorageKey =
    `candidateProfile_${currentUser.email}`;

  const profile = JSON.parse(
    localStorage.getItem(profileStorageKey) || "{}"
  );

  const sessions = [
    {
      id: "#04",
      date: "Today",
      role: "Software Engineering (Mid)",
      score: 76
    },
    {
      id: "#03",
      date: "Yesterday",
      role: "Behavioral",
      score: 91
    }
  ];

  return (
    <div style={styles.container}>
      <CandidateSidebar active="practice" />

      <div style={styles.main}>
        {/* HEADER */}
        <div style={styles.header}>
          <h2 style={styles.pageLabel}>Practice</h2>

          <div style={styles.headerRight}>
            <FiBell size={18} />

            {profile.photo ? (
              <img src={profile.photo} alt="profile" style={styles.avatar} />
            ) : (
              <div style={styles.avatarFallback}>
                {(profile.fullName || "U")[0]}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600 }}>
                {profile.fullName || "User"}
              </div>
              <div style={styles.roleLabel}>Job Seeker</div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={styles.content}>
          <div style={styles.titleRow}>
            <FiMic size={30} />
            <h1 style={styles.title}>Interview Practice</h1>
          </div>

          <p style={styles.subtitle}>
            Practice answering real interview questions and get AI feedback on every answer.
          </p>

          {/* STATS */}
          <div style={styles.statsGrid}>
            <StatCard label="SESSIONS THIS MONTH" value="4" />
            <StatCard label="AVERAGE SCORE" value="76 / 100" />
            <StatCard label="BEST PERFORMANCE" value="91 / 100" />
          </div>

          {/* PRACTICE CARD */}
          <div style={styles.practiceCard}>
            <h3 style={{ marginTop: 0 }}>
              Start a New Practice Session
            </h3>

            <div style={styles.formRow}>
              <input
                style={styles.input}
                placeholder="e.g Software Engineer"
              />

              <input
                style={styles.input}
                placeholder="e.g Mid-level"
              />
            </div>

            <button style={styles.button}>
              <FiZap />
              Generate Question & Start
            </button>
          </div>

          {/* TABLE */}
          <h3>Past Sessions</h3>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Role</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    style={styles.tableRow}
                  >
                    <td>{session.id}</td>

                    <td>{session.date}</td>

                    <td>{session.role}</td>

                    <td>
                      <span
                        style={{
                          ...styles.scorePill,
                          background:
                            session.score >= 90
                              ? "#bbf7d0"
                              : "#fde68a"
                        }}
                      >
                        {session.score}
                      </span>
                    </td>

                    <td style={styles.reviewBtn}>
                      Review
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>
        {label}
      </div>

      <div style={styles.statValue}>
        {value}
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
    height: 88,
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee"
  },

  pageLabel: {
    margin: 0
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%"
  },

  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f7c82",
    color: "white"
  },

  roleLabel: {
    fontSize: 12,
    color: "#666"
  },

  content: {
    padding: 32
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },

  title: {
    margin: 0
  },

  subtitle: {
    color: "#5b6b84"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 16,
    margin: "24px 0"
  },

  statCard: {
    background: "white",
    borderRadius: 14,
    padding: 24,
    border: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between"
  },

  statLabel: {
    fontSize: 14,
    color: "#5b6b84"
  },

  statValue: {
    fontWeight: 700,
    fontSize: 28
  },

  practiceCard: {
    background: "#f8fdfc",
    border: "1px solid #e5efed",
    borderRadius: 16,
    padding: 28,
    marginBottom: 28
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 20
  },

  input: {
    height: 48,
    borderRadius: 10,
    border: "1px solid #ddd",
    padding: "0 16px"
  },

  button: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 48,
    border: "none",
    borderRadius: 12,
    color: "white",
    padding: "0 20px",
    cursor: "pointer",
    background:
      "linear-gradient(90deg, #0f7c82, #6b6dfd)"
  },

  tableWrapper: {
    background: "white",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #eee"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  tableHead: {
    background: "#f8fafc"
  },

  tableRow: {
    height: 64,
    borderTop: "1px solid #f1f5f9"
  },

  scorePill: {
    color: "#0a7a4b",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 12
  },

  reviewBtn: {
    color: "#0f7c82",
    cursor: "pointer",
    fontWeight: 600
  }
};