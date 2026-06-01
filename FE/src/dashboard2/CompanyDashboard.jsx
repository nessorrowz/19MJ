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
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function CompanyDashboard() {
  const navigate = useNavigate();

  const [company, setCompany] =
    useState({});

  const [jobs, setJobs] =
    useState([]);

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
     JOB POSTINGS
  ========================= */

  useEffect(() => {
    const loadJobs = () => {
      const storedJobs =
        JSON.parse(
          localStorage.getItem(
            "jobPostings"
          ) || "[]"
        );

      setJobs(storedJobs);
    };

    loadJobs();

    window.addEventListener(
      "jobPostingUpdated",
      loadJobs
    );

    return () => {
      window.removeEventListener(
        "jobPostingUpdated",
        loadJobs
      );
    };
  }, []);

  /* =========================
     COMPUTED VALUES
  ========================= */

  const companyName =
    company.companyName ||
    "PT Pertamina Patra Niaga";

  const activePostings =
    jobs.length;

  const totalApplicants =
    jobs.reduce(
      (total, job) =>
        total +
        (job.applicants || 0),
      0
    );

  const pendingReview =
    jobs.filter(
      (job) =>
        job.status === "Pending"
    ).length;

  const positionsFilled =
    jobs.filter(
      (job) =>
        job.status === "Closed"
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

  const applicants = [
    {
      name: "Muhamad Arrayyan",
      role: "Backend Engineer",
      match: 92,
    },
    {
      name: "Sarah Jenkins",
      role: "Product Designer",
      match: 85,
    },
    {
      name: "David Chen",
      role: "Backend Engineer",
      match: 71,
    },
    {
      name: "Elena Rostova",
      role: "Marketing Manager",
      match: 88,
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
                        <div className="job-status">
                          Active
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
                          >
                            View →
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

              {applicants.map(
                (
                  applicant,
                  index
                ) => (
                  <div
                    key={index}
                    className="applicant-card"
                  >
                    <div className="applicant-avatar">
                      {
                        applicant
                          .name[0]
                      }
                    </div>

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <strong>
                        {
                          applicant.name
                        }
                      </strong>

                      <div
                        style={{
                          color:
                            "#64748b",
                          fontSize: 13,
                        }}
                      >
                        {
                          applicant.role
                        }
                      </div>
                    </div>

                    <div className="match-badge">
                      {
                        applicant.match
                      }
                      %
                    </div>
                  </div>
                )
              )}

              <div
                style={{
                  textAlign:
                    "center",
                  marginTop: 20,
                  color:
                    "#0f7c82",
                  fontWeight: 600,
                }}
              >
                Review Pending (
                {pendingReview})
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}