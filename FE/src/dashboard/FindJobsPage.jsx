import React, { useState, useEffect, useMemo } from "react";
import { FiSearch, FiMapPin, FiClock, FiChevronRight, FiCheckCircle, FiBriefcase, FiLoader } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import api from "../utils/api";

export default function FindJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        const formatted = res.map(j => {
          let parsedSkills = [];
          try {
            parsedSkills = typeof j.skills === 'string' ? JSON.parse(j.skills || '[]') : (j.skills || []);
          } catch (e) {
            parsedSkills = [];
          }

          return {
            id: j.id,
            title: j.title,
            company: j.company_name || 'Unknown Company',
            location: j.location || 'Remote',
            type: j.type || '',
            experienceLevel: j.experience_level || '',
            description: j.description || '',
            tags: parsedSkills,
            time: j.created_at ? formatTimeAgo(j.created_at) : '',
            hasApplied: j.has_applied > 0
          };
        });
        setJobs(formatted);
      } catch (err) {
        console.error('Failed to fetch jobs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch = !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = !categoryFilter ||
        (job.type || '').toLowerCase().includes(categoryFilter.toLowerCase());

      const matchLevel = !levelFilter ||
        (job.experienceLevel || '').toLowerCase().includes(levelFilter.toLowerCase());

      const matchLocation = !locationFilter ||
        (job.location || '').toLowerCase().includes(locationFilter.toLowerCase());

      return matchSearch && matchCategory && matchLevel && matchLocation;
    });
  }, [jobs, search, categoryFilter, levelFilter, locationFilter]);

  const handleApply = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/apply`);
      alert("Successfully applied to the job!");
      setJobs(jobs.map(j => j.id === jobId ? { ...j, hasApplied: true } : j));
    } catch (err) {
      alert(err.message || 'Failed to apply');
    }
  };

  return (
    <div style={styles.container}>
      <CandidateSidebar active="jobs" />

      <div style={styles.main}>
        <CandidateHeader title="Jobs" />

        <div style={styles.content}>
          <h1 style={styles.title}>Find Jobs</h1>
          <p style={styles.subtitle}>
            {loading ? "Loading jobs..." : `${filteredJobs.length} roles available`}
          </p>

          {/* SEARCH & FILTER */}
          <div style={styles.searchBox}>
            <div style={styles.searchInputWrap}>
              <FiSearch size={16} color="#94a3b8" />
              <input
                style={styles.searchInput}
                placeholder="Search by title, company, or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={styles.filterRow}>
              <select
                style={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>

              <select
                style={styles.filterSelect}
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="">All Levels</option>
                <option value="Entry">Entry Level</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior</option>
              </select>

              <div style={styles.locationWrap}>
                <FiMapPin size={14} color="#94a3b8" />
                <input
                  style={styles.locationInput}
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>

              <button
                style={styles.clearBtn}
                onClick={() => { setSearch(""); setCategoryFilter(""); setLevelFilter(""); setLocationFilter(""); }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div style={styles.emptyState}>
              <FiLoader size={32} color="#0f7c82" style={{ animation: "spin 1s linear infinite" }} />
              <p>Loading available jobs...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredJobs.length === 0 && (
            <div style={styles.emptyState}>
              <FiBriefcase size={40} color="#cbd5e1" />
              <h3 style={{ color: "#475569", margin: "16px 0 8px" }}>No jobs found</h3>
              <p style={{ color: "#94a3b8", margin: 0 }}>
                {jobs.length === 0
                  ? "No companies have posted any job openings yet."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          )}

          {/* JOBS GRID */}
          {!loading && filteredJobs.length > 0 && (
            <div style={styles.jobsGrid}>
              {filteredJobs.map((job) => (
                <div key={job.id} style={styles.jobCard}>
                  <div style={styles.jobTop}>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.jobTitle}>{job.title}</h3>
                      <p style={styles.jobMeta}>
                        {job.company} • {job.location}
                      </p>
                    </div>

                    {job.hasApplied && (
                      <span style={styles.appliedBadge}>
                        <FiCheckCircle size={12} /> Applied
                      </span>
                    )}
                  </div>

                  {/* Type & Level badges */}
                  <div style={styles.badgeRow}>
                    {job.type && (
                      <span style={styles.typeBadge}>{job.type}</span>
                    )}
                    {job.experienceLevel && (
                      <span style={styles.levelBadge}>{job.experienceLevel}</span>
                    )}
                  </div>

                  {/* Description preview */}
                  {job.description && (
                    <p style={styles.descPreview}>
                      {job.description.length > 120
                        ? job.description.substring(0, 120) + "..."
                        : job.description}
                    </p>
                  )}

                  {/* Skill tags */}
                  {job.tags.length > 0 && (
                    <div style={styles.tagsWrap}>
                      {job.tags.slice(0, 5).map((tag) => (
                        <span key={tag} style={styles.tag}>{tag}</span>
                      ))}
                      {job.tags.length > 5 && (
                        <span style={styles.moreTag}>+{job.tags.length - 5}</span>
                      )}
                    </div>
                  )}

                  <div style={styles.cardFooter}>
                    <div style={styles.timeWrap}>
                      <FiClock size={12} />
                      {job.time}
                    </div>

                    {job.hasApplied ? (
                      <div style={{ ...styles.viewRole, color: "#64748b", cursor: "default" }}>
                        Applied <FiCheckCircle size={14} />
                      </div>
                    ) : (
                      <div
                        style={styles.viewRole}
                        onClick={() => handleApply(job.id)}
                      >
                        Apply Now <FiChevronRight size={14} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: format "2 days ago" style
function formatTimeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = {
  container: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  main: { flex: 1, overflow: "auto" },
  content: { padding: 32 },
  title: { marginBottom: 8, fontSize: 26, fontWeight: 700, color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 0, fontSize: 14, marginBottom: 24 },
  searchBox: {
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0",
    padding: 20, marginBottom: 24
  },
  searchInputWrap: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 14px", height: 48
  },
  searchInput: { border: "none", flex: 1, outline: "none", fontSize: 14 },
  filterRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto",
    gap: 12, marginTop: 14
  },
  filterSelect: {
    height: 44, borderRadius: 10, border: "1px solid #e2e8f0", padding: "0 12px",
    fontSize: 14, color: "#334155", background: "white", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "14px",
    paddingRight: "32px"
  },
  locationWrap: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 12px"
  },
  locationInput: { border: "none", outline: "none", flex: 1, fontSize: 14 },
  clearBtn: {
    border: "1px solid #e2e8f0", borderRadius: 10, background: "white",
    color: "#64748b", padding: "0 20px", cursor: "pointer", fontWeight: 500, fontSize: 14
  },
  emptyState: {
    textAlign: "center", padding: "60px 20px",
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0"
  },
  jobsGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20
  },
  jobCard: {
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24,
    transition: "box-shadow 0.2s, border-color 0.2s",
    cursor: "default"
  },
  jobTop: {
    display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12
  },
  jobTitle: { margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" },
  jobMeta: { color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 0 },
  appliedBadge: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#dcfce7", color: "#16a34a",
    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
    whiteSpace: "nowrap", flexShrink: 0
  },
  badgeRow: {
    display: "flex", gap: 8, marginTop: 12
  },
  typeBadge: {
    background: "#eff6ff", color: "#3b82f6", border: "1px solid #dbeafe",
    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6
  },
  levelBadge: {
    background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a",
    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6
  },
  descPreview: {
    color: "#64748b", fontSize: 13, lineHeight: 1.5,
    marginTop: 12, marginBottom: 0
  },
  tagsWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 },
  tag: {
    background: "#f1f5f9", color: "#475569",
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500
  },
  moreTag: {
    background: "#e2e8f0", color: "#64748b",
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600
  },
  cardFooter: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9"
  },
  timeWrap: {
    display: "flex", alignItems: "center", gap: 6,
    color: "#94a3b8", fontSize: 12
  },
  viewRole: {
    display: "flex", alignItems: "center", gap: 4,
    color: "#0f7c82", fontWeight: 600, cursor: "pointer", fontSize: 14
  }
};
