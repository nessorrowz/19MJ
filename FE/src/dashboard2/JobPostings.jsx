import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiBriefcase,
  FiUsers,
  FiEye,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiChevronDown,
  FiMoreHorizontal,
} from "react-icons/fi";

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function JobPostings() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
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

  const loadJobs = () => {
    const data = JSON.parse(
      localStorage.getItem("jobPostings") || "[]"
    );

    setJobs(data);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) =>
      (job.title || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [jobs, search]);

  const totalApplicants = jobs.reduce(
    (sum, job) => sum + (job.applicants || 0),
    0
  );

  return (
    <div className="company-layout">
      <CompanySidebar active="jobs" />

      <div className="company-main">
        <CompanyHeader title="Jobs" />

        <div className="dashboard-content">
          {/* PAGE HEADER */}

          <div className="jobs-page-header">
            <div>
              <h1>Job Postings</h1>

              <p>
                Manage your active listings and
                track candidate pipelines.
              </p>
            </div>

            <button
              className="create-job-btn"
              onClick={() =>
                navigate(
                  "/company/job-postings/create"
                )
              }
            >
              <FiPlus />
              Create Job Posting
            </button>
          </div>

          {/* STATS */}

          <div className="jobs-stats">
            <div className="jobs-stat-card">
              <div className="stat-icon green">
                <FiBriefcase />
              </div>

              <div>
                <span>Active Postings</span>
                <h2>{jobs.length}</h2>
              </div>
            </div>

            <div className="jobs-stat-card">
              <div className="stat-icon blue">
                <FiUsers />
              </div>

              <div>
                <span>Total Applicants</span>
                <h2>{totalApplicants}</h2>
              </div>
            </div>

            <div className="jobs-stat-card">
              <div className="stat-icon orange">
                <FiEye />
              </div>

              <div>
                <span>Total Views</span>
                <h2>1.2k</h2>
              </div>
            </div>
          </div>

          {/* TOOLBAR */}

          <div className="jobs-toolbar">
            <h2>Active Job Postings</h2>

            <div className="jobs-actions">
              <div className="jobs-search">
                <FiSearch />

                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <button className="field-btn">
                All Fields
                <FiChevronDown />
              </button>
            </div>
          </div>

          {/* JOB LIST */}

          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="job-card"
              >
                <div className="job-card-top">
                  <div>
                    <h3>
                      {job.title ||
                        "Untitled Job"}
                    </h3>

                    <div className="job-badges">
                      <span>
                        {job.category ||
                          "General"}
                      </span>

                      <span>
                        {job.experienceLevel}
                      </span>
                    </div>
                  </div>

                  <FiMoreHorizontal />
                </div>

                <div className="job-info">
                  <div>
                    <FiMapPin />
                    <span>
                      {job.location ||
                        "Remote"}
                      {" • "}
                      {
                        job.employmentType
                      }
                    </span>
                  </div>

                  <div>
                    <FiCalendar />
                    <span>
                      Posted{" "}
                      {job.createdAt
                        ? new Date(
                            job.createdAt
                          ).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="job-card-footer">
                  <div className="applicant-badge">
                    {job.applicants || 0}
                  </div>

                  <span className="applicant-text">
                    Applicants
                  </span>

                  <button className="view-details-btn">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="empty-jobs">
              No job postings found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}