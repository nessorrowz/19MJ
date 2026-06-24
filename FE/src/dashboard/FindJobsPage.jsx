import React, { useState, useEffect, useMemo, useRef } from "react";
import { FiSearch, FiMapPin, FiClock, FiChevronRight, FiCheckCircle, FiBriefcase, FiLoader, FiVideo, FiSquare, FiPlay, FiFileText, FiAlertCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import api from "../utils/api";

export default function FindJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [screeningModal, setScreeningModal] = useState({ show: false, job: null, questions: [], answers: {}, currentQIndex: 0, videoBlobs: [], transcripts: [], cvFile: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const [videoStream, setVideoStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isRecording, screeningModal.currentQIndex]);

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [videoStream]);

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

          let parsedQuestions = [];
          try {
            parsedQuestions = typeof j.screening_questions === 'string' ? JSON.parse(j.screening_questions || '[]') : (j.screening_questions || []);
          } catch (e) {
            parsedQuestions = [];
          }

          return {
            id: j.id,
            title: j.title,
            company: j.company_name || 'Unknown Company',
            companyId: j.company_id,
            location: j.location || 'Remote',
            type: j.type || '',
            experienceLevel: j.experience_level || '',
            description: j.description || '',
            tags: parsedSkills,
            screeningQuestions: parsedQuestions,
            videoScreening: j.video_screening,
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
    } catch (err) {
      showToast("Could not access camera/mic: " + err.message, "error");
    }
  };

  const startRecording = () => {
    if (!videoStream) return;
    videoChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(videoStream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
      setScreeningModal(prev => {
        const newBlobs = [...prev.videoBlobs];
        newBlobs[prev.currentQIndex] = blob;
        return { ...prev, videoBlobs: newBlobs };
      });
      setIsRecording(false);
      setTimer(0);
      clearInterval(timerRef.current);

      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('video', blob, 'temp.webm');
        const token = localStorage.getItem('token');
        const res = await fetch((import.meta.env.VITE_API_URL || '/api') + '/jobs/transcribe-temp', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setScreeningModal(prev => {
            const newTranscripts = [...(prev.transcripts || [])];
            newTranscripts[prev.currentQIndex] = data.transcript;
            return { ...prev, transcripts: newTranscripts };
          });
        }
      } catch (err) {
        console.error('Transcription failed', err);
      }
      setIsTranscribing(false);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleApplyClick = (job) => {
    // Track job view when candidate clicks to interact
    api.post(`/jobs/${job.id}/view`).catch(err => console.error('Failed to log view', err));

    if (job.screeningQuestions && job.screeningQuestions.length > 0) {
      if (job.videoScreening) startCamera();
      setScreeningModal({ show: true, job, questions: job.screeningQuestions, answers: {}, currentQIndex: 0, videoBlobs: [] });
    } else {
      submitApplication(job.id, []);
    }
  };

  const handleScreeningChange = (index, value, isFile = false) => {
    setScreeningModal(prev => ({
      ...prev,
      answers: { ...prev.answers, [index]: { question: prev.questions[index], answer: value, isFile } }
    }));
  };

  const submitApplication = async (jobId, answersArray, blobsArray = [], cvFile = null) => {
    try {
      if ((blobsArray && blobsArray.length > 0) || cvFile) {
        const formData = new FormData();
        formData.append("screening_answers", JSON.stringify(answersArray));
        if (blobsArray) {
          blobsArray.forEach((blob, idx) => {
            if (blob) formData.append("videos", blob, `video_${idx}.webm`);
          });
        }
        if (cvFile) {
          formData.append("cv", cvFile, cvFile.name);
        }
        
        await api.post(`/jobs/${jobId}/apply`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post(`/jobs/${jobId}/apply`, { screening_answers: answersArray });
      }
      
      showToast("Successfully applied to the job!", "success");
      setJobs(jobs.map(j => j.id === jobId ? { ...j, hasApplied: true } : j));
      
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        setVideoStream(null);
      }
      setScreeningModal({ show: false, job: null, questions: [], answers: {}, currentQIndex: 0, videoBlobs: [], transcripts: [], cvFile: null });
    } catch (err) {
      showToast(err.message || 'Failed to apply', "error");
    }
  };

  return (
    <div className="page-container" style={styles.container}>
      <CandidateSidebar active="jobs" />

      <div className="page-main" style={styles.main}>
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
                <div key={job.id} style={{...styles.jobCard, cursor: 'pointer'}} onClick={() => setSelectedJobDetails(job)}>
                  <div style={styles.jobTop}>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.jobTitle}>{job.title}</h3>
                      <p style={styles.jobMeta}>
                        <span 
                          style={{ color: '#0f7c82', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (job.companyId) navigate(`/profile/${job.companyId}`);
                          }}
                        >
                          {job.company}
                        </span> • {job.location}
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
                      <div
                        style={styles.viewRole}
                        onClick={(e) => { e.stopPropagation(); handleApplyClick(job); }}
                      >
                        Apply Again <FiChevronRight size={14} />
                      </div>
                    ) : (
                      <div
                        style={styles.viewRole}
                        onClick={(e) => { e.stopPropagation(); handleApplyClick(job); }}
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

      {/* JOB DETAILS MODAL */}
      {selectedJobDetails && (
        <div style={{...styles.modalOverlay, zIndex: 1000}} onClick={() => setSelectedJobDetails(null)}>
          <div style={{...styles.modalContent, maxWidth: 600, padding: 32}} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8, marginTop: 0 }}>{selectedJobDetails.title}</h2>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiBriefcase size={16} /> 
                  <span 
                    style={{ color: '#0f7c82', fontWeight: 600, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedJobDetails.companyId) navigate(`/profile/${selectedJobDetails.companyId}`);
                    }}
                  >
                    {selectedJobDetails.company}
                  </span>
                  <span style={{ margin: '0 4px' }}>•</span> 
                  <FiMapPin size={16} /> {selectedJobDetails.location}
                </p>
              </div>
              <button 
                onClick={() => setSelectedJobDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 24, padding: 4 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {selectedJobDetails.type && <span style={{ padding: '6px 16px', background: '#e0f2fe', color: '#0369a1', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{selectedJobDetails.type}</span>}
              {selectedJobDetails.experienceLevel && <span style={{ padding: '6px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{selectedJobDetails.experienceLevel}</span>}
              {selectedJobDetails.hasApplied && <span style={{ padding: '6px 16px', background: '#dcfce7', color: '#166534', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><FiCheckCircle size={14} /> Applied</span>}
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12, marginTop: 0 }}>Job Description</h3>
              <div style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedJobDetails.description || "No description provided."}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12, marginTop: 0 }}>Required Skills</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedJobDetails.tags && selectedJobDetails.tags.length > 0 ? selectedJobDetails.tags.map((tag, i) => (
                  <span key={i} style={{ padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', borderRadius: 6, fontSize: 13 }}>{tag}</span>
                )) : <span style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }}>Not specified</span>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => setSelectedJobDetails(null)}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #cbd5e1', color: '#475569', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Close
              </button>
              <button 
                onClick={() => { setSelectedJobDetails(null); handleApplyClick(selectedJobDetails); }}
                style={{ padding: '12px 24px', background: '#0f7c82', border: 'none', color: 'white', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(15, 124, 130, 0.2)' }}
              >
                {selectedJobDetails.hasApplied ? "Apply Again" : "Apply Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENING MODAL */}
      {screeningModal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Screening Questions</h2>
            <p style={styles.modalSubtitle}>Please answer the following questions from the employer to complete your application for <strong>{screeningModal.job?.title}</strong>.</p>
            
            {!screeningModal.job?.videoScreening ? (
              // TEXT SCREENING FLOW
              <>
                <div style={styles.questionsContainer}>
                  {screeningModal.questions.map((q, idx) => (
                    <div key={idx} style={styles.questionBlock}>
                      <label style={styles.questionLabel}>{idx + 1}. {q}</label>
                      <textarea 
                        style={styles.questionInput} 
                        rows={3} 
                        placeholder="Type your answer here..."
                        value={screeningModal.answers[idx]?.answer || ""}
                        onChange={(e) => handleScreeningChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={() => setScreeningModal({ show: false, job: null, questions: [], answers: {}, currentQIndex: 0, videoBlobs: [] })}>Cancel</button>
                  <button 
                    style={styles.submitBtn} 
                    onClick={() => submitApplication(screeningModal.job.id, Object.values(screeningModal.answers))}
                    disabled={Object.keys(screeningModal.answers).length !== screeningModal.questions.length || Object.values(screeningModal.answers).some(a => !a.answer.trim())}
                  >
                    Submit Application
                  </button>
                </div>
              </>
            ) : screeningModal.currentQIndex < screeningModal.questions.length ? (
              // VIDEO SCREENING FLOW
              <>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, color: '#334155', marginBottom: 12 }}>
                    Question {screeningModal.currentQIndex + 1} of {screeningModal.questions.length}
                  </h3>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
                    {screeningModal.questions[screeningModal.currentQIndex]}
                  </p>
                </div>

                <div style={{ background: 'black', borderRadius: 12, overflow: 'hidden', position: 'relative', height: 300, marginBottom: 20 }}>
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isRecording && (
                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.9)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                      Recording... {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  {screeningModal.videoBlobs[screeningModal.currentQIndex] && !isRecording && (
                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(34,197,94,0.9)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      ✓ Recorded
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
                  {!isRecording ? (
                    <button onClick={startRecording} disabled={isTranscribing} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ef4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 24, fontWeight: 600, cursor: isTranscribing ? 'not-allowed' : 'pointer', opacity: isTranscribing ? 0.5 : 1 }}>
                      <FiVideo /> {screeningModal.videoBlobs[screeningModal.currentQIndex] ? "Retake Answer" : "Start Recording"}
                    </button>
                  ) : (
                    <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#334155', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 24, fontWeight: 600, cursor: 'pointer' }}>
                      <FiSquare /> Stop Recording
                    </button>
                  )}
                </div>

                {isTranscribing && (
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#64748b', borderColor: 'rgba(100,116,139,0.2)', borderWidth: 2 }}></span> Transcribing audio...
                  </div>
                )}

                {!isTranscribing && screeningModal.transcripts && screeningModal.transcripts[screeningModal.currentQIndex] && (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Transcription Result:</strong>
                    <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.5' }}>
                      {screeningModal.transcripts[screeningModal.currentQIndex]}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>* If the transcription is inaccurate, please Retake Answer.</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                  <button 
                    style={styles.cancelBtn} 
                    onClick={() => {
                      if (videoStream) videoStream.getTracks().forEach(t => t.stop());
                      setScreeningModal({ show: false, job: null, questions: [], answers: {}, currentQIndex: 0, videoBlobs: [], transcripts: [], cvFile: null })
                    }}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    style={{ ...styles.submitBtn, ...((!screeningModal.videoBlobs[screeningModal.currentQIndex] || isTranscribing) ? { background: '#94a3b8', cursor: 'not-allowed', opacity: 0.8 } : {}) }} 
                    onClick={() => {
                      if (screeningModal.currentQIndex + 1 >= screeningModal.questions.length && videoStream) {
                        videoStream.getTracks().forEach(t => t.stop());
                      }
                      setScreeningModal(prev => ({ ...prev, currentQIndex: prev.currentQIndex + 1 }));
                    }}
                    disabled={!screeningModal.videoBlobs[screeningModal.currentQIndex] || isTranscribing}
                  >
                    Next Step
                  </button>
                </div>
              </>
            ) : (
              // FINAL STEP: CV UPLOAD
              <>
                 <div style={{ marginBottom: 20 }}>
                   <h3 style={{ fontSize: 16, color: '#334155', marginBottom: 8 }}>
                     Final Step: Upload CV
                   </h3>
                   <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                     Please attach your Curriculum Vitae before submitting the application.
                   </p>
                 </div>
                 
                 <div style={{ padding: '32px 24px', border: '2px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eef2ff', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4f46e5', marginBottom: 16 }}>
                      <FiFileText size={28} />
                    </div>
                    <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>Upload your resume</label>
                    
                    <label style={{ cursor: 'pointer', padding: '10px 24px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: 8, fontWeight: 600, fontSize: 14, display: 'inline-block', transition: 'all 0.2s' }}>
                      Browse Files
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setScreeningModal(prev => ({...prev, cvFile: file}));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {screeningModal.cvFile && (
                      <p style={{ marginTop: 12, fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiCheckCircle /> {screeningModal.cvFile.name}
                      </p>
                    )}
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                   <button 
                     style={styles.cancelBtn} 
                     onClick={() => {
                       if (videoStream) videoStream.getTracks().forEach(t => t.stop());
                       setScreeningModal({ show: false, job: null, questions: [], answers: {}, currentQIndex: 0, videoBlobs: [], transcripts: [], cvFile: null })
                     }}
                   >
                     Cancel
                   </button>
                   
                   <button 
                     style={{ ...styles.submitBtn, ...((!screeningModal.cvFile) ? { background: '#94a3b8', cursor: 'not-allowed', opacity: 0.8 } : {}) }} 
                     onClick={() => {
                       const answers = screeningModal.questions.map((q, idx) => ({ question: q, answer: screeningModal.transcripts[idx] || "Video Answer" }));
                       submitApplication(screeningModal.job.id, answers, screeningModal.videoBlobs, screeningModal.cvFile);
                     }}
                     disabled={!screeningModal.cvFile}
                   >
                     Submit Application
                   </button>
                 </div>
              </>
            )}
          </div>
        </div>
      )}

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
  },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20
  },
  modalContent: {
    backgroundColor: "white", borderRadius: 16, padding: 32,
    width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
  },
  modalTitle: { margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: "#0f172a" },
  modalSubtitle: { margin: "0 0 24px 0", fontSize: 14, color: "#64748b", lineHeight: 1.5 },
  questionsContainer: { display: "flex", flexDirection: "column", gap: 20 },
  questionBlock: { display: "flex", flexDirection: "column", gap: 8 },
  questionLabel: { fontSize: 15, fontWeight: 600, color: "#334155" },
  questionInput: { 
    padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", 
    fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" 
  },
  modalActions: { 
    display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, 
    paddingTop: 20, borderTop: "1px solid #e2e8f0" 
  },
  cancelBtn: {
    padding: "10px 20px", borderRadius: 8, border: "1px solid #cbd5e1",
    background: "white", color: "#475569", fontWeight: 600, cursor: "pointer"
  },
  submitBtn: {
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: "#0f7c82", color: "white", fontWeight: 600, cursor: "pointer"
  }
};
