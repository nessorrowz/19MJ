import { FiBell, FiSearch, FiMapPin, FiStar, FiClock, FiChevronRight } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";

export default function FindJobsPage() {
  const profile = JSON.parse(
    localStorage.getItem("candidateProfile") || "{}"
  );

  const jobs = [
    {
      title: "Senior Backend Engineer",
      company: "TechNova",
      location: "Remote",
      tags: ["Node.js", "AWS", "System Design"],
      time: "2d ago",
      screening: true
    },
    {
      title: "Product Designer",
      company: "DesignStudio",
      location: "San Francisco, CA",
      tags: ["Figma", "Prototyping", "User Research"],
      time: "5h ago"
    },
    {
      title: "Frontend Developer (React)",
      company: "WebFlow Inc.",
      location: "New York, NY",
      tags: ["React", "TypeScript", "Tailwind"],
      time: "1w ago",
      screening: true
    },
    {
      title: "Marketing Manager",
      company: "GrowthCo",
      location: "London, UK",
      tags: ["SEO", "Campaigns", "Analytics"],
      time: "3d ago"
    }
  ];

  return (
    <div style={styles.container}>
      <CandidateSidebar active="jobs" />

      <div style={styles.main}>
        <div style={styles.header}>
          <h2 style={styles.pageLabel}>Jobs</h2>

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

        <div style={styles.content}>
          <h1 style={styles.title}>Find Jobs</h1>
          <p style={styles.subtitle}>3,248 roles available — updated daily</p>

          <div style={styles.searchBox}>
            <div style={styles.searchInputWrap}>
              <FiSearch size={16} />
              <input
                style={styles.searchInput}
                placeholder="Search by title, skill, or keyword"
              />
            </div>

            <div style={styles.filterRow}>
              <input style={styles.filterInput} placeholder="Category" />
              <input style={styles.filterInput} placeholder="Level" />

              <div style={styles.locationWrap}>
                <FiMapPin size={14} />
                <input
                  style={styles.locationInput}
                  placeholder="Location"
                />
              </div>

              <button style={styles.searchBtn}>Search</button>
            </div>
          </div>

          <div style={styles.jobsGrid}>
            {jobs.map((job, index) => (
              <div key={index} style={styles.jobCard}>
                <div style={styles.jobTop}>
                  <div>
                    <h3 style={styles.jobTitle}>{job.title}</h3>
                    <p style={styles.jobMeta}>
                      {job.company} • {job.location}
                    </p>
                  </div>

                  <FiStar size={16} color="#94a3b8" />
                </div>

                <div style={styles.tagsWrap}>
                  {job.tags.map((tag) => (
                    <span key={tag} style={styles.tag}>
                      {tag}
                    </span>
                  ))}

                  {job.screening && (
                    <span style={styles.screeningTag}>
                      AI Screening
                    </span>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  <div style={styles.timeWrap}>
                    <FiClock size={12} />
                    {job.time}
                  </div>

                  <div style={styles.viewRole}>
                    View Role <FiChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  main: { flex: 1 },
  header: {
    height: 88,
    background: "white",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px"
  },
  pageLabel: { margin: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  avatar: { width: 40, height: 40, borderRadius: "50%" },
  roleLabel: { fontSize: 12, color: "#64748b" },
  avatarFallback: {
    width: 40, height: 40, borderRadius: "50%", background: "#0f7c82",
    display: "flex", alignItems: "center", justifyContent: "center", color: "white"
  },
  content: { padding: 32 },
  title: { marginBottom: 8 },
  subtitle: { color: "#64748b", marginTop: 0 },
  searchBox: {
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0",
    padding: 20, marginBottom: 24
  },
  searchInputWrap: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 14px", height: 48
  },
  searchInput: { border: "none", flex: 1, outline: "none" },
  filterRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto",
    gap: 12, marginTop: 14
  },
  filterInput: {
    height: 44, borderRadius: 10, border: "1px solid #e2e8f0", padding: "0 12px"
  },
  locationWrap: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 12px"
  },
  locationInput: { border: "none", outline: "none", flex: 1 },
  searchBtn: {
    border: "none", borderRadius: 10, background: "#0f7c82",
    color: "white", padding: "0 24px"
  },
  jobsGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20
  },
  jobCard: {
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20
  },
  jobTop: {
    display: "flex", justifyContent: "space-between", alignItems: "start"
  },
  jobTitle: { margin: 0, fontSize: 18 },
  jobMeta: { color: "#64748b", fontSize: 14 },
  tagsWrap: { display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" },
  tag: {
    background: "#f8fafc", border: "1px solid #e2e8f0",
    padding: "4px 8px", borderRadius: 20, fontSize: 12
  },
  screeningTag: {
    background: "#fff7ed", color: "#ea580c",
    padding: "4px 8px", borderRadius: 20, fontSize: 12
  },
  cardFooter: {
    display: "flex", justifyContent: "space-between", alignItems: "center"
  },
  timeWrap: {
    display: "flex", alignItems: "center", gap: 6,
    color: "#94a3b8", fontSize: 13
  },
  viewRole: {
    display: "flex", alignItems: "center", gap: 4,
    color: "#0f7c82", fontWeight: 600, cursor: "pointer"
  }
};
