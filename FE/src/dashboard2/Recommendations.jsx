import React, { useState, useEffect } from "react";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import { FiSearch, FiStar, FiInfo, FiBriefcase, FiMapPin, FiBook, FiCheckCircle, FiFilter, FiAlertCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./dashboard2.css";

// Dummy data removed, candidates are generated based on applications and match scores.

export default function Recommendations() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [status, setStatus] = useState("initial"); // initial, loading, results
  const [minScore, setMinScore] = useState(80);
  const [experienceLevel, setExperienceLevel] = useState("Mid-level");
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/jobs/company");
        setJobs(res);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  const handleFindMatches = async () => {
    if (!selectedJob) return;
    setStatus("loading");
    
    try {
      const res = await api.get(`/jobs/${selectedJob}/scouting`);
      const formatted = res.map(a => {
        let analysisObj = null;
        try {
          if (a.ai_analysis && a.ai_analysis.startsWith('{')) {
            analysisObj = JSON.parse(a.ai_analysis);
          }
        } catch(e) {}

        return {
          id: a.id,
          candidateId: a.user_id,
          name: a.full_name || a.username,
          initials: (a.full_name || a.username || "C").substring(0, 2).toUpperCase(),
          score: a.ai_match_score || 0,
          role: a.headline || "Candidate",
          verified: true,
          experience: "Unknown", // Placeholder since we don't have this in db yet
          location: a.candidate_location || "Unknown",
          education: "Unknown",
          skills: analysisObj ? (analysisObj.coreSkills || []) : [],
          analysis: a.ai_analysis || "No analysis available.",
          analysisObj
        };
      });
      setCandidates(formatted);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setCandidates([]);
    }

    setTimeout(() => {
      setStatus("results");
    }, 1500);
  };

  const SkeletonCard = () => (
    <div className="recommendation-skeleton">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-body">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line subtitle"></div>
        <div className="skeleton-line gap"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
    </div>
  );

  return (
    <div className="company-layout">
      <CompanySidebar active="recommendations" />
      <div className="company-main">
        <CompanyHeader title="Recommendations" />

        <div className="dashboard-content">
          <div className="recommendations-container">
            
            {/* Header Card */}
            <div className={`recommendation-header-card ${status === 'loading' ? 'loading' : ''}`}>
              <div className="recommendation-header-text">
                <h2>Find the right person, faster.</h2>
                <p>
                  Our system evaluates candidate profiles and screening answers to rank the best matches for your open roles. Select a job to see your personalized recommendations.
                </p>
              </div>
              <div className="recommendation-header-actions">
                <div className="job-select-wrapper">
                  <FiSearch className="search-icon" />
                  <select 
                    value={selectedJob} 
                    onChange={(e) => setSelectedJob(e.target.value)}
                    disabled={status === 'loading'}
                  >
                    <option value="" disabled>Search by role...</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>
                {status === "loading" ? (
                  <button className="btn-find-matches loading" disabled>
                    <div className="spinner"></div>
                    Analyzing...
                  </button>
                ) : (
                  <button className="btn-find-matches" onClick={handleFindMatches} disabled={!selectedJob}>
                    Find Matches
                  </button>
                )}
              </div>
            </div>

            {/* Loading State Content */}
            {status === "loading" && (
              <motion.div 
                className="recommendation-loading-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="loading-indicator-main">
                  <div className="star-icon-wrapper">
                    <FiStar className="star-icon" />
                  </div>
                  <h3>Finding the best matches...</h3>
                  <p>Analyzing skills, experience, and screening answers for {jobs.find(j => j.id == selectedJob)?.title || "the selected role"}...</p>
                </div>
                
                <div className="skeleton-container">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </motion.div>
            )}

            {/* Results State Content */}
            {status === "results" && (
              <motion.div 
                className="recommendation-results-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="results-header-row">
                  <p>Displaying <strong>{candidates.filter(c => c.score >= minScore).length}</strong> candidates that match your criteria</p>
                  <div className="sort-wrapper">
                    <span className="sort-label">Urutkan:</span>
                    <select className="sort-select">
                      <option>Match Score</option>
                    </select>
                  </div>
                </div>

                <div className="results-layout">
                  <div className="candidate-list">
                    {candidates.filter(c => c.score >= minScore).map(candidate => (
                      <div className="candidate-card" key={candidate.id}>
                        <div className="candidate-avatar-wrapper">
                          <div className="candidate-avatar">{candidate.initials}</div>
                          <div className="candidate-score">{candidate.score}%</div>
                        </div>
                        
                        <div className="candidate-details">
                          <div className="candidate-name-row">
                            <h3>{candidate.name}</h3>
                            {candidate.verified && (
                              <span className="verified-badge">
                                <FiCheckCircle /> Verified
                              </span>
                            )}
                            <FiStar className="action-icon" />
                            <FiInfo className="action-icon" />
                          </div>
                          
                          <p className="candidate-role">{candidate.role}</p>
                          
                          <div className="candidate-info-row">
                            <span><FiBriefcase /> {candidate.experience}</span>
                            <span><FiMapPin /> {candidate.location}</span>
                          </div>
                          
                          <div className="candidate-info-row">
                            <span><FiBook /> {candidate.education}</span>
                          </div>
                          
                          <div className="candidate-skills">
                            {candidate.skills.slice(0, 4).map(skill => (
                              <span key={skill} className="skill-pill">{skill}</span>
                            ))}
                          </div>
                          
                          {candidate.analysisObj ? (
                            <div className="candidate-analysis-box formatted" style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 12 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                  <h4 style={{ color: '#10b981', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, marginTop: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <FiCheckCircle /> STRENGTHS
                                  </h4>
                                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {candidate.analysisObj.strengths?.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                                <div>
                                  <h4 style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, marginTop: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <FiAlertCircle /> CONCERNS
                                  </h4>
                                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {candidate.analysisObj.concerns?.slice(0, 2).map((c, i) => <li key={i}>{c}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="candidate-analysis-box">
                              <span className="analysis-label">ANALYZE</span>
                              <p className="analysis-text">"{candidate.analysis}"</p>
                            </div>
                          )}
                        </div>
                        <div className="candidate-actions">
                          <button 
                            className="btn-view-profile" 
                            onClick={() => {
                              if (candidate.candidateId) navigate(`/profile/${candidate.candidateId}`);
                            }}
                          >
                            View Profile
                          </button>
                          <button className="btn-invite-interview" onClick={() => showToast("Fitur pengiriman undangan otomatis akan segera hadir!", "success")}>Invite an Interview</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="filter-sidebar">
                    <div className="filter-header">
                      <FiFilter />
                      <h3>Filter Matches</h3>
                    </div>
                    
                    <div className="filter-section">
                      <div className="filter-label-row">
                        <span>MIN SCORE</span>
                        <span className="score-val">{minScore}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={minScore} 
                        onChange={(e) => setMinScore(e.target.value)}
                        className="score-slider"
                      />
                      <div className="slider-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <div className="filter-section">
                      <span className="filter-label">EXPERIENCE LEVEL</span>
                      <div className="radio-group">
                        {['Entry-level', 'Mid-level', 'Senior', 'Expert'].map(level => (
                          <label key={level} className="radio-label">
                            <input 
                              type="radio" 
                              name="experience" 
                              checked={experienceLevel === level}
                              onChange={() => setExperienceLevel(level)}
                            />
                            <span className="radio-text">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="filter-section">
                      <span className="filter-label">LOCATION</span>
                      <div className="location-input-wrapper">
                        <FiMapPin className="input-icon" />
                        <input type="text" placeholder="City, Country..." />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
      {toast.show && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#f0fdf4',
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : '#4ade80'}`,
          padding: '16px 24px', borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <FiAlertCircle size={20} /> : <FiCheckCircle size={20} />}
          <span style={{ fontSize: 14, fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
