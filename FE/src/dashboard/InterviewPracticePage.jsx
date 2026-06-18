import { useState, useEffect, useRef, useCallback } from "react";
import { FiBell, FiMic, FiZap, FiCheckCircle, FiClock, FiAlertCircle, FiArrowLeft, FiArrowRight, FiPlay, FiSquare, FiEdit3, FiAward, FiVideo } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/ai' : '/api/ai';

export default function InterviewPracticePage() {
  // State Management
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Practice Wizard States: "dashboard" | "setup" | "arena" | "review"
  const [view, setView] = useState("dashboard");
  const [selectedSession, setSelectedSession] = useState(null);

  // Setup Form
  const [targetRole, setTargetRole] = useState("");
  const [level, setLevel] = useState("Mid-level");
  const [interviewLanguage, setInterviewLanguage] = useState("auto");

  // Active Session Arena States
  const [currentSession, setCurrentSession] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [answeringMode, setAnsweringMode] = useState("voice"); // "voice" | "text"
  const [textAnswer, setTextAnswer] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState("");

  // MediaRecorder & Webcam Stream Refs & State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const videoRef = useRef(null);
  const [videoStream, setVideoStream] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Fetch past sessions on load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Bind video stream to <video> element whenever stream or ref changes
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isRecording]);

  // Release camera resource if page transitions or unmounts
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch interview session history.");
      }
      const data = await res.json();
      setSessions(data.result || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start Session Wizard
  const handleStartSetup = () => {
    setView("setup");
    setError(null);
  };

  const handleGenerateQuestion = async () => {
    if (!targetRole.trim()) {
      setError("Please enter your target job role first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      // 1. Generate question text
      const genRes = await fetch(`${API_BASE}/interviews/generate-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetRole: targetRole.trim(), level }),
      });

      if (!genRes.ok) {
        throw new Error("Failed to generate interview question.");
      }
      const genData = await genRes.json();
      const generatedQText = genData.questionText;

      // 2. Create session on backend
      const sessRes = await fetch(`${API_BASE}/interviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionText: generatedQText }),
      });

      if (!sessRes.ok) {
        throw new Error("Failed to initialize new interview session.");
      }
      const sessData = await sessRes.json();

      setCurrentSession(sessData.result);
      setQuestionText(generatedQText);
      setTranscript("");
      setEditedTranscript("");
      setTextAnswer("");
      setView("arena");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Recording Management (Webcam + Audio)
  const startRecording = async () => {
    setError(null);
    setRecordedBlob(null);
    setTranscript("");
    setEditedTranscript("");
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Set stream first, then set isRecording — useEffect will bind srcObject
      setVideoStream(stream);
      setIsRecording(true);
      setRecordingSeconds(0);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : undefined,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Build blob BEFORE releasing stream tracks
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "video/webm" });
        setRecordedBlob(blob);

        // NOW release camera/mic
        stream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
      };

      mediaRecorder.start(1000); // collect in 1s chunks for reliability

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Camera or microphone permission denied / not found.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // triggers onstop callback which handles cleanup
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Try upload + transcribe; on failure, show error and fall back to manual text
  const handleUploadAndTranscribe = async () => {
    if (!recordedBlob) return;
    setIsTranscribing(true);
    setError(null);
    try {
      await uploadAndTranscribe(recordedBlob);
    } catch (err) {
      console.error(err);
      setError("Auto-transcription unavailable. You can type your answer manually below.");
      setTranscript("(recorded)");
      setEditedTranscript("");
      setIsEditingTranscript(true);
      setAnsweringMode("text");
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const uploadAndTranscribe = async (audioBlob) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("media", audioBlob, "answer.webm");

    // Upload media
    const uploadRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload your recording.");
    }

    // Trigger transcription
    const transRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/transcribe`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ language: "id" }),
    });

    if (!transRes.ok) {
      throw new Error("Auto-transcription failed.");
    }

    const transData = await transRes.json();
    const txt = transData.result?.transcript?.raw_transcript || transData.result?.transcript?.rawTranscript || "";
    setTranscript(txt);
    setEditedTranscript(txt);
    setIsEditingTranscript(true);
  };

  // Submit Text/Edited Answer
  const handleSaveTextAnswer = async () => {
    const finalAnswerText = answeringMode === "text" ? textAnswer : editedTranscript;
    if (!finalAnswerText.trim()) {
      setError("Please enter or record your answer first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      // Save/update transcript on backend
      const patchRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/transcript`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ editedTranscript: finalAnswerText.trim() }),
      });

      if (!patchRes.ok) {
        throw new Error("Failed to update answer text.");
      }

      // Trigger evaluation
      const evalRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/evaluate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!evalRes.ok) {
        throw new Error("Failed to trigger answer evaluation.");
      }

      const evalData = await evalRes.json();
      const loadedSess = await fetchSessionDetails(currentSession.id);
      setSelectedSession(loadedSess);
      setView("review");
      fetchSessions(); // Refresh list in background
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (id) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/interviews/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch session details.");
    const data = await res.json();
    return data.result;
  };

  const handleReviewSession = async (sess) => {
    setLoading(true);
    setError(null);
    try {
      const details = await fetchSessionDetails(sess.id);
      setSelectedSession(details);
      setView("review");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
    setCurrentSession(null);
    setSelectedSession(null);
    setTargetRole("");
    setError(null);
  };

  // Computations
  const totalSessions = sessions.length;
  const evaluatedSessions = sessions.filter((s) => s.overall_score !== null);
  const averageScore = evaluatedSessions.length
    ? Math.round(evaluatedSessions.reduce((acc, curr) => acc + curr.overall_score, 0) / evaluatedSessions.length)
    : 0;
  const bestScore = evaluatedSessions.length
    ? Math.max(...evaluatedSessions.map((s) => s.overall_score))
    : 0;

  return (
    <div style={styles.container}>
      <CandidateSidebar active="practice" />

      <div style={styles.main}>
        {/* HEADER */}
        <CandidateHeader title="Interview Practice" />

        {/* CONTENT */}
        <div style={styles.content}>
          {error && (
            <div style={styles.errorBanner}>
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={styles.skeletonContainer}>
              <div style={styles.skeletonLoader}>
                <div style={styles.skeletonCircle}></div>
                <h3>Connecting to System...</h3>
                <p>Processing session creation, evaluation, or transcription of your recording.</p>
              </div>
            </div>
          )}

          {view === "dashboard" && (
            <>
              <div style={styles.titleRow}>
                <FiMic size={30} style={{ color: "#0f7c82" }} />
                <h1 style={styles.title}>Interview Practice</h1>
              </div>

              <p style={styles.subtitle}>
                Practice answering real interview questions and get automated feedback on every answer.
              </p>

              {/* STATS */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Sessions Completed</span>
                  <span style={styles.statValue}>{totalSessions}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Average Score</span>
                  <span style={styles.statValue}>{averageScore ? `${averageScore} / 100` : "-"}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Best Performance</span>
                  <span style={styles.statValue}>{bestScore ? `${bestScore} / 100` : "-"}</span>
                </div>
              </div>

              {/* START PRACTICE BOX */}
              <div style={styles.practiceCard}>
                <h3 style={{ marginTop: 0, color: "#1e293b" }}>Start a New Practice Session</h3>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                  Our system will act as an expert interviewer, generating sharp questions relevant to your target career.
                </p>
                <button style={styles.button} onClick={handleStartSetup}>
                  <FiPlay size={16} />
                  Start Interview Practice
                </button>
              </div>

              {/* PAST SESSIONS */}
              <h3 style={{ color: "#1e293b", margin: "32px 0 16px" }}>Simulation History</h3>
              {sessions.length === 0 ? (
                <div style={styles.emptyState}>No interview practice sessions yet.</div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={styles.th}>Session</th>
                        <th style={styles.th}>Date Created</th>
                        <th style={styles.th}>Main Question</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Score</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((sess, index) => (
                        <tr key={sess.id} style={styles.tableRow}>
                          <td style={styles.td}>Session {sessions.length - index}</td>
                          <td style={styles.td}>
                            {new Date(sess.created_at).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td style={{ ...styles.td, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sess.question_text}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              background: sess.status === "completed" ? "#d1fae5" : "#fee2e2",
                              color: sess.status === "completed" ? "#065f46" : "#991b1b",
                            }}>
                              {sess.status === "completed" ? "Completed" : sess.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {sess.overall_score !== null ? (
                              <span style={{
                                ...styles.scorePill,
                                background: sess.overall_score >= 80 ? "#d1fae5" : "#fef3c7",
                                color: sess.overall_score >= 80 ? "#065f46" : "#92400e",
                              }}>
                                {sess.overall_score} / 100
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {sess.status === "completed" ? (
                              <button onClick={() => handleReviewSession(sess)} style={styles.reviewBtn}>
                                View Review
                              </button>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Incomplete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* VIEW: SETUP FORM */}
          {view === "setup" && (
            <div style={styles.setupCard}>
              <button onClick={handleBackToDashboard} style={styles.backLink}>
                <FiArrowLeft size={16} />
                Back to History
              </button>

              <h2 style={{ marginTop: "16px", color: "#1e293b" }}>Customize Interview Topic</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>
                Our system will craft a tailored question based on your target role and experience level.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Target Job Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Search for a role or field..."
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Experience Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={styles.selectField}
                >
                  <option value="Fresh Graduate">Entry Level</option>
                  <option value="Junior">Junior (1-2 years)</option>
                  <option value="Mid-level">Mid Level (3-5 years)</option>
                  <option value="Senior">Senior (5+ years)</option>
                </select>
              </div>

              <button style={styles.button} onClick={handleGenerateQuestion}>
                <FiArrowRight size={16} />
                Start Practice Session
              </button>
            </div>
          )}

          {/* VIEW: ACTIVE PRACTICE ARENA */}
          {view === "arena" && (
            <div style={styles.arenaCard}>
              <div style={styles.arenaHeader}>
                <span style={styles.arenaBadge}>QUESTIONS</span>
                <h2>Interviewer Question:</h2>
                <div style={styles.questionBox}>
                  <p style={styles.questionContent}>"{questionText}"</p>
                </div>
              </div>

              {/* Answering Selector */}
              <div style={styles.tabContainer}>
                <button
                  style={{
                    ...styles.tabBtn,
                    borderBottomColor: answeringMode === "voice" ? "#0f7c82" : "transparent",
                    color: answeringMode === "voice" ? "#0f7c82" : "#64748b",
                  }}
                  onClick={() => setAnsweringMode("voice")}
                >
                  <FiVideo size={16} />
                  Video Interview Simulation
                </button>
                <button
                  style={{
                    ...styles.tabBtn,
                    borderBottomColor: answeringMode === "text" ? "#0f7c82" : "transparent",
                    color: answeringMode === "text" ? "#0f7c82" : "#64748b",
                  }}
                  onClick={() => setAnsweringMode("text")}
                >
                  <FiEdit3 size={16} />
                  Type Your Answer
                </button>
              </div>

              {/* Answering Body */}
              <div style={styles.arenaBody}>
                {answeringMode === "voice" ? (
                  <div style={styles.audioPracticeArena}>
                    {isRecording ? (
                      <div style={styles.recordingArea}>
                        {/* Interactive Webcam Video Box */}
                        <div style={styles.webcamContainer}>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={styles.webcamVideo}
                          />
                          <div style={styles.recordingOverlay}>
                            <div style={styles.recDot}></div>
                            <span style={styles.recLabel}>REC</span>
                          </div>
                          <div style={styles.timerOverlay}>
                            {formatTime(recordingSeconds)}
                          </div>
                        </div>

                        <button onClick={stopRecording} style={styles.stopBtn}>
                          <FiSquare size={16} />
                          Stop Recording
                        </button>
                      </div>
                    ) : recordedBlob && !transcript ? (
                      /* After recording, before transcription — show preview & action buttons */
                      <div style={styles.postRecordArea}>
                        <div style={styles.postRecordInfo}>
                          <FiCheckCircle size={24} style={{ color: "#10b981" }} />
                          <div>
                            <strong style={{ color: "#1e293b" }}>Recording saved successfully</strong>
                            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                              Duration: {formatTime(recordingSeconds)} &mdash; Size: {(recordedBlob.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>

                        <div style={styles.postRecordActions}>
                          <button onClick={handleUploadAndTranscribe} style={styles.submitArenaBtn} disabled={isTranscribing}>
                            {isTranscribing ? "Transcribing..." : "Proceed to Type Your Answer"}
                          </button>
                          <button
                            onClick={() => {
                              setTranscript("(manual)");
                              setEditedTranscript("");
                              setIsEditingTranscript(true);
                            }}
                            style={styles.reRecordBtn}
                          >
                            <FiEdit3 size={16} />
                            Type Answer Manually
                          </button>
                          <button onClick={startRecording} style={styles.reRecordBtn}>
                            <FiVideo size={16} />
                            Re-record
                          </button>
                        </div>
                      </div>
                    ) : transcript ? (
                      <div style={styles.transcriptArea}>
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{
                                background: "#f1f5f9",
                                color: "#475569",
                                fontSize: "11px",
                                fontWeight: "600",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                letterSpacing: "0.5px"
                              }}>
                                RECORDED ANSWER
                              </span>
                              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: "600" }}>Review & Edit Answer</h3>
                            </div>
                            <button onClick={() => setIsEditingTranscript(!isEditingTranscript)} style={styles.editLink}>
                              {isEditingTranscript ? "Save Changes" : "Edit Answer"}
                            </button>
                          </div>
                          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                            We've turned your speech into text. Feel free to make any corrections to your answer before saving.
                          </p>
                        </div>

                        {isEditingTranscript ? (
                          <textarea
                            value={editedTranscript}
                            onChange={(e) => setEditedTranscript(e.target.value)}
                            style={styles.textareaField}
                            rows={6}
                            placeholder="Type your complete answer here..."
                          />
                        ) : (
                          <div style={styles.transcriptBox}>{editedTranscript || "(Empty transcript)"}</div>
                        )}

                        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                          <button onClick={startRecording} style={styles.reRecordBtn}>
                            <FiVideo size={16} />
                            Re-record Video
                          </button>
                          <button onClick={handleSaveTextAnswer} style={styles.submitArenaBtn} disabled={loading}>
                            {loading ? "Saving..." : "Submit Answer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.recordStartArea}>
                        <div style={styles.webcamPlaceholder}>
                          <FiVideo size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
                          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                            Camera & Microphone ready to record your video simulation.
                          </p>
                        </div>
                        <button onClick={startRecording} style={styles.recordStartBtn}>
                          <FiVideo size={24} />
                          Start Recording Video
                        </button>
                        <p style={{ color: "#64748b", marginTop: "16px", fontSize: "13px" }}>
                          Use your browser's camera and microphone to answer. Optimal duration: 30 - 120 seconds.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.textPracticeArena}>
                    <textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your complete answer here..."
                      style={styles.textareaField}
                      rows={8}
                    />
                    <button onClick={handleSaveTextAnswer} style={styles.submitArenaBtn} disabled={loading}>
                      {loading ? "Evaluating..." : "Submit Answer for Evaluation"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: DETAILED SESSION REVIEW */}
          {view === "review" && selectedSession && (
            <div style={styles.reviewCard}>
              <button onClick={handleBackToDashboard} style={styles.backLink}>
                <FiArrowLeft size={16} />
                Back to Dashboard
              </button>

              <div style={styles.reviewHeader}>
                <span style={styles.reviewBadge}>EVALUATION REVIEW RESULTS</span>
                <h1 style={{ margin: "12px 0 6px", color: "#1e293b" }}>
                  Simulation Session {sessions.length - sessions.findIndex(s => s.id === selectedSession.id)}
                </h1>
                <p style={{ color: "#64748b", margin: 0 }}>
                  Question: <span style={{ fontStyle: "italic" }}>"{selectedSession.question_text}"</span>
                </p>
              </div>

              {/* Dynamic Score Report Grid */}
              {(() => {
                const score = selectedSession.overall_score || 0;
                const circumference = 2 * Math.PI * 54;
                const offset = circumference - (score / 100) * circumference;
                
                const getScoreColor = (s) => (s >= 85 ? "#10b981" : s >= 70 ? "#0d9488" : s >= 50 ? "#f59e0b" : "#ef4444");
                const getScoreLabel = (s) => (s >= 85 ? "Excellent Performance" : s >= 70 ? "Good Performance" : s >= 50 ? "Satisfactory" : "Needs Improvement");
                
                const commScore = selectedSession.transcript?.metadata_json?.communicationScore || score;
                const relScore = selectedSession.transcript?.metadata_json?.relevanceScore || score;
                const structScore = selectedSession.transcript?.metadata_json?.structureScore || score;

                return (
                  <>
                    <div style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "32px",
                      marginTop: "24px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "48px", flexWrap: "wrap" }}>
                        {/* Circle */}
                        <div style={{ textAlign: "center", minWidth: "140px" }}>
                          <svg width="140" height="140" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke={getScoreColor(score)}
                              strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s ease" }} />
                            <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="38" fontWeight="700" fill="#1e293b" style={{ alignmentBaseline: "middle" }}>{score}</text>
                          </svg>
                          <p style={{ color: getScoreColor(score), fontWeight: 600, fontSize: 13, marginTop: 12, marginBottom: 0 }}>
                            {getScoreLabel(score)}
                          </p>
                        </div>

                        {/* Sub-scores */}
                        <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", gap: "20px" }}>
                          {/* Communication */}
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 13, color: "#475569", minWidth: 140, fontWeight: 600 }}>Communication</span>
                            <div style={{ flex: 1, height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ width: `${commScore}%`, height: "100%", background: "#0d9488", borderRadius: 5, transition: "width 1s ease" }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 30, textAlign: "right" }}>{commScore}</span>
                          </div>

                          {/* Relevance */}
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 13, color: "#475569", minWidth: 140, fontWeight: 600 }}>Relevance</span>
                            <div style={{ flex: 1, height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ width: `${relScore}%`, height: "100%", background: "#f59e0b", borderRadius: 5, transition: "width 1s ease" }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 30, textAlign: "right" }}>{relScore}</span>
                          </div>

                          {/* Answer Structure */}
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 13, color: "#475569", minWidth: 140, fontWeight: 600 }}>Answer Structure</span>
                            <div style={{ flex: 1, height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ width: `${structScore}%`, height: "100%", background: "#3b82f6", borderRadius: 5, transition: "width 1s ease" }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 30, textAlign: "right" }}>{structScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Summary Column */}
                    <div style={styles.feedbackSection}>
                      <h3 style={{ color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginTop: "32px", marginBottom: "16px" }}>Interviewer Feedback</h3>
                      <p style={{ color: "#334155", lineHeight: "1.6", fontSize: "15px" }}>
                        {selectedSession.transcript?.metadata_json?.summary || "Your answer demonstrated strong technical competence in a systematic manner."}
                      </p>
                    </div>

                    {/* Two Column strengths & improvements */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
                      {/* Strengths Card */}
                      <div style={{
                        background: "white",
                        borderRadius: "14px",
                        padding: "24px 28px",
                        border: "1px solid #e2e8f0",
                        borderLeftWidth: "6px",
                        borderLeftStyle: "solid",
                        borderLeftColor: "#10b981",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}>
                        <h3 style={{ color: "#059669", fontSize: "16px", marginBottom: "16px", marginTop: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                          <FiCheckCircle size={18} />
                          Your Strengths
                        </h3>
                        <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(selectedSession.transcript?.metadata_json?.strengths && selectedSession.transcript?.metadata_json?.strengths.length > 0) ? (
                            selectedSession.transcript.metadata_json.strengths.map((str, idx) => (
                              <li key={idx} style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{str}</li>
                            ))
                          ) : (
                            <>
                              <li style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>Effective use of professional vocabulary.</li>
                              <li style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>Logical and detailed explanation of implementation.</li>
                            </>
                          )}
                        </ul>
                      </div>

                      {/* Suggestions & Improvements Card */}
                      <div style={{
                        background: "white",
                        borderRadius: "14px",
                        padding: "24px 28px",
                        border: "1px solid #e2e8f0",
                        borderLeftWidth: "6px",
                        borderLeftStyle: "solid",
                        borderLeftColor: "#f59e0b",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}>
                        <h3 style={{ color: "#d97706", fontSize: "16px", marginBottom: "16px", marginTop: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                          <FiAlertCircle size={18} />
                          Suggestions & Improvements
                        </h3>
                        <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(selectedSession.transcript?.metadata_json?.improvements && selectedSession.transcript?.metadata_json?.improvements.length > 0) ? (
                            selectedSession.transcript.metadata_json.improvements.map((imp, idx) => (
                              <li key={idx} style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{imp}</li>
                            ))
                          ) : (
                            <>
                              <li style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>Provide measurable examples from past experience.</li>
                              <li style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>Reduce filler words and repetitive transitions.</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Side by side Answer Comparison */}
              <div style={styles.comparisonBox}>
                <h3 style={{ color: "#1e293b", marginBottom: "20px" }}>Answer Comparison</h3>
                <div style={styles.comparisonGrid}>
                  <div style={styles.compColumn}>
                    <h4 style={styles.compColTitle}>Your Answer</h4>
                    <div style={styles.compTextScroll}>
                      {selectedSession.transcript?.edited_transcript || selectedSession.transcript?.raw_transcript || "Not available."}
                    </div>
                  </div>
                  <div style={styles.compColumn}>
                    <h4 style={{ ...styles.compColTitle, color: "#0f7c82" }}>Suggested Ideal Answer</h4>
                    <div style={{ ...styles.compTextScroll, background: "#f0fdfa", borderLeft: "4px solid #0f7c82" }}>
                      {selectedSession.transcript?.metadata_json?.suggestedAnswer || "As an experienced engineer, you can answer using the STAR framework (Situation, Task, Action, Result) focusing on microservices scalability."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ textAlign: "center", marginTop: "36px" }}>
                <button onClick={handleBackToDashboard} style={styles.closeReviewBtn}>
                  Done & Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "white",
    height: "88px",
    padding: "0 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #f1f5f9",
    boxSizing: "border-box",
  },
  pageLabel: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  bellIcon: {
    color: "#64748b",
    cursor: "pointer",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
  },
  avatarFallback: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#0f7c82",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  roleLabel: {
    fontSize: "12px",
    color: "#64748b",
  },
  content: {
    flex: 1,
    padding: "40px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    fontWeight: 500,
  },
  skeletonContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  skeletonLoader: {
    background: "white",
    borderRadius: "24px",
    padding: "40px 32px",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    maxWidth: "420px",
    width: "90%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  skeletonCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "4px solid #f1f5f9",
    borderTopColor: "#0f7c82",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "15px",
    margin: "0 0 32px 0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "32px",
  },
  statCard: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontWeight: 800,
    fontSize: "24px",
    color: "#0f172a",
  },
  practiceCard: {
    background: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "20px",
    padding: "36px",
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "50px",
    border: "none",
    borderRadius: "10px",
    color: "white",
    padding: "0 24px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "15px",
    background: "linear-gradient(135deg, #0f7c82, #0d9488)",
  },
  emptyState: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "48px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
  },
  tableWrapper: {
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHead: {
    background: "#f8fafc",
  },
  th: {
    padding: "16px 24px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s",
  },
  td: {
    padding: "18px 24px",
    fontSize: "14px",
    color: "#334155",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  scorePill: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontWeight: 600,
    fontSize: "12px",
  },
  reviewBtn: {
    color: "#0f7c82",
    background: "transparent",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
  },
  setupCard: {
    background: "white",
    borderRadius: "20px",
    padding: "36px",
    border: "1px solid #e2e8f0",
  },
  backLink: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: 0,
  },
  inputField: {
    width: "100%",
    height: "50px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0 16px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  },
  selectField: {
    width: "100%",
    height: "50px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0 16px",
    fontSize: "15px",
    background: "white",
    boxSizing: "border-box",
    outline: "none",
    cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    backgroundSize: "16px",
    paddingRight: "40px",
    appearance: "none",
    WebkitAppearance: "none",
  },
  formGroup: {
    textAlign: "left",
    marginBottom: "24px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
  },
  arenaCard: {
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    border: "1px solid #e2e8f0",
  },
  arenaHeader: {
    marginBottom: "32px",
  },
  arenaBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  questionBox: {
    background: "#f8fafc",
    borderLeft: "4px solid #0f7c82",
    padding: "24px",
    borderRadius: "0 12px 12px 0",
    marginTop: "16px",
  },
  questionContent: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: 1.6,
    color: "#1e293b",
    fontStyle: "italic",
  },
  tabContainer: {
    display: "flex",
    borderBottom: "2px solid #e2e8f0",
    marginBottom: "28px",
  },
  tabBtn: {
    padding: "12px 24px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "2px",
    marginBottom: "-2px",
  },
  arenaBody: {
    minHeight: "200px",
  },
  audioPracticeArena: {
    textAlign: "center",
  },
  webcamContainer: {
    width: "100%",
    maxWidth: "540px",
    height: "auto",
    aspectRatio: "16/9",
    background: "#1e293b",
    borderRadius: "16px",
    border: "4px solid #cbd5e1",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    position: "relative",
    margin: "0 auto 24px",
    overflow: "hidden",
  },
  webcamVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  webcamPlaceholder: {
    width: "100%",
    maxWidth: "540px",
    aspectRatio: "16/9",
    background: "#f8fafc",
    border: "2px dashed #cbd5e1",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    padding: "24px",
    boxSizing: "border-box",
  },
  recordingOverlay: {
    position: "absolute",
    top: "16px",
    left: "16px",
    background: "rgba(15, 23, 42, 0.6)",
    padding: "6px 12px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  recDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ef4444",
    animation: "pulseWave 0.6s infinite alternate",
  },
  recLabel: {
    color: "white",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  timerOverlay: {
    position: "absolute",
    bottom: "16px",
    right: "16px",
    background: "rgba(15, 23, 42, 0.6)",
    color: "white",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
  },
  recordStartArea: {
    padding: "20px 0",
  },
  recordStartBtn: {
    height: "54px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "white",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    margin: "0 auto",
    padding: "0 32px",
    boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.3)",
  },
  recordingArea: {
    padding: "20px 0",
  },
  stopBtn: {
    border: "none",
    background: "#1e293b",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "0 auto",
  },
  transcriptArea: {
    textAlign: "left",
  },
  transcriptBox: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    minHeight: "100px",
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#334155",
  },
  textareaField: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "16px",
    fontSize: "15px",
    lineHeight: 1.6,
    boxSizing: "border-box",
    outline: "none",
  },
  editLink: {
    background: "transparent",
    border: "none",
    color: "#0f7c82",
    fontWeight: 700,
    cursor: "pointer",
  },
  reRecordBtn: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  submitArenaBtn: {
    border: "none",
    background: "#0f7c82",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },
  textPracticeArena: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    alignItems: "flex-end",
  },
  reviewCard: {
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    border: "1px solid #e2e8f0",
  },
  reviewHeader: {
    margin: "24px 0 32px",
  },
  reviewBadge: {
    background: "#e0f2fe",
    color: "#0369a1",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  evaluationScoreboard: {
    display: "flex",
    gap: "40px",
    alignItems: "center",
    background: "#f8fafc",
    padding: "32px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    marginBottom: "32px",
  },
  overallScoreCol: {
    width: "120px",
  },
  radialWrapper: {
    position: "relative",
    width: "120px",
    height: "120px",
  },
  metricsCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  metricRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  metricLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
  },
  metricTitle: {},
  metricPercent: {
    color: "#0f172a",
  },
  barOuter: {
    height: "8px",
    background: "#cbd5e1",
    borderRadius: "4px",
    overflow: "hidden",
  },
  barInner: {
    height: "100%",
    borderRadius: "4px",
  },
  feedbackSection: {
    marginBottom: "32px",
  },
  bulletGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "32px",
  },
  bulletCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
  },
  bullets: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bulletLi: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: 1.5,
    paddingLeft: "12px",
    position: "relative",
    "::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: "8px",
      width: "5px",
      height: "5px",
      borderRadius: "50%",
      background: "#94a3b8",
    },
  },
  comparisonBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "28px",
  },
  comparisonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  compColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  compColTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#475569",
  },
  compTextScroll: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "16px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#334155",
    maxHeight: "200px",
    overflowY: "auto",
  },
  closeReviewBtn: {
    background: "#0f7c82",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "14px 28px",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
  },
  postRecordArea: {
    background: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "center",
  },
  postRecordInfo: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    justifyContent: "center",
    marginBottom: "24px",
  },
  postRecordActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
};