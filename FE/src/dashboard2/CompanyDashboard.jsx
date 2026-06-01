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

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function CompanyDashboard() {
  const [company, setCompany] =
    useState({});

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

  const companyName =
    company.companyName ||
    "PT Pertamina Patra Niaga";

  const stats = [
    {
      title: "Active Postings",
      value: 3,
      icon: <FiBriefcase />,
      color: "#10b981",
    },
    {
      title: "Total Applicants",
      value: 47,
      icon: <FiUsers />,
      color: "#6366f1",
    },
    {
      title: "Pending Review",
      value: 12,
      icon: <FiClock />,
      color: "#f59e0b",
    },
    {
      title: "Positions Filled",
      value: 2,
      icon: <FiCheckCircle />,
      color: "#22c55e",
    },
  ];

  const jobs = [
    {
      title: "Senior Backend Engineer",
      category: "Engineering",
      level: "Senior",
      applicants: 14,
    },
    {
      title: "Product Designer",
      category: "Design",
      level: "Mid Level",
      applicants: 22,
    },
    {
      title: "Marketing Manager",
      category: "Marketing",
      level: "Senior",
      applicants: 11,
    },
    {
      title: "Frontend Developer",
      category: "Engineering",
      level: "Junior",
      applicants: 8,
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
          {/* WELCOME */}

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
                You have 3 active job postings
                and 12 new applicants.
              </p>
            </div>

            <button className="primary-btn">
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
                    color: item.color,
                    background:
                      item.color + "15",
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

                <span className="section-link">
                  View All
                </span>
              </div>

              <div className="jobs-grid">
                {jobs.map(
                  (job, index) => (
                    <div
                      key={index}
                      className="job-card"
                    >
                      <div className="job-status">
                        Active
                      </div>

                      <h3>
                        {job.title}
                      </h3>

                      <div className="job-tags">
                        <span className="job-tag">
                          {
                            job.category
                          }
                        </span>

                        <span className="job-tag">
                          {job.level}
                        </span>
                      </div>

                      <div className="job-footer">
                        <span>
                          {
                            job.applicants
                          }{" "}
                          Applicants
                        </span>

                        <span
                          className="section-link"
                        >
                          View →
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
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
                        applicant.name[0]
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
                  textAlign: "center",
                  marginTop: 20,
                  color: "#0f7c82",
                  fontWeight: 600,
                }}
              >
                Review Pending (12)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}