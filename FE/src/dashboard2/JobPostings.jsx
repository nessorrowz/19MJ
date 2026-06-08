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
  FiArrowRight,
} from "react-icons/fi";
import api from "../utils/api";

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function JobPostings() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [jobToClose, setJobToClose] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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

  const loadJobs = async () => {
    try {
      const response = await api.get("/jobs/company");
      // Format backend data to match frontend requirements
      const formattedJobs = response.map(job => ({
        id: job.id,
        title: job.title,
        category: job.type, // Map type to category
        location: job.location,
        experienceLevel: job.experience_level,
        employmentType: job.type,
        createdAt: job.created_at,
        applicants: job.applicants_count,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills ? (typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills) : [],
        salaryRange: job.salary_range,
        status: job.status || 'open'
      }));
      setJobs(formattedJobs);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    }
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

  const handleCloseAction = (job) => {
    setJobToClose(job);
    setOpenMenuId(null);
  };

  const confirmCloseJob = async () => {
    if (!jobToClose) return;
    try {
      await api.put(`/jobs/${jobToClose.id}/close`);
      alert("Job posting closed successfully.");
      loadJobs();
      if (selectedJob && selectedJob.id === jobToClose.id) {
        setSelectedJob({ ...selectedJob, status: 'closed' });
      }
    } catch(err) {
      alert("Failed to close job: " + err.message);
    }
    setJobToClose(null);
  };

  const handleEditAction = (job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title || "",
      location: job.location || "",
      type: job.employmentType || "",
      experience_level: job.experienceLevel || "",
      salary_range: job.salaryRange || "",
      description: job.description || "",
      requirements: job.requirements || "",
      skills: job.skills ? job.skills.join(", ") : ""
    });
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        ...editForm,
        skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.put(`/jobs/${editingJob.id}`, payload);
      alert("Job updated successfully.");
      loadJobs();
      if (selectedJob && selectedJob.id === editingJob.id) {
        setSelectedJob({
          ...selectedJob,
          ...payload,
          employmentType: payload.type,
          experienceLevel: payload.experience_level,
          salaryRange: payload.salary_range
        });
      }
      setEditingJob(null);
    } catch(err) {
      alert("Failed to update job: " + err.message);
    }
  };

  return (
    <div className="company-layout">
      <CompanySidebar active="jobs" />

      <div className="company-main">
        <CompanyHeader title="Jobs" />

        <div className="dashboard-content">
          {!selectedJob ? (
            <>
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

                  <div style={{ position: 'relative' }}>
                    <FiMoreHorizontal 
                      style={{ cursor: 'pointer', padding: 4 }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === job.id ? null : job.id);
                      }}
                    />
                    
                    {openMenuId === job.id && (
                      <div style={{ 
                        position: 'absolute', right: 0, top: 24, background: 'white', 
                        border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 10, width: 120, overflow: 'hidden'
                      }}>
                        <div 
                          style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          onClick={(e) => { e.stopPropagation(); handleEditAction(job); }}
                        >
                          Edit Job
                        </div>
                        {job.status === 'open' ? (
                          <div 
                            style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: '#ef4444' }}
                            onClick={(e) => { e.stopPropagation(); handleCloseAction(job); }}
                          >
                            Close Job
                          </div>
                        ) : (
                          <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>
                            Closed
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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

                  <button className="view-details-btn" onClick={() => setSelectedJob(job)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    View Details <FiArrowRight />
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
            </>
          ) : (
            <div className="job-detail-view" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="detail-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <button 
                  className="back-btn" 
                  onClick={() => setSelectedJob(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}
                >
                  &larr; Back to Job Postings
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => handleEditAction(selectedJob)} className="outline-button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                    Edit Job
                  </button>
                  {selectedJob.status === 'open' ? (
                    <button onClick={() => handleCloseAction(selectedJob)} className="danger-button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}>
                      Close Job
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#64748b' }}>
                      Job Closed
                    </div>
                  )}
                </div>
              </div>              <div className="job-detail-card" style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: 28, color: '#0f172a' }}>{selectedJob.title}</h1>
                    <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 15, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiMapPin /> {selectedJob.location || 'Remote'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiBriefcase /> {selectedJob.employmentType || 'Full-time'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiCalendar /> Posted {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#0f7c82' }}>{selectedJob.applicants || 0}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>Total Applicants</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
                  <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 20, fontSize: 14 }}>{selectedJob.category || 'General'}</span>
                  <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 20, fontSize: 14 }}>{selectedJob.experienceLevel || 'Mid Level'}</span>
                  {selectedJob.salaryRange && (
                    <span style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: 20, fontSize: 14 }}>{selectedJob.salaryRange}</span>
                  )}
                </div>

                <div className="detail-section" style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 12, color: '#1e293b' }}>Job Description</h3>
                  <div style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedJob.description || 'No description provided for this job posting.'}
                  </div>
                </div>

                <div className="detail-section" style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 12, color: '#1e293b' }}>Requirements</h3>
                  <div style={{ color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedJob.requirements || 'No specific requirements listed.'}
                  </div>
                </div>

                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <div className="detail-section">
                    <h3 style={{ fontSize: 18, marginBottom: 12, color: '#1e293b' }}>Required Skills</h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {selectedJob.skills.map((skill, idx) => (
                        <span key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingJob && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: 20, boxSizing: 'border-box' 
        }}>
          <div style={{ 
            background: 'white', borderRadius: 20, padding: 32, width: '100%', 
            maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
          }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: 24, color: '#0f172a' }}>Edit Job Posting</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Job Title</label>
                <input value={editForm.title} onChange={e=>setEditForm({...editForm, title: e.target.value})} placeholder="e.g. Senior Frontend Developer" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s'}} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Location</label>
                  <input value={editForm.location} onChange={e=>setEditForm({...editForm, location: e.target.value})} placeholder="e.g. Jakarta, Indonesia (Remote)" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Employment Type</label>
                  <input value={editForm.type} onChange={e=>setEditForm({...editForm, type: e.target.value})} placeholder="e.g. Full-time, Contract" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Experience Level</label>
                  <input value={editForm.experience_level} onChange={e=>setEditForm({...editForm, experience_level: e.target.value})} placeholder="e.g. Mid-Senior Level" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Salary Range</label>
                  <input value={editForm.salary_range} onChange={e=>setEditForm({...editForm, salary_range: e.target.value})} placeholder="e.g. Rp 15M - Rp 25M" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Skills (comma separated)</label>
                  <input value={editForm.skills} onChange={e=>setEditForm({...editForm, skills: e.target.value})} placeholder="e.g. React, Node.js, TypeScript" style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none'}} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Description</label>
                <textarea value={editForm.description} onChange={e=>setEditForm({...editForm, description: e.target.value})} placeholder="What does this role entail?" rows={5} style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none'}} />
              </div>
              
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Requirements</label>
                <textarea value={editForm.requirements} onChange={e=>setEditForm({...editForm, requirements: e.target.value})} placeholder="What are the requirements for this role?" rows={5} style={{padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none'}} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 32, borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
              <button onClick={() => setEditingJob(null)} style={{ padding: '12px 28px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', transition: 'all 0.2s' }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#0f7c82', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 124, 130, 0.3)' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {jobToClose && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: 20, boxSizing: 'border-box' 
        }}>
          <div style={{ 
            background: 'white', borderRadius: 20, padding: 32, width: '100%', 
            maxWidth: 480, textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ background: '#fef2f2', color: '#ef4444', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
              <FiBriefcase />
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', fontSize: 24, color: '#0f172a' }}>Close Job Posting?</h3>
            <p style={{ color: '#64748b', margin: '0 0 32px 0', lineHeight: 1.6 }}>
              Are you sure you want to close the <strong style={{color:'#0f172a'}}>{jobToClose.title}</strong> job posting? 
              Once closed, candidates will no longer be able to submit new applications. This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={() => setJobToClose(null)} style={{ padding: '12px 28px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', transition: 'all 0.2s', flex: 1 }}>
                Cancel
              </button>
              <button onClick={confirmCloseJob} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)', flex: 1 }}>
                Close Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}