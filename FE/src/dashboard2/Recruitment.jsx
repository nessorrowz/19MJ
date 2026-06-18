import React, { useState, useEffect } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiClock,
  FiSearch,
  FiChevronRight,
  FiChevronLeft,
  FiMapPin,
  FiMail,
  FiPhone,
  FiStar,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiVideo,
  FiArrowRight,
  FiChevronDown,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import api from "../utils/api";
import "./Dashboard2.css";

// No dummy data needed, everything is fetched from API.

export default function Recruitment() {
  const navigate = useNavigate();
  const [view, setView] = useState("overview"); // overview | applicants | detail
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateTab, setCandidateTab] = useState("overview");
  const [candidateStatus, setCandidateStatus] = useState("PENDING REVIEW");
  const [filter, setFilter] = useState("All");
  const [searchJob, setSearchJob] = useState("");
  const [searchApplicant, setSearchApplicant] = useState("");
  const [sortBy, setSortBy] = useState("Score");
  const [showSort, setShowSort] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [expandedTranscript, setExpandedTranscript] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  const totalCandidates = jobs.reduce((s, j) => s + j.total, 0);
  const totalNew = jobs.reduce((s, j) => s + j.newCount, 0);
  const totalPending = 0;
  
  useEffect(() => {
    // Fetch Jobs
    const fetchJobs = async () => {
      try {
        const res = await api.get("/jobs/company");
        setJobs(res.map(j => ({
          id: j.id,
          title: j.title,
          category: j.type || "General",
          total: Number(j.applicants_count) || 0,
          newCount: Number(j.new_count) || 0,
          shortlisted: Number(j.shortlisted_count) || 0,
        })));
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  const openApplicants = async (job) => { 
    setSelectedJob(job); 
    setView("applicants"); 
    setFilter("All"); 
    
    // Fetch applicants for this job
    try {
      const res = await api.get(`/jobs/${job.id}/applications`);
      setApplicants(res.map(a => {
        const parsedSkills = a.candidate_skills ? (typeof a.candidate_skills === 'string' ? JSON.parse(a.candidate_skills || '[]') : a.candidate_skills) : [];
        const parsedExperiences = a.experiences ? (typeof a.experiences === 'string' ? JSON.parse(a.experiences || '[]') : a.experiences) : [];
        
        let cvAnalysis = {};
        try {
          cvAnalysis = a.ai_analysis && a.ai_analysis.startsWith('{') ? JSON.parse(a.ai_analysis) : {};
        } catch(e) {}
        
        return {
          id: a.id,
          candidateId: a.candidate_id,
          name: a.full_name || a.username,
          initials: (a.full_name || a.username || "C").substring(0, 2).toUpperCase(),
          title: a.headline || job.title,
          role: job.title,
          date: new Date(a.created_at).toLocaleDateString(),
          score: a.ai_match_score,
          status: (a.status || "PENDING REVIEW").toUpperCase(),
          location: a.candidate_location || "Not specified",
          remote: "Remote",
          experience: parsedExperiences.length ? `${parsedExperiences.length} roles` : "Entry Level",
          email: `${a.username}@email.com`, 
          phone: "+62 000 0000 0000",
          summary: a.ai_analysis && a.ai_analysis.startsWith('{') ? "System Review Completed" : (a.ai_analysis || "Pending System Analysis."),
          experiences: parsedExperiences.map(e => ({ role: e.title, company: e.company, period: e.date })),
          skills: parsedSkills,
          strengths: cvAnalysis.strengths || [],
          weaknesses: cvAnalysis.weaknesses || [],
          coreSkills: cvAnalysis.coreSkills || [],
          missingKeywords: cvAnalysis.missingKeywords || [],
          strengthsCandidate: cvAnalysis.strengthsCandidate || [],
          concerns: cvAnalysis.concerns || [],
          scoreCV: a.ai_match_score || null,
          scoreInterview: null,
          totalScore: a.ai_match_score || null,
          matchPercent: a.ai_match_score || null,
          interviews: (() => {
            try {
              let answers = a.screening_answers;
              if (typeof answers === 'string') answers = JSON.parse(answers);
              if (!Array.isArray(answers)) return [];
              return answers.map((ans, i) => ({
                 question: ans.question || `Screening Question ${i+1}`,
                 score: ans.score || null,
                 feedback: ans.feedback || "Screening response",
                 transcript: ans.answer || "-",
                 videoUrl: ans.videoUrl
              }));
            } catch (e) {
              return [];
            }
          })(),
          cvFile: a.cv_url ? a.cv_url.split('/').pop() : null,
          cv_url: a.cv_url,
          cvDate: new Date(a.created_at).toLocaleDateString(),
          videoUrl: a.video_answer_url,
          privateNote: a.private_notes || ""
        };
      }));
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setApplicants([]);
    }
  };

  const openDetail = (c) => { 
    setSelectedCandidate(c); 
    setCandidateStatus(c.status); 
    setPrivateNote(c.privateNote); 
    setCandidateTab("overview"); 
    setView("detail"); 
  };
  const backToOverview = () => { setView("overview"); setSelectedJob(null); };
  const backToApplicants = () => { setView("applicants"); setSelectedCandidate(null); };

  const filteredApplicants = applicants.filter((a) => {
    if (selectedJob && a.role !== selectedJob.title) return false;
    if (filter === "Accepted") return a.status === "ACCEPTED";
    if (filter === "Reviewed") return a.status === "REVIEWED";
    if (filter === "Rejected") return a.status === "REJECTED";
    return true;
  }).filter((a) => a.name.toLowerCase().includes(searchApplicant.toLowerCase()));

  const updateStatus = async (newStatus) => {
    try {
      setCandidateStatus(newStatus);
      await api.patch(`/jobs/applications/${selectedCandidate.id}/status`, { status: newStatus.toLowerCase() });
      
      // Update local applicants list
      setApplicants(prev => prev.map(a => a.id === selectedCandidate.id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const updateNotes = async () => {
    try {
      await api.patch(`/jobs/applications/${selectedCandidate.id}/status`, { private_notes: privateNote });
      alert("Private note saved successfully!");
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const statusColor = (s) => {
    if (s === "ACCEPTED") return "#00b894";
    if (s === "REVIEWED") return "#0984e3";
    if (s === "REJECTED") return "#e17055";
    return "#636e72";
  };

  // ── RENDER ──
  return (
    <div className="company-layout">
      <CompanySidebar active="recruitment" />
      <div className="company-main">
        <CompanyHeader title="Recruitment Overview" />
        <div className="dashboard-content">

          {/* ═══════ OVERVIEW ═══════ */}
          {view === "overview" && (
            <div className="recruit-fade">
              <h1 className="recruit-page-title">Active Jobs Openings</h1>
              <p className="recruit-page-sub">Select a job to view and evaluate its applicants.</p>

              <div className="recruit-stats-row">
                <div className="recruit-stat-card">
                  <div className="recruit-stat-icon teal"><FiUsers size={22} /></div>
                  <div><div className="recruit-stat-label">Total Candidates</div><div className="recruit-stat-value">{totalCandidates}</div></div>
                </div>
                <div className="recruit-stat-card">
                  <div className="recruit-stat-icon orange"><FiUserPlus size={22} /></div>
                  <div><div className="recruit-stat-label">New Applicants</div><div className="recruit-stat-value">{totalNew}</div></div>
                </div>
                <div className="recruit-stat-card">
                  <div className="recruit-stat-icon gray"><FiClock size={22} /></div>
                  <div><div className="recruit-stat-label">Pending Review</div><div className="recruit-stat-value">{totalPending}</div></div>
                </div>
              </div>

              <div className="recruit-jobs-header">
                <h2 className="recruit-section-title">Jobs Listings</h2>
                <div className="recruit-search-box">
                  <FiSearch size={16} />
                  <input placeholder="Search jobs..." value={searchJob} onChange={(e) => setSearchJob(e.target.value)} />
                </div>
              </div>

              {jobs.filter((j) => j.title.toLowerCase().includes(searchJob.toLowerCase())).map((job) => (
                <div key={job.id} className="recruit-job-row" onClick={() => openApplicants(job)}>
                  <div className="recruit-job-left">
                    <div className="recruit-job-icon">🏢</div>
                    <div>
                      <div className="recruit-job-name">{job.title}</div>
                      <div className="recruit-job-cat">{job.category}</div>
                    </div>
                  </div>
                  <div className="recruit-job-metrics">
                    <div className="recruit-metric"><span className="recruit-metric-label">TOTAL</span><span className="recruit-metric-val">{job.total}</span></div>
                    <div className="recruit-metric"><span className="recruit-metric-label">NEW</span><span className="recruit-metric-val orange-text">{job.newCount}</span></div>
                    <div className="recruit-metric"><span className="recruit-metric-label">SHORTLISTED</span><span className="recruit-metric-val teal-text">{job.shortlisted}</span></div>
                  </div>
                  <FiChevronRight size={20} className="recruit-job-arrow" />
                </div>
              ))}
            </div>
          )}

          {/* ═══════ APPLICANTS LIST ═══════ */}
          {view === "applicants" && (
            <div className="recruit-fade">
              <h1 className="recruit-page-title">Applicants — {selectedJob?.title}</h1>

              <div className="recruit-filter-row">
                {["All", "Accepted", "Reviewed", "Rejected"].map((f) => (
                  <button key={f} className={`recruit-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                    {f} ({f === "All" ? filteredApplicants.length : applicants.filter((a) => a.status === f.toUpperCase()).length})
                  </button>
                ))}
                <div className="recruit-search-box" style={{ marginLeft: "auto" }}>
                  <FiSearch size={16} />
                  <input placeholder="Search by role..." value={searchApplicant} onChange={(e) => setSearchApplicant(e.target.value)} />
                </div>
                <div className="recruit-sort-wrap">
                  <button className="recruit-sort-btn" onClick={() => setShowSort(!showSort)}>Sort by: {sortBy} <FiChevronDown size={14} /></button>
                  {showSort && (
                    <div className="recruit-sort-dropdown">
                      {["Score", "Date Applied", "Name A-Z"].map((s) => (
                        <div key={s} className="recruit-sort-item" onClick={() => { setSortBy(s); setShowSort(false); }}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="recruit-table">
                <div className="recruit-table-head">
                  <span>CANDIDATE</span><span>APPLIED FOR</span><span>DATE APPLIED</span><span>SCORE</span><span>STATUS</span><span>ACTION</span>
                </div>
                {filteredApplicants.map((a) => (
                  <div key={a.id} className="recruit-table-row">
                    <span 
                      className="recruit-candidate-cell" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (a.candidateId) navigate(`/profile/${a.candidateId}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="recruit-avatar" style={{ background: "#e0f5f0", color: "#00b894" }}>{a.initials}</span>
                      <span style={{ color: '#0f7c82', fontWeight: 600 }}>{a.name}</span>
                    </span>
                    <span>{a.role}</span>
                    <span><FiClock style={{marginRight: 4, verticalAlign: 'middle'}}/> {a.date}</span>
                    <span><span className="recruit-score-badge" style={{ color: a.score >= 80 ? "#00b894" : a.score >= 60 ? "#fdcb6e" : "#e17055" }}>{a.score ?? "Pending"}</span></span>
                    <span><span className="recruit-status-pill" style={{ color: statusColor(a.status), borderColor: statusColor(a.status) }}>{a.status}</span></span>
                    <span><button className="recruit-review-link" onClick={() => openDetail(a)}>Review <FiArrowRight size={14} /></button></span>
                  </div>
                ))}
              </div>

              <button className="recruit-back-link" onClick={backToOverview}><FiChevronLeft size={16} /> Back to Jobs</button>
            </div>
          )}

          {/* ═══════ CANDIDATE DETAIL ═══════ */}
          {view === "detail" && (
            <div className="recruit-fade">
              <button className="recruit-back-link" onClick={backToApplicants}><FiChevronLeft size={16} /> Back to Applicants</button>

              <div className="recruit-detail-grid">
                {/* LEFT COLUMN */}
                <div className="recruit-detail-left">
                  {/* Profile Card */}
                  <div className="recruit-profile-card">
                    <div className="recruit-profile-top">
                      <div className="recruit-profile-avatar">{selectedCandidate?.initials}</div>
                      <div>
                        <h2 
                          className="recruit-profile-name"
                          onClick={() => selectedCandidate?.candidateId && navigate(`/profile/${selectedCandidate.candidateId}`)}
                          style={{ cursor: 'pointer', color: '#0f7c82' }}
                        >
                          {selectedCandidate?.name}
                        </h2>
                        <p className="recruit-profile-title">{selectedCandidate?.title}</p>
                        <p className="recruit-profile-remote"><FiMapPin style={{marginRight: 4, verticalAlign: 'middle'}}/> {selectedCandidate?.remote}</p>
                      </div>
                    </div>
                    <div className="recruit-profile-meta">
                      <span><FiMapPin size={13} /> {selectedCandidate?.location}</span>
                      <span><FiClock size={13} /> {selectedCandidate?.experience}</span>
                      <span><FiClock size={13} /> {selectedCandidate?.experience}</span>
                    </div>
                    <div className="recruit-profile-email"><FiMail size={13} /> {selectedCandidate?.email}</div>
                  </div>

                  {/* Tabs */}
                  <div className="recruit-tabs">
                    {[
                      { key: "overview", label: "Overview", icon: <FiUsers size={15} /> },
                      { key: "interview", label: "Interview Video", icon: <FiVideo size={15} /> },
                      { key: "cv", label: "Dokumen CV", icon: <FiFileText size={15} /> },
                      { key: "match", label: "Match Score", icon: <FiStar size={15} /> },
                    ].map((t) => (
                      <button key={t.key} className={`recruit-tab ${candidateTab === t.key ? "active" : ""}`} onClick={() => setCandidateTab(t.key)}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {candidateTab === "overview" && <OverviewTab candidate={selectedCandidate} />}
                  {candidateTab === "interview" && <InterviewTab candidate={selectedCandidate} expandedTranscript={expandedTranscript} setExpandedTranscript={setExpandedTranscript} />}
                  {candidateTab === "cv" && <DocumentTab candidate={selectedCandidate} />}
                  {candidateTab === "match" && <MatchTab candidate={selectedCandidate} />}
                </div>

                {/* RIGHT COLUMN */}
                <div className="recruit-detail-right">
                  <div className="recruit-status-card">
                    <div className="recruit-status-header">
                      <strong>STATUS</strong>
                      <span className="recruit-status-current" style={{ color: statusColor(candidateStatus), borderColor: statusColor(candidateStatus) }}>{candidateStatus}</span>
                    </div>
                    <button className={`recruit-action-btn accept ${candidateStatus === "ACCEPTED" ? "selected" : ""}`} onClick={() => updateStatus("ACCEPTED")}>{candidateStatus === "ACCEPTED" && "✓ "}Accept Candidate</button>
                    <button className={`recruit-action-btn pending ${candidateStatus === "PENDING REVIEW" ? "selected" : ""}`} onClick={() => updateStatus("PENDING REVIEW")}>{candidateStatus === "PENDING REVIEW" && "✓ "}Pending Reviewed</button>
                    <button className={`recruit-action-btn review ${candidateStatus === "REVIEWED" ? "selected" : ""}`} onClick={() => updateStatus("REVIEWED")}>{candidateStatus === "REVIEWED" && "✓ "}Mark as Reviewed</button>
                    <button className={`recruit-action-btn reject ${candidateStatus === "REJECTED" ? "selected" : ""}`} onClick={() => updateStatus("REJECTED")}>{candidateStatus === "REJECTED" && "✓ "}Reject Candidate</button>

                    <div className="recruit-notes-section">
                      <strong>Private Notes</strong>
                      <textarea placeholder="Add a private note about this candidate... (only visible to your team)" value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} rows={3} />
                      <button className="recruit-enter-btn" onClick={updateNotes}>Enter</button>
                    </div>
                  </div>

                  <div className="recruit-contact-card">
                    <h4>CONTACT INFORMATION</h4>
                    <div className="recruit-contact-row"><FiMail size={16} /><div><div className="recruit-contact-label">EMAIL</div><div className="recruit-contact-value">{selectedCandidate?.email}</div></div><FiChevronRight size={16} /></div>

                    <button className="recruit-dm-btn">Send Direct Messages</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Sub-components for each tab ── */

function OverviewTab({ candidate }) {
  return (
    <>
      <div className="recruit-scores-row">
        <div className="recruit-score-card"><div className="recruit-score-icon blue"><FiFileText size={20} /></div><div><div className="recruit-score-label">Score CV</div><div className="recruit-score-num">{candidate.scoreCV}</div></div></div>
        <div className="recruit-score-card"><div className="recruit-score-icon teal"><FiUsers size={20} /></div><div><div className="recruit-score-label">Score Interview</div><div className="recruit-score-num">{candidate.scoreInterview}</div></div></div>
        <div className="recruit-score-card"><div className="recruit-score-icon orange"><FiStar size={20} /></div><div><div className="recruit-score-label">Total Score</div><div className="recruit-score-num">{candidate.totalScore}</div></div></div>
      </div>
      <div className="recruit-card"><h3>Profile Summary</h3><p>{candidate.summary}</p></div>
      <div className="recruit-card">
        <h3>Experience Overview</h3>
        {candidate.experiences.map((e, i) => (
          <div key={i} className="recruit-exp-item"><div className="recruit-exp-icon"><FiUsers size={18} /></div><div><div className="recruit-exp-role">{e.role}</div><div className="recruit-exp-company">{e.company}</div><div className="recruit-exp-period">{e.period}</div></div></div>
        ))}
      </div>
      <div className="recruit-card"><h3>Skills</h3><div className="recruit-skills">{candidate.skills.map((s, i) => <span key={i} className="recruit-skill-tag">{s}</span>)}</div></div>
    </>
  );
}

function InterviewTab({ candidate, expandedTranscript, setExpandedTranscript }) {
  return (
    <div className="recruit-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FiVideo /> Screening Interview</h3>
      {candidate.interviews.map((iv, i) => (
        <div key={i} className="recruit-interview-block">
          <div className="recruit-q-num">{i + 1}</div>
          <h4>{iv.question}</h4>
          {iv.videoUrl ? (
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <video controls src={iv.videoUrl} style={{ width: '100%', borderRadius: 12, background: 'black', maxHeight: 300 }} />
            </div>
          ) : (
            <div className="recruit-video-placeholder"><div className="recruit-play-btn">▶</div><span className="recruit-duration">1:{i === 0 ? "45" : "20"}</span></div>
          )}
          {iv.score !== null && iv.score !== undefined ? (
            <div className="recruit-iv-score"><span className="recruit-iv-badge">{iv.score}/100 Score</span><p>{iv.feedback}</p></div>
          ) : (
            <div className="recruit-iv-score" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}><p style={{ margin: 0, fontStyle: 'italic', color: '#64748b' }}>{iv.feedback}</p></div>
          )}
          {iv.transcript && (
            <div className="recruit-transcript">
              <div className="recruit-transcript-header"><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiFileText /> TRANSCRIPT</span><button onClick={() => setExpandedTranscript(expandedTranscript === i ? null : i)}>{expandedTranscript === i ? "Collapse ▲" : "Read ▼"}</button></div>
              {expandedTranscript === i && <pre className="recruit-transcript-text" style={{ fontStyle: iv.score !== null && iv.score !== undefined ? 'normal' : 'italic', color: iv.score !== null && iv.score !== undefined ? '#334155' : '#94a3b8' }}>{iv.transcript}</pre>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentTab({ candidate }) {
  return (
    <div className="recruit-card">
      <div className="recruit-cv-header"><h3>Curriculum Vitae</h3><button className="recruit-full-report">Full Report</button></div>
      {candidate.cvFile ? (
        <div className="recruit-cv-file-row">
          <div className="recruit-cv-file"><span className="recruit-cv-icon"><FiFileText size={24} color="#64748b" /></span><div><strong>{candidate.cvFile}</strong><span className="recruit-cv-meta">PDF Document • Uploaded {candidate.cvDate}</span></div></div>
          <button className="recruit-download-btn" onClick={() => window.open(candidate.cv_url, '_blank')}>Download PDF</button>
        </div>
      ) : (
        <div className="recruit-cv-file-row" style={{ justifyContent: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>No CV document attached to this application.</span>
        </div>
      )}
      <div className="recruit-cv-analysis">
        <div className="recruit-cv-col"><h4><FiCheckCircle size={14} /> STRENGTHS</h4><ul>{candidate.strengths.length > 0 ? candidate.strengths.map((s, i) => <li key={i}>{s}</li>) : <li style={{color: '#94a3b8', fontStyle: 'italic', listStyle: 'none'}}>Pending analysis...</li>}</ul></div>
        <div className="recruit-cv-col"><h4><FiAlertCircle size={14} /> WEAKNESSES</h4><ul>{candidate.weaknesses.length > 0 ? candidate.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li style={{color: '#94a3b8', fontStyle: 'italic', listStyle: 'none'}}>Pending analysis...</li>}</ul></div>
      </div>
      <div className="recruit-cv-bottom">
        <div className="recruit-cv-preview">
          {candidate.cv_url ? (
            <iframe 
              src={`${candidate.cv_url}#toolbar=0`} 
              width="100%" 
              height="100%" 
              style={{ border: 'none', borderRadius: '8px', minHeight: '400px' }}
              title="CV Preview"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontStyle: 'italic' }}>No preview available</div>
          )}
        </div>
        <div>
          <div className="recruit-skills-box"><h4><FiCheckCircle size={14} /> CORE SKILLS FOUND</h4><div className="recruit-skills">{candidate.coreSkills.length > 0 ? candidate.coreSkills.map((s, i) => <span key={i} className="recruit-skill-tag">{s}</span>) : <span style={{color: '#94a3b8', fontStyle: 'italic', fontSize: 13}}>Pending analysis...</span>}</div></div>
          <div className="recruit-missing-box"><h4><FiAlertCircle size={14} /> MISSING KEYWORDS</h4><div className="recruit-skills">{candidate.missingKeywords.length > 0 ? candidate.missingKeywords.map((s, i) => <span key={i} className="recruit-skill-tag warning">{s}</span>) : <span style={{color: '#94a3b8', fontStyle: 'italic', fontSize: 13}}>Pending analysis...</span>}</div><p className="recruit-missing-note">The candidate's resume does not explicitly mention these preferred technologies.</p></div>
        </div>
      </div>
    </div>
  );
}

function MatchTab({ candidate }) {
  return (
    <>
      <div className="recruit-match-card">
        <div className="recruit-match-circle"><svg viewBox="0 0 120 120" className="recruit-match-svg"><circle cx="60" cy="60" r="52" fill="none" stroke="#e0e0e0" strokeWidth="10" /><circle cx="60" cy="60" r="52" fill="none" stroke={candidate.matchPercent ? "#00b894" : "#e0e0e0"} strokeWidth="10" strokeDasharray={`${(candidate.matchPercent || 0) / 100 * 327} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" /></svg><span className="recruit-match-pct">{candidate.matchPercent ? `${candidate.matchPercent}%` : "TBD"}</span></div>
        <div><div className="recruit-match-label">OVERALL MATCH EVALUATION</div><h2>{candidate.matchPercent ? "Strong Match for this Role" : "Pending Evaluation"}</h2><p>{candidate.matchPercent ? "Based on a comprehensive analysis of the candidate's CV and answers provided during the screening interview." : "We are currently processing the candidate's resume and screening answers. Check back later."}</p></div>
      </div>
      <div className="recruit-match-cols">
        <div className="recruit-match-col green"><h4><FiCheckCircle size={14} /> STRENGTHS AS CANDIDATE</h4><ul>{candidate.strengthsCandidate.length > 0 ? candidate.strengthsCandidate.map((s, i) => <li key={i}>{s}</li>) : <li style={{color: '#94a3b8', fontStyle: 'italic', listStyle: 'none'}}>Pending analysis...</li>}</ul></div>
        <div className="recruit-match-col red"><h4><FiAlertCircle size={14} /> AREAS OF CONCERN</h4><ul>{candidate.concerns.length > 0 ? candidate.concerns.map((c, i) => <li key={i}>{c}</li>) : <li style={{color: '#94a3b8', fontStyle: 'italic', listStyle: 'none'}}>Pending analysis...</li>}</ul></div>
      </div>
    </>
  );
}
