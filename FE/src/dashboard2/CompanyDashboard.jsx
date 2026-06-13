import React, { useEffect, useState } from "react";
import {
  FiPlusCircle,
  FiBriefcase,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import api from "../utils/api";

export default function CompanyDashboard() {
  const navigate = useNavigate();

  const [company, setCompany] = useState({});
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  /* =========================
     COMPANY PROFILE
  ========================= */

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        setCompany({
          companyName: user.company_name || "",
          logo: user.logo || ""
        });
      } catch (err) {
        console.error("Failed to load company dashboard profile", err);
      }
    };

    fetchProfile();
    window.addEventListener("companyProfileUpdated", fetchProfile);
    return () => {
      window.removeEventListener("companyProfileUpdated", fetchProfile);
    };
  }, []);

  /* =========================
     JOB POSTINGS & APPLICANTS
  ========================= */

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          api.get("/jobs/company"),
          api.get("/jobs/company/applications/recent")
        ]);

        if (jobsRes.status === "fulfilled") {
          const formattedJobs = jobsRes.value.map(job => ({
            id: job.id,
            title: job.title,
            category: job.type || '',
            experienceLevel: job.experience_level || '',
            applicants: parseInt(job.applicants_count) || 0,
            status: job.status || 'open'
          }));
          setJobs(formattedJobs);
        }

        if (appsRes.status === "fulfilled") {
          setApplicants(appsRes.value);
        }
      } catch (err) {
        console.error("Failed to load company dashboard data", err);
      }
    };

    loadData();
    window.addEventListener("jobPostingUpdated", loadData);
    return () => {
      window.removeEventListener("jobPostingUpdated", loadData);
    };
  }, []);

  /* =========================
     COMPUTED VALUES
  ========================= */

  const companyName =
    company.companyName ||
    JSON.parse(localStorage.getItem('currentUser') || '{}').company_name ||
    "Your Company";

  const activePostings = jobs.filter(j => j.status === 'open').length;
  const totalApplicants = jobs.reduce((total, job) => total + (job.applicants || 0), 0);
  const pendingReview = applicants.length;
  const positionsFilled = jobs.filter(job => job.status === "closed").length;

  const statsData = [
    { title: "Active Postings", value: activePostings, icon: <FiBriefcase />, color: "#10b981" },
    { title: "Total Applicants", value: totalApplicants, icon: <FiUsers />, color: "#6366f1" },
    { title: "Pending Review", value: pendingReview, icon: <FiClock />, color: "#f59e0b" },
    { title: "Positions Filled", value: positionsFilled, icon: <FiCheckCircle />, color: "#22c55e" },
  ];


  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  return (
    <div style={styles.container}>
      <CompanySidebar active="dashboard" />

      <div style={styles.main}>
        <CompanyHeader title="Dashboard" />

        {/* GREETING CARD */}
        <div style={styles.greetingCard}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
              {greeting}, {companyName}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", marginTop: 8, fontSize: 16 }}>
              You have {activePostings} active job postings and {totalApplicants} total applicants.
            </p>
          </div>

          <button
            onClick={() => navigate("/company/job-postings/create")}
            style={styles.outlineButton}
          >
            <FiPlusCircle size={16} />
            <span>Create Job Posting</span>
          </button>
        </div>

        {/* STATS */}
        <div style={styles.statsGrid}>
          {statsData.map((item) => (
            <div key={item.title} style={styles.statCard}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: item.color + "15", color: item.color,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {React.cloneElement(item.icon, { size: 20 })}
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={styles.contentGrid}>

          {/* ACTIVE JOBS */}
          <div>
            <div style={styles.sectionHeader}>
              <h2 style={{ margin: 0 }}>Active Job Postings</h2>
              <span style={styles.sectionLink} onClick={() => navigate("/company/job-postings")}>
                View All
              </span>
            </div>

            {jobs.length === 0 ? (
              <div style={styles.emptyState}>No active job postings yet.</div>
            ) : (
              <div style={styles.jobsGrid}>
                {jobs.slice(0, 4).map((job) => (
                  <div key={job.id} style={styles.jobCard}>
                    <div style={{
                      ...styles.jobStatus,
                      ...(job.status === 'closed' ? { background: '#fef2f2', color: '#dc2626' } : {})
                    }}>
                      {job.status === 'closed' ? 'Closed' : 'Active'}
                    </div>

                    <h3 style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 700 }}>{job.title}</h3>

                    <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                      <span style={styles.jobTag}>{job.category}</span>
                      <span style={styles.jobTag}>{job.experienceLevel}</span>
                    </div>

                    <div style={styles.jobFooter}>
                      <span style={{ color: "#64748b", fontSize: 14 }}>
                        {job.applicants || 0} Applicants
                      </span>
                      <span
                        style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: "#0f7c82", fontWeight: 600, fontSize: 14 }}
                        onClick={() => navigate('/company/job-postings')}
                      >
                        View <FiArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* APPLICANTS */}
          <div style={styles.applicantPanel}>
            <div style={styles.sectionHeader}>
              <h2 style={{ margin: 0 }}>Recent Applicants</h2>
              <span style={styles.sectionLink}>View All</span>
            </div>

            {applicants.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>No recent applicants.</div>
            ) : (
              applicants.map((applicant, index) => (
                <div key={index} style={styles.applicantCard}>
                  <div style={styles.applicantAvatar}>
                    {(applicant.name || "U")[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <strong>{applicant.name}</strong>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      {applicant.role || "Job Seeker"} - Applied for {applicant.job_title}
                    </div>
                  </div>

                  <div style={styles.matchBadge}>
                    {applicant.match || 0}% Match
                  </div>
                </div>
              ))
            )}

            <div
              style={{
                textAlign: "center", marginTop: 20,
                color: "#0f7c82", fontWeight: 600, cursor: "pointer",
              }}
              onClick={() => navigate('/company/job-postings')}
            >
              View All Jobs to Review
            </div>
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

  outlineButton: {
    border: "none",
    background: "white",
    color: "#0f7c82",
    padding: "12px 20px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    padding: "0 30px",
    marginBottom: 30
  },

  statCard: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    gap: 16,
    alignItems: "center"
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24,
    padding: "0 30px 30px"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },

  sectionLink: {
    color: "#0f7c82",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14
  },

  jobsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20
  },

  jobCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    position: "relative"
  },

  jobStatus: {
    position: "absolute",
    top: 16,
    right: 16,
    background: "#dcfce7",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600
  },

  jobTag: {
    background: "#eef2f7",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    color: "#64748b"
  },

  jobFooter: {
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  emptyState: {
    background: "white",
    borderRadius: 16,
    padding: 60,
    textAlign: "center",
    color: "#64748b"
  },

  applicantPanel: {
    background: "white",
    borderRadius: 16,
    padding: 20
  },

  applicantCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 0",
    borderBottom: "1px solid #f1f5f9"
  },

  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 14
  },

  matchBadge: {
    background: "#dcfce7",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600
  }
};