import React, {
  useEffect,
  useState,
} from "react";

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
import "./Dashboard2.css";

export default function CompanyDashboard() {
  const navigate = useNavigate();

  const [company, setCompany] =
    useState({});

  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  /* =========================
     COMPANY PROFILE
  ========================= */

  useEffect(() => {
    const loadProfile = () => {
      const profile = JSON.parse(
        localStorage.getItem(
          "companyProfile"
        ) || "{}"
      );

      setCompany(profile);
    };

    loadProfile();

    window.addEventListener(
      "companyProfileUpdated",
      loadProfile
    );

    return () => {
      window.removeEventListener(
        "companyProfileUpdated",
        loadProfile
      );
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
    "PT Pertamina Patra Niaga";

  const activePostings =
    jobs.filter(j => j.status === 'open').length;

  const totalApplicants =
    jobs.reduce(
      (total, job) =>
        total +
        (job.applicants || 0),
      0
    );

  const pendingReview = applicants.length;

  const positionsFilled =
    jobs.filter(
      (job) =>
        job.status === "closed"
    ).length;

  const stats = [
    {
      title: "Active Postings",
      value: activePostings,
      icon: <FiBriefcase />,
      color: "#10b981",
    },
    {
      title: "Total Applicants",
      value: totalApplicants,
      icon: <FiUsers />,
      color: "#6366f1",
    },
    {
      title: "Pending Review",
      value: pendingReview,
      icon: <FiClock />,
      color: "#f59e0b",
    },
    {
      title: "Positions Filled",
      value: positionsFilled,
      icon: <FiCheckCircle />,
      color: "#22c55e",
    },
  ];


  return (
    <div className="company-layout">
      <CompanySidebar active="dashboard" />

      <div className="company-main">
        <CompanyHeader title="Dashboard" />

        <div className="dashboard-content">
          {/* HEADER */}

          <div className="dashboard-top">
            <div>
              <h1
                style={{
                  marginBottom: 8,
                }}
              >
                Welcome, {companyName}
              </h1>

              <p
                style={{
                  color: "#64748b",
                }}
              >
                You have{" "}
                {activePostings} active
                job postings and{" "}
                {totalApplicants} total
                applicants.
              </p>
            </div>

            <button
              className="primary-btn"
              onClick={() =>
                navigate(
                  "/company/job-postings/create"
                )
              }
            >
              <FiPlusCircle />

              <span
                style={{
                  marginLeft: 8,
                }}
              >
                Create Job Posting
              </span>
            </button>
          </div>

          {/* STATS */}

          <div className="stats-grid">
            {stats.map((item) => (
              <div
                key={item.title}
                className="stat-card"
              >
                <div
                  className="stat-icon"
                  style={{
                    color:
                      item.color,
                    background:
                      item.color +
                      "15",
                  }}
                >
                  {item.icon}
                </div>

                <div>
                  <div className="stat-title">
                    {item.title}
                  </div>

                  <div className="stat-value">
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CONTENT */}

          <div className="content-grid">

            {/* ACTIVE JOBS */}

            <div>
              <div className="section-header">
                <h2>
                  Active Job Postings
                </h2>

                <span
                  className="section-link"
                  onClick={() =>
                    navigate(
                      "/company/job-postings"
                    )
                  }
                >
                  View All
                </span>
              </div>

              {jobs.length === 0 ? (
                <div className="empty-jobs">
                  No active job
                  postings yet.
                </div>
              ) : (
                <div className="jobs-grid">
                  {jobs
                    .slice(0, 4)
                    .map((job) => (
                      <div
                        key={
                          job.id
                        }
                        className="job-card"
                      >
                        <div
                          className="job-status"
                          style={job.status === 'closed' ? { background: '#fef2f2', color: '#dc2626' } : {}}
                        >
                          {job.status === 'closed' ? 'Closed' : 'Active'}
                        </div>

                        <h3>
                          {
                            job.title
                          }
                        </h3>

                        <div className="job-tags">
                          <span className="job-tag">
                            {
                              job.category
                            }
                          </span>

                          <span className="job-tag">
                            {
                              job.experienceLevel
                            }
                          </span>
                        </div>

                        <div className="job-footer">
                          <span>
                            {job.applicants ||
                              0}{" "}
                            Applicants
                          </span>

                          <span
                            className="section-link"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
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

            <div className="applicant-panel">
              <div className="section-header">
                <h2>
                  Recent Applicants
                </h2>

                <span className="section-link">
                  View All
                </span>
              </div>

              {applicants.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>No recent applicants.</div>
              ) : (
                applicants.map((applicant, index) => (
                  <div key={index} className="applicant-card">
                    <div className="applicant-avatar">
                      {(applicant.name || "U")[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong>{applicant.name}</strong>

                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {applicant.role || "Job Seeker"} - Applied for {applicant.job_title}
                      </div>
                    </div>

                    <div className="match-badge">
                      {applicant.match || 0}% Match
                    </div>
                  </div>
                ))
              )}

              <div
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: "#0f7c82",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => navigate('/company/job-postings')}
              >
                View All Jobs to Review
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}