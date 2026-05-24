import { useState, useEffect, useRef } from "react";
import { FiBell, FiMic, FiZap, FiCheckCircle, FiClock, FiAlertCircle, FiArrowLeft, FiPlay, FiSquare, FiEdit3, FiAward, FiVideo } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";

const API_BASE = "http://localhost:3000/api/ai";

export default function InterviewPracticePage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const profileStorageKey = `candidateProfile_${currentUser.email}`;
  const profile = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");

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

  // Fetch past sessions on load
  useEffect(() => {
    fetchSessions();
  }, []);

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
        throw new Error("Gagal mengambil riwayat sesi wawancara.");
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
      setError("Silakan isi target role pekerjaan terlebih dahulu.");
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
        throw new Error("Gagal membuat pertanyaan wawancara otomatis.");
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
        throw new Error("Gagal inisialisasi sesi wawancara baru di database.");
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
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      
      // Bind to live video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadAndTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Izin kamera atau mikrofon ditolak / tidak ditemukan.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      
      // Stop webcam preview and release streams
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
      }
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const uploadAndTranscribe = async (audioBlob) => {
    setLoading(true);
    setError(null);
    try {
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
        throw new Error("Gagal mengupload rekaman suara Anda.");
      }

      // Trigger transcription
      const transRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!transRes.ok) {
        throw new Error("Gagal melakukan transkripsi otomatis. Silakan beralih ke Mode Teks.");
      }

      const transData = await transRes.json();
      const txt = transData.result?.transcript?.raw_transcript || transData.result?.transcript?.rawTranscript || "";
      setTranscript(txt);
      setEditedTranscript(txt);
    } catch (err) {
      console.error(err);
      setError("Gagal memproses suara otomatis. Anda dapat mengetik jawaban secara manual di bawah.");
      setAnsweringMode("text");
    } finally {
      setLoading(false);
    }
  };

  // Submit Text/Edited Answer
  const handleSaveTextAnswer = async () => {
    const finalAnswerText = answeringMode === "text" ? textAnswer : editedTranscript;
    if (!finalAnswerText.trim()) {
      setError("Silakan masukkan atau rekam jawaban Anda terlebih dahulu.");
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
        throw new Error("Gagal memperbarui teks jawaban.");
      }

      // Trigger evaluation
      const evalRes = await fetch(`${API_BASE}/interviews/${currentSession.id}/evaluate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!evalRes.ok) {
        throw new Error("Gagal memicu evaluasi jawaban Sistem.");
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
    if (!res.ok) throw new Error("Gagal mengambil detail sesi.");
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
        <div style={styles.header}>
          <h2 style={styles.pageLabel}>Interview Arena</h2>

          <div style={styles.headerRight}>
            <FiBell size={18} style={styles.bellIcon} />

            {profile.photo ? (
              <img src={profile.photo} alt="profile" style={styles.avatar} />
            ) : (
              <div style={styles.avatarFallback}>
                {(profile.fullName || "U")[0]}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>
                {profile.fullName || "User"}
              </div>
              <div style={styles.roleLabel}>Job Seeker</div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={styles.content}>
          {error && (
            <div style={styles.errorBanner}>
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading && view !== "arena" && (
            <div style={styles.skeletonContainer}>
              <div style={styles.skeletonLoader}>
                <div style={styles.skeletonCircle}></div>
                <h3>Sedang Berkomunikasi dengan Sistem...</h3>
                <p>Memproses pembuatan sesi, evaluasi, atau transkripsi rekaman terbaik Anda.</p>
              </div>
            </div>
          )}

          {!loading && view === "dashboard" && (
            <>
              <div style={styles.titleRow}>
                <FiMic size={30} style={{ color: "#0f7c82" }} />
                <h1 style={styles.title}>Simulasi Wawancara Kerja</h1>
              </div>

              <p style={styles.subtitle}>
                Latih keahlian berbicara dan menjawab pertanyaan teknis & behavioral langsung bersama sistem penguji kami.
              </p>

              {/* STATS */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Sesi Selesai</span>
                  <span style={styles.statValue}>{totalSessions}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Rata-Rata Skor</span>
                  <span style={styles.statValue}>{averageScore ? `${averageScore} / 100` : "-"}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Performa Terbaik</span>
                  <span style={styles.statValue}>{bestScore ? `${bestScore} / 100` : "-"}</span>
                </div>
              </div>

              {/* START PRACTICE BOX */}
              <div style={styles.practiceCard}>
                <h3 style={{ marginTop: 0, color: "#1e293b" }}>Mulai Sesi Latihan Baru</h3>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                  Sistem akan berperan sebagai pewawancara ahli yang menghasilkan pertanyaan tajam, relevan dengan target karir Anda.
                </p>
                <button style={styles.button} onClick={handleStartSetup}>
                  <FiZap size={16} />
                  Mulai Latihan Wawancara
                </button>
              </div>

              {/* PAST SESSIONS */}
              <h3 style={{ color: "#1e293b", margin: "32px 0 16px" }}>Riwayat Simulasi</h3>
              {sessions.length === 0 ? (
                <div style={styles.emptyState}>Belum ada riwayat sesi latihan interview.</div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={styles.th}>Sesi</th>
                        <th style={styles.th}>Tanggal Pembuatan</th>
                        <th style={styles.th}>Pertanyaan Utama</th>
                        <th style={styles.th}>Status Sesi</th>
                        <th style={styles.th}>Skor Evaluasi</th>
                        <th style={styles.th}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((sess) => (
                        <tr key={sess.id} style={styles.tableRow}>
                          <td style={styles.td}>#{sess.id}</td>
                          <td style={styles.td}>
                            {new Date(sess.created_at).toLocaleDateString("id-ID", {
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
                              {sess.status === "completed" ? "Selesai" : sess.status}
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
                                Lihat Review
                              </button>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Belum Selesai</span>
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
                Kembali ke Riwayat
              </button>

              <h2 style={{ marginTop: "16px", color: "#1e293b" }}>Sesuaikan Topik Wawancara</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>
                Sistem akan merancang sebuah pertanyaan khusus sesuai dengan target role dan level pengalaman yang Anda tetapkan.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Target Role Pekerjaan</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Contoh: Frontend Developer, UI/UX Designer, Data Analyst"
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Level Pengalaman</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={styles.selectField}
                >
                  <option value="Fresh Graduate">Fresh Graduate / Entry-level</option>
                  <option value="Junior">Junior (1-2 tahun)</option>
                  <option value="Mid-level">Mid-level (3-5 tahun)</option>
                  <option value="Senior">Senior (5+ tahun)</option>
                </select>
              </div>

              <button style={styles.button} onClick={handleGenerateQuestion}>
                <FiZap size={16} />
                Buat Pertanyaan & Mulai
              </button>
            </div>
          )}

          {/* VIEW: ACTIVE PRACTICE ARENA */}
          {view === "arena" && (
            <div style={styles.arenaCard}>
              <div style={styles.arenaHeader}>
                <span style={styles.arenaBadge}>TIM SIMULASI INTERVIEW</span>
                <h2>Pertanyaan Pewawancara Sistem:</h2>
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
                  Simulasi Video Wawancara
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
                  Ketik Jawaban Langsung
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
                          Hentikan & Transkripsikan
                        </button>
                      </div>
                    ) : transcript ? (
                      <div style={styles.transcriptArea}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={styles.sectionMiniTitle}>Hasil Transkripsi Jawaban Anda</span>
                          <button onClick={() => setIsEditingTranscript(!isEditingTranscript)} style={styles.editLink}>
                            {isEditingTranscript ? "Selesai Edit" : "Edit Teks"}
                          </button>
                        </div>

                        {isEditingTranscript ? (
                          <textarea
                            value={editedTranscript}
                            onChange={(e) => setEditedTranscript(e.target.value)}
                            style={styles.textareaField}
                            rows={6}
                          />
                        ) : (
                          <div style={styles.transcriptBox}>{editedTranscript || "(Hasil transkripsi kosong)"}</div>
                        )}

                        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                          <button onClick={startRecording} style={styles.reRecordBtn}>
                            <FiVideo size={16} />
                            Rekam Ulang Video
                          </button>
                          <button onClick={handleSaveTextAnswer} style={styles.submitArenaBtn} disabled={loading}>
                            {loading ? "Mengevaluasi..." : "Kirim Jawaban untuk Evaluasi Sistem"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.recordStartArea}>
                        <div style={styles.webcamPlaceholder}>
                          <FiVideo size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
                          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                            Kamera & Mikrofon siap digunakan untuk merekam simulasi video Anda.
                          </p>
                        </div>
                        <button onClick={startRecording} style={styles.recordStartBtn}>
                          <FiVideo size={24} />
                          Mulai Rekam Video
                        </button>
                        <p style={{ color: "#64748b", marginTop: "16px", fontSize: "13px" }}>
                          Gunakan kamera dan mikrofon browser Anda untuk menjawab. Durasi optimal: 30 - 120 detik.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.textPracticeArena}>
                    <textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Ketikkan jawaban lengkap Anda di sini..."
                      style={styles.textareaField}
                      rows={8}
                    />
                    <button onClick={handleSaveTextAnswer} style={styles.submitArenaBtn} disabled={loading}>
                      {loading ? "Mengevaluasi..." : "Kirim Jawaban untuk Evaluasi Sistem"}
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
                Kembali ke Dashboard
              </button>

              <div style={styles.reviewHeader}>
                <span style={styles.reviewBadge}>HASIL REVIEW EVALUASI SISTEM</span>
                <h1 style={{ margin: "12px 0 6px", color: "#1e293b" }}>Simulasi #{selectedSession.id}</h1>
                <p style={{ color: "#64748b", margin: 0 }}>
                  Pertanyaan: <span style={{ fontStyle: "italic" }}>"{selectedSession.question_text}"</span>
                </p>
              </div>

              {/* Dynamic Score Report Grid */}
              <div style={styles.evaluationScoreboard}>
                {/* Left Side: overall radial column */}
                <div style={styles.overallScoreCol}>
                  <div style={styles.radialWrapper}>
                    <svg style={styles.svgCircular} viewBox="0 0 36 36">
                      <path
                        style={styles.circularBg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        style={{
                          ...styles.circularFill,
                          stroke: selectedSession.overall_score >= 80 ? "#10b981" : "#f59e0b",
                          strokeDasharray: `${selectedSession.overall_score || 0}, 100`,
                        }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div style={styles.circularText}>
                      <span style={styles.circularVal}>{selectedSession.overall_score}%</span>
                      <span style={styles.circularSubText}>Skor Total</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Horizontal Bar Metrics */}
                <div style={styles.metricsCol}>
                  {/* Communication */}
                  <div style={styles.metricRow}>
                    <div style={styles.metricLabels}>
                      <span style={styles.metricTitle}>Kemampuan Komunikasi</span>
                      <span style={styles.metricPercent}>{selectedSession.transcript?.metadata_json?.communicationScore || selectedSession.overall_score}%</span>
                    </div>
                    <div style={styles.barOuter}>
                      <div style={{ ...styles.barInner, background: "#10b981", width: `${selectedSession.transcript?.metadata_json?.communicationScore || selectedSession.overall_score}%` }}></div>
                    </div>
                  </div>

                  {/* Relevance */}
                  <div style={styles.metricRow}>
                    <div style={styles.metricLabels}>
                      <span style={styles.metricTitle}>Kesesuaian Pertanyaan (Relevance)</span>
                      <span style={styles.metricPercent}>{selectedSession.transcript?.metadata_json?.relevanceScore || selectedSession.overall_score}%</span>
                    </div>
                    <div style={styles.barOuter}>
                      <div style={{ ...styles.barInner, background: "#3b82f6", width: `${selectedSession.transcript?.metadata_json?.relevanceScore || selectedSession.overall_score}%` }}></div>
                    </div>
                  </div>

                  {/* Structure */}
                  <div style={styles.metricRow}>
                    <div style={styles.metricLabels}>
                      <span style={styles.metricTitle}>Struktur Jawaban</span>
                      <span style={styles.metricPercent}>{selectedSession.transcript?.metadata_json?.structureScore || selectedSession.overall_score}%</span>
                    </div>
                    <div style={styles.barOuter}>
                      <div style={{ ...styles.barInner, background: "#8b5cf6", width: `${selectedSession.transcript?.metadata_json?.structureScore || selectedSession.overall_score}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Summary Column */}
              <div style={styles.feedbackSection}>
                <h3 style={{ color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>Ulasan Penguji</h3>
                <p style={{ color: "#334155", lineHeight: "1.6", fontSize: "15px" }}>
                  {selectedSession.transcript?.metadata_json?.summary || "Jawaban Anda dinilai sangat baik dalam menunjukkan kemampuan teknis secara sistematis."}
                </p>
              </div>

              {/* Two Column strengths & improvements */}
              <div style={styles.bulletGrid}>
                <div style={styles.bulletCard}>
                  <h4 style={{ color: "#065f46", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
                    <FiCheckCircle size={18} />
                    Kekuatan Jawaban Anda (Strengths)
                  </h4>
                  <ul style={styles.bullets}>
                    {selectedSession.transcript?.metadata_json?.strengths?.map((str, idx) => (
                      <li key={idx} style={styles.bulletLi}>{str}</li>
                    )) || (
                      <>
                        <li style={styles.bulletLi}>Penggunaan kosa kata profesional tepat sasaran.</li>
                        <li style={styles.bulletLi}>Menguraikan implementasi coding dengan detail logis.</li>
                      </>
                    )}
                  </ul>
                </div>

                <div style={styles.bulletCard}>
                  <h4 style={{ color: "#92400e", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0" }}>
                    <FiAlertCircle size={18} />
                    Saran & Perbaikan (Improvements)
                  </h4>
                  <ul style={styles.bullets}>
                    {selectedSession.transcript?.metadata_json?.improvements?.map((imp, idx) => (
                      <li key={idx} style={styles.bulletLi}>{imp}</li>
                    )) || (
                      <>
                        <li style={styles.bulletLi}>Berikan contoh implementasi terukur di masa lalu.</li>
                        <li style={styles.bulletLi}>Kurangi penggunaan jeda 'ehm' atau transisi berulang.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Side by side Answer Comparison */}
              <div style={styles.comparisonBox}>
                <h3 style={{ color: "#1e293b", marginBottom: "20px" }}>Komparasi Konstruksi Jawaban</h3>
                <div style={styles.comparisonGrid}>
                  <div style={styles.compColumn}>
                    <h4 style={styles.compColTitle}>Jawaban Anda</h4>
                    <div style={styles.compTextScroll}>
                      {selectedSession.transcript?.edited_transcript || selectedSession.transcript?.raw_transcript || "Tidak tersedia."}
                    </div>
                  </div>
                  <div style={styles.compColumn}>
                    <h4 style={{ ...styles.compColTitle, color: "#0f7c82" }}>Saran Jawaban Ideal AI</h4>
                    <div style={{ ...styles.compTextScroll, background: "#f0fdfa", borderLeft: "4px solid #0f7c82" }}>
                      {selectedSession.transcript?.metadata_json?.suggestedAnswer || "Sebagai insinyur berpengalaman, Anda dapat menjawab dengan struktur STAR (Situation, Task, Action, Result) berfokus pada efisiensi skala microservices."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ textAlign: "center", marginTop: "36px" }}>
                <button onClick={handleBackToDashboard} style={styles.closeReviewBtn}>
                  Selesai Review & Kembali
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
    background: "white",
    borderRadius: "20px",
    padding: "60px 40px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  skeletonLoader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  skeletonCircle: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    border: "4px solid #f1f5f9",
    borderTopColor: "#0f7c82",
    animation: "spin 1s linear infinite",
    marginBottom: "24px",
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
};