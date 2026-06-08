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
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import api from "../utils/api";
import "./Dashboard2.css";

// ── dummy data ──
const JOBS = [
  { id: 1, title: "Senior Backend Engineer", category: "Engineering", total: 18, newCount: 6, shortlisted: 3 },
  { id: 2, title: "Product Designer", category: "Design", total: 42, newCount: 12, shortlisted: 5 },
  { id: 3, title: "Marketing Manager", category: "Marketing", total: 9, newCount: 2, shortlisted: 1 },
];

const APPLICANTS = [
  { id: 1, name: "Sarah Jenkins", initials: "SJ", role: "Senior Backend Engineer", date: "Oct 24, 2026", score: 92, status: "ACCEPTED" },
  { id: 2, name: "Malik Thomas", initials: "MT", role: "Senior Backend Engineer", date: "Oct 23, 2026", score: 85, status: "REVIEWED" },
  { id: 3, name: "Elena Dina", initials: "ED", role: "Senior Backend Engineer", date: "Oct 22, 2026", score: 74, status: "PENDING REVIEW" },
  { id: 4, name: "Kevin Solio", initials: "KS", role: "Product Designer", date: "Oct 21, 2026", score: 58, status: "REVIEWED" },
  { id: 5, name: "Latif Mario", initials: "LM", role: "Product Designer", date: "Oct 20, 2026", score: null, status: "PENDING REVIEW" },
];

const CANDIDATE = {
  name: "Budi Santoso", initials: "BS", title: "Senior Backend Engineer | Node.js & AWS",
  location: "Jakarta, ID", remote: "Remote", experience: "5 years Exp.",
  email: "budi.santoso@email.com", phone: "+62 812 3456 7890",
  summary: "I am a passionate backend engineer with 8+ years of experience building scalable microservices and APIs. I enjoy tackling complex architectural challenges and optimizing database performance. I've led transitions from monolith to microservices at my previous two companies, improving system latency by 40%. Looking for a fast-paced team building impactful products.",
  scoreCV: 85, scoreInterview: 90, totalScore: 87.5,
  experiences: [
    { role: "Backend Lead", company: "TechCorp", period: "2023 - Present" },
    { role: "Software Engineer", company: "Innovate Inc", period: "2019 - 2023" },
  ],
  skills: ["Node.js", "AWS", "System Design", "Microservices", "TypeScript"],
  coreSkills: ["Node.js", "AWS", "System Design", "Microservices", "TypeScript", "PostgreSQL", "Redis"],
  missingKeywords: ["GraphQL", "Docker", "Kubernetes"],
  strengths: ["Strong backend framework experience", "Clear microservices architecture skills"],
  weaknesses: ["Lacks front-end frameworks", "Short tenure at previous role"],
  strengthsCandidate: ["Exceeds required years of experience", "Perfect skill overlap (Node.js, AWS)", "Excellent communication in screening", "Strong backend framework experience", "Clear microservices architecture skills"],
  concerns: ["No experience with your specific CI/CD tool (GitHub Actions)", "High salary expectations based on profile", "Lacks front-end frameworks", "Short tenure at previous role"],
  matchPercent: 93,
  interviews: [
    { question: "Tell me about a time you had to design a scalable architecture.", score: 95, feedback: "Exceptional answer. Provided a clear example using the STAR method and demonstrated deep technical knowledge.", transcript: "In my last role at TechCorp, we were transitioning from a monolithic architecture to microservices. I led the design of the new user authentication service. We used Node.js with Redis for session management and PostgreSQL for persistent data. The challenge was ensuring low latency during peak load times..." },
    { question: "How do you handle performance bottlenecks in a Node.js application?", score: 88, feedback: "Strong technical understanding. Accurately identified tools and strategies for both CPU and I/O bound issues.", transcript: "" },
  ],
  cvFile: "Sarah_Jenkins_CV_2026.pdf", cvDate: "Oct 24, 2026",
};

export default function Recruitment() {
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
          total: j.applicants_count,
          newCount: 0, // Mock for now
          shortlisted: 0, // Mock for now
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
        
        return {
          id: a.id,
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
          summary: a.about || "No summary provided.",
          experiences: parsedExperiences.map(e => ({ role: e.title, company: e.company, period: e.date })),
          skills: parsedSkills,
          coreSkills: parsedSkills,
          missingKeywords: [],
          strengthsCandidate: ["Matches requested profile"],
          concerns: ["Needs technical interview validation"],
          matchPercent: a.ai_match_score || 0,
          interviews: [],
          cvFile: "Resume.pdf",
          cvDate: new Date(a.created_at).toLocaleDateString()
        };
      }));
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setApplicants([]);
    }
  };

  const openDetail = (c) => { setSelectedCandidate(c); setCandidateStatus(c.status); setCandidateTab("overview"); setView("detail"); };
  const backToOverview = () => { setView("overview"); setSelectedJob(null); };
  const backToApplicants = () => { setView("applicants"); setSelectedCandidate(null); };

  const filteredApplicants = applicants.filter((a) => {
    if (selectedJob && a.role !== selectedJob.title) return false;
    if (filter === "Accepted") return a.status === "ACCEPTED";
    if (filter === "Reviewed") return a.status === "REVIEWED";
    if (filter === "Rejected") return a.status === "REJECTED";
    return true;
  }).filter((a) => a.name.toLowerCase().includes(searchApplicant.toLowerCase()));

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
                    <span className="recruit-candidate-cell"><span className="recruit-avatar" style={{ background: "#e0f5f0", color: "#00b894" }}>{a.initials}</span>{a.name}</span>
                    <span>{a.role}</span>
                    <span>📅 {a.date}</span>
                    <span><span className="recruit-score-badge" style={{ color: a.score >= 80 ? "#00b894" : a.score >= 60 ? "#fdcb6e" : "#e17055" }}>✨ {a.score ?? "Pending"}</span></span>
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
                        <h2 className="recruit-profile-name">{selectedCandidate?.name}</h2>
                        <p className="recruit-profile-title">{selectedCandidate?.title}</p>
                        <p className="recruit-profile-remote">📍 {selectedCandidate?.remote}</p>
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
                    <button className={`recruit-action-btn accept ${candidateStatus === "ACCEPTED" ? "selected" : ""}`} onClick={() => setCandidateStatus("ACCEPTED")}>{candidateStatus === "ACCEPTED" && "✓ "}Accept Candidate</button>
                    <button className={`recruit-action-btn pending ${candidateStatus === "PENDING REVIEW" ? "selected" : ""}`} onClick={() => setCandidateStatus("PENDING REVIEW")}>{candidateStatus === "PENDING REVIEW" && "✓ "}Pending Reviewed</button>
                    <button className={`recruit-action-btn review ${candidateStatus === "REVIEWED" ? "selected" : ""}`} onClick={() => setCandidateStatus("REVIEWED")}>{candidateStatus === "REVIEWED" && "✓ "}Mark as Reviewed</button>
                    <button className={`recruit-action-btn reject ${candidateStatus === "REJECTED" ? "selected" : ""}`} onClick={() => setCandidateStatus("REJECTED")}>{candidateStatus === "REJECTED" && "✓ "}Reject Candidate</button>

                    <div className="recruit-notes-section">
                      <strong>Private Notes</strong>
                      <textarea placeholder="Add a private note about this candidate... (only visible to your team)" value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} rows={3} />
                      <button className="recruit-enter-btn">Enter</button>
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
      <h3>🎬 Screening Interview</h3>
      {candidate.interviews.map((iv, i) => (
        <div key={i} className="recruit-interview-block">
          <div className="recruit-q-num">{i + 1}</div>
          <h4>{iv.question}</h4>
          <div className="recruit-video-placeholder"><div className="recruit-play-btn">▶</div><span className="recruit-duration">1:{i === 0 ? "45" : "20"}</span></div>
          <div className="recruit-iv-score"><span className="recruit-iv-badge">✨ {iv.score}/100</span><p>{iv.feedback}</p></div>
          {iv.transcript && (
            <div className="recruit-transcript">
              <div className="recruit-transcript-header"><span>📄 AUTO-TRANSCRIPT</span><button onClick={() => setExpandedTranscript(expandedTranscript === i ? null : i)}>{expandedTranscript === i ? "Collapse ▲" : "Read ▼"}</button></div>
              {expandedTranscript === i && <pre className="recruit-transcript-text">{iv.transcript}</pre>}
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
      <div className="recruit-cv-file-row">
        <div className="recruit-cv-file"><span className="recruit-cv-icon">📄</span><div><strong>{candidate.cvFile}</strong><span className="recruit-cv-meta">PDF Document • Uploaded {candidate.cvDate}</span></div></div>
        <button className="recruit-download-btn">Download PDF</button>
      </div>
      <div className="recruit-cv-analysis">
        <div className="recruit-cv-col"><h4><FiCheckCircle size={14} /> STRENGTHS</h4><ul>{candidate.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        <div className="recruit-cv-col"><h4><FiAlertCircle size={14} /> WEAKNESSES</h4><ul>{candidate.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
      </div>
      <div className="recruit-cv-bottom">
        <div className="recruit-cv-preview"></div>
        <div>
          <div className="recruit-skills-box"><h4><FiCheckCircle size={14} /> CORE SKILLS FOUND</h4><div className="recruit-skills">{candidate.coreSkills.map((s, i) => <span key={i} className="recruit-skill-tag">{s}</span>)}</div></div>
          <div className="recruit-missing-box"><h4><FiAlertCircle size={14} /> MISSING KEYWORDS</h4><div className="recruit-skills">{candidate.missingKeywords.map((s, i) => <span key={i} className="recruit-skill-tag warning">{s}</span>)}</div><p className="recruit-missing-note">The candidate's resume does not explicitly mention these preferred technologies.</p></div>
        </div>
      </div>
    </div>
  );
}

function MatchTab({ candidate }) {
  return (
    <>
      <div className="recruit-match-card">
        <div className="recruit-match-circle"><svg viewBox="0 0 120 120" className="recruit-match-svg"><circle cx="60" cy="60" r="52" fill="none" stroke="#e0e0e0" strokeWidth="10" /><circle cx="60" cy="60" r="52" fill="none" stroke="#00b894" strokeWidth="10" strokeDasharray={`${(candidate.matchPercent / 100) * 327} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" /></svg><span className="recruit-match-pct">{candidate.matchPercent}%</span></div>
        <div><div className="recruit-match-label">✨ OVERALL MATCH EVALUATION</div><h2>Strong Match for this Role</h2><p>Based on a comprehensive analysis of the candidate's CV and answers provided during the screening interview.</p></div>
      </div>
      <div className="recruit-match-cols">
        <div className="recruit-match-col green"><h4><FiCheckCircle size={14} /> STRENGTHS AS CANDIDATE</h4><ul>{candidate.strengthsCandidate.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        <div className="recruit-match-col red"><h4><FiAlertCircle size={14} /> AREAS OF CONCERN</h4><ul>{candidate.concerns.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
      </div>
    </>
  );
}
