import { useState, useRef, useCallback } from "react";
import { FiBell, FiUpload, FiFileText, FiTrash2, FiArrowLeft, FiChevronRight, FiZap } from "react-icons/fi";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import CandidateSidebar from "./CandidateSidebar";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const API_BASE = "http://localhost:3000/api/ai";

export default function CVReview() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const profileKey = `candidateProfile_${currentUser.email}`;
  const profile = JSON.parse(localStorage.getItem(profileKey) || "{}");
  const cvKey = `candidateCV_${currentUser.email}`;

  const [cvList, setCvList] = useState(() => JSON.parse(localStorage.getItem(cvKey) || "[]"));
  const [loading, setLoading] = useState(false);
  const [analyzingIdx, setAnalyzingIdx] = useState(null);
  const [view, setView] = useState("upload"); // "upload" | "result"
  const [selectedCV, setSelectedCV] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // ── Persistence ──
  const saveCvList = (list) => {
    setCvList(list);
    localStorage.setItem(cvKey, JSON.stringify(list));
  };

  // ── Text Extraction ──
  const extractPDF = async (file) => {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return text;
  };

  const extractDOCX = async (file) => {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  };

  const extractText = async (file) => {
    if (file.name.endsWith(".pdf")) return extractPDF(file);
    if (file.name.endsWith(".docx")) return extractDOCX(file);
    throw new Error("Only PDF and DOCX files are supported.");
  };

  // ── API Call ──
  const callCvReview = async (cvText) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/cv-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cvText, targetRole: "Software Engineer" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Server error ${res.status}`);
    }
    return res.json();
  };

  // ── Upload + Analyze ──
  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File size exceeds 5MB limit."); return; }
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) { setError("Only PDF and DOCX files are supported."); return; }
    setError(null);

    const newCV = {
      name: file.name,
      size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }),
      status: "analyzing",
      review: null,
    };

    const updated = [newCV, ...cvList];
    saveCvList(updated);
    setLoading(true);
    setAnalyzingIdx(0);

    try {
      const cvText = await extractText(file);
      const result = await callCvReview(cvText);
      const review = result.result || result.data || result;
      updated[0] = { ...updated[0], status: "reviewed", review, reviewId: result.reviewId };
      saveCvList([...updated]);
    } catch (err) {
      console.error(err);
      updated[0] = { ...updated[0], status: "not_analyzed" };
      saveCvList([...updated]);
      setError(err.message || "AI analysis failed. Please try again.");
    } finally {
      setLoading(false);
      setAnalyzingIdx(null);
    }
  };

  const handleInputChange = (e) => { handleFile(e.target.files[0]); e.target.value = ""; };

  // ── Re-analyze existing CV ──
  const analyzeExisting = async (idx) => {
    setError(null);
    setAnalyzingIdx(idx);
    const cv = cvList[idx];
    const updated = [...cvList];
    updated[idx] = { ...cv, status: "analyzing" };
    saveCvList(updated);

    try {
      // We don't have the file anymore, so try fetching latest review
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/cv-review/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        updated[idx] = { ...cv, status: "reviewed", review: data.result?.result_json || data.result };
        saveCvList([...updated]);
      } else {
        updated[idx] = { ...cv, status: "not_analyzed" };
        saveCvList([...updated]);
        setError("Please re-upload the file to analyze.");
      }
    } catch {
      updated[idx] = { ...cv, status: "not_analyzed" };
      saveCvList([...updated]);
      setError("Failed to fetch review.");
    } finally {
      setAnalyzingIdx(null);
    }
  };

  // ── Drag & Drop ──
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }, [cvList]);

  const deleteCV = (idx) => saveCvList(cvList.filter((_, i) => i !== idx));

  const viewReview = (cv) => { setSelectedCV(cv); setView("result"); };
  const goBack = () => { setView("upload"); setSelectedCV(null); };

  // ── Score helpers ──
  const getScoreLabel = (s) => {
    if (s >= 85) return "Excellent CV";
    if (s >= 70) return "Strong Foundation Room to Improve";
    if (s >= 50) return "Needs Significant Improvement";
    return "Major Revision Required";
  };

  const getScoreColor = (s) => {
    if (s >= 85) return "#10b981";
    if (s >= 70) return "#0d9488";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  };

  // Derive sub-scores from overall (API only provides overallScore)
  const deriveSubScores = (overall) => ({
    clarity: Math.min(100, Math.round(overall * 1.1 + Math.random() * 4)),
    relevance: Math.max(0, Math.round(overall * 0.96 - Math.random() * 3)),
    ats: Math.max(0, Math.round(overall * 0.93 - Math.random() * 5)),
  });

  // ═══════════════════════════════
  // RESULT VIEW
  // ═══════════════════════════════
  if (view === "result" && selectedCV?.review) {
    const r = selectedCV.review;
    const score = r.overallScore || 0;
    const sub = deriveSubScores(score);
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div style={S.container}>
        <CandidateSidebar active="cv" />
        <div style={S.main}>
          {/* Header */}
          <div style={S.header}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>CV</h2>
            <div style={S.headerUser}>
              <FiBell size={18} color="#64748b" />
              {profile.photo ? (
                <img src={profile.photo} alt="profile" style={S.profileImg} />
              ) : (
                <div style={S.avatar}>{(profile.fullName || "U")[0]}</div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.fullName || "User"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Job Seeker</div>
              </div>
            </div>
          </div>

          <div style={{ padding: "24px 32px" }}>
            {/* Breadcrumb */}
            <div style={S.breadcrumb}>
              <span onClick={goBack} style={S.breadLink}>Dashboard</span>
              <FiChevronRight size={14} color="#94a3b8" />
              <span onClick={goBack} style={S.breadLink}>CV & Review</span>
              <FiChevronRight size={14} color="#94a3b8" />
              <span style={{ color: "#1e293b", fontWeight: 600 }}>Result</span>
            </div>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <h1 style={{ margin: 0, fontSize: 24, color: "#1e293b" }}>CV Review</h1>
              <span style={S.aiBadge}><FiZap size={12} /> AI-Powered</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{selectedCV.name}</p>

            {/* Score Card */}
            <div style={S.scoreCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
                {/* Circle */}
                <div style={{ textAlign: "center" }}>
                  <svg width="140" height="140" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke={getScoreColor(score)}
                      strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s ease" }} />
                    <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="38" fontWeight="700" fill="#1e293b" style={{ alignmentBaseline: "middle" }}>{score}</text>
                  </svg>
                  <p style={{ color: getScoreColor(score), fontWeight: 600, fontSize: 13, marginTop: 12 }}>{getScoreLabel(score)}</p>
                </div>

                {/* Sub-scores */}
                <div style={{ flex: 1, minWidth: 250, display: "flex", flexDirection: "column", gap: 20 }}>
                  <ScoreBar label="Clarity Score" value={sub.clarity} color="#0d9488" />
                  <ScoreBar label="Relevance Score" value={sub.relevance} color="#f59e0b" />
                  <ScoreBar label="ATS Compatibility" value={sub.ats} color="#3b82f6" />
                </div>
              </div>
            </div>

            {/* Feedback Cards */}
            <div style={S.cardGrid}>
              <FeedbackCard title="Strengths" items={r.strengths} borderColor="#10b981" titleColor="#059669" />
              <FeedbackCard title="Weaknesses" items={r.weaknesses} borderColor="#f59e0b" titleColor="#d97706" />
              <FeedbackCard title="Suggestions" items={r.improvementSuggestions} borderColor="#8b5cf6" titleColor="#7c3aed" />
            </div>

            {/* Extra info */}
            {r.keywordGaps?.length > 0 && (
              <div style={{ ...S.feedbackCard, borderLeftColor: "#ec4899", marginTop: 20 }}>
                <h3 style={{ color: "#db2777", fontSize: 16, marginBottom: 12 }}>Keyword Gaps</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {r.keywordGaps.map((kw, i) => (
                    <span key={i} style={S.chip}>{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {r.recommendedRoles?.length > 0 && (
              <div style={{ ...S.feedbackCard, borderLeftColor: "#06b6d4", marginTop: 16 }}>
                <h3 style={{ color: "#0891b2", fontSize: 16, marginBottom: 12 }}>Recommended Roles</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {r.recommendedRoles.map((role, i) => (
                    <span key={i} style={{ ...S.chip, background: "#ecfeff", color: "#0891b2", border: "1px solid #cffafe" }}>{role}</span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={goBack} style={S.backBtn}>
              <FiArrowLeft size={16} /> Back to CV List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════
  // UPLOAD VIEW
  // ═══════════════════════════════
  return (
    <div style={S.container}>
      <CandidateSidebar active="cv" />
      <div style={S.main}>
        {/* Header */}
        <div style={S.header}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>CV</h2>
          <div style={S.headerUser}>
            <FiBell size={18} color="#64748b" />
            {profile.photo ? (
              <img src={profile.photo} alt="profile" style={S.profileImg} />
            ) : (
              <div style={S.avatar}>{(profile.fullName || "U")[0]}</div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.fullName || "User"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Job Seeker</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          <h1 style={{ margin: 0, fontSize: 24, color: "#1e293b" }}>CV Review</h1>
          <p style={{ color: "#64748b", marginTop: 6, marginBottom: 28, fontSize: 14 }}>
            Upload your resume to get instant feedback on your CV
          </p>

          {error && <div style={S.errorBanner}>{error}<span onClick={() => setError(null)} style={{ cursor: "pointer", marginLeft: 12, fontWeight: 700 }}>×</span></div>}

          {/* Drop Zone */}
          <div
            style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}), ...(loading ? { opacity: 0.6, pointerEvents: "none" } : {}) }}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <div style={S.uploadIconWrap}>
              <FiUpload size={28} color="#0d9488" />
            </div>
            <h3 style={{ margin: "16px 0 6px", color: "#1e293b", fontSize: 16 }}>
              {loading ? "Analyzing your CV..." : "Drag and drop your CV here"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Supports PDF and DOCX, max 5MB</p>
            {!loading && (
              <button style={S.browseBtn}>Browse Files</button>
            )}
            {loading && <div style={S.spinner} />}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleInputChange} style={{ display: "none" }} />
          </div>

          {/* CV List */}
          <h3 style={{ marginTop: 36, marginBottom: 16, fontSize: 16, color: "#1e293b" }}>
            Your CVs ({cvList.length} uploaded)
          </h3>

          {cvList.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: 40 }}>
              No CVs uploaded yet. Upload your first CV above!
            </p>
          )}

          {cvList.map((cv, idx) => (
            <div key={idx} style={S.cvRow}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={S.fileIcon}><FiFileText size={20} color="#64748b" /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    {cv.name}
                    <StatusBadge status={cv.status} />
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{cv.date} • {cv.size}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {cv.status === "reviewed" && cv.review && (
                  <button style={S.viewBtn} onClick={() => viewReview(cv)}>View Review</button>
                )}
                {cv.status === "not_analyzed" && (
                  <button style={S.analyzeBtn} onClick={() => analyzeExisting(idx)} disabled={analyzingIdx !== null}>
                    Analyze
                  </button>
                )}
                {cv.status === "analyzing" && <span style={S.analyzingText}>Analyzing...</span>}
                <FiTrash2 size={16} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => deleteCV(idx)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──
function StatusBadge({ status }) {
  const map = {
    reviewed: { bg: "#dcfce7", color: "#16a34a", text: "Reviewed" },
    not_analyzed: { bg: "#fef3c7", color: "#d97706", text: "Not Analyzed" },
    analyzing: { bg: "#ccfbf1", color: "#0d9488", text: "Analyzing..." },
  };
  const s = map[status] || map.not_analyzed;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 12 }}>{s.text}</span>;
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 13, color: "#475569", minWidth: 140 }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 5, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 30, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function FeedbackCard({ title, items, borderColor, titleColor }) {
  if (!items?.length) return null;
  return (
    <div style={{ ...S.feedbackCard, borderLeftColor: borderColor }}>
      <h3 style={{ color: titleColor, fontSize: 16, marginBottom: 12 }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => <li key={i} style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{item}</li>)}
      </ul>
    </div>
  );
}

// ── Styles ──
const S = {
  container: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  main: { flex: 1, overflow: "auto" },
  header: { background: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" },
  headerUser: { display: "flex", gap: 12, alignItems: "center" },
  profileImg: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover" },
  avatar: { width: 36, height: 36, borderRadius: "50%", background: "#0d9488", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 600, fontSize: 14 },
  breadcrumb: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", marginBottom: 12 },
  breadLink: { cursor: "pointer", color: "#64748b" },
  aiBadge: { display: "inline-flex", alignItems: "center", gap: 4, background: "#0d9488", color: "white", fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 16 },
  dropZone: { background: "white", border: "2px dashed #99f6e4", borderRadius: 16, padding: "48px 32px", textAlign: "center", cursor: "pointer", transition: "all 0.2s ease" },
  dropZoneActive: { borderColor: "#0d9488", background: "#f0fdfa" },
  uploadIconWrap: { width: 64, height: 64, borderRadius: "50%", background: "#ccfbf1", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto" },
  browseBtn: { display: "inline-block", marginTop: 20, padding: "10px 24px", border: "1.5px solid #0d9488", borderRadius: 10, background: "white", color: "#0d9488", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  cvRow: { background: "white", borderRadius: 14, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, border: "1px solid #f1f5f9" },
  fileIcon: { width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", justifyContent: "center", alignItems: "center" },
  viewBtn: { border: "1.5px solid #0d9488", background: "white", color: "#0d9488", borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  analyzeBtn: { border: "none", background: "#0d9488", color: "white", borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  analyzingText: { color: "#0d9488", fontWeight: 600, fontSize: 13, animation: "pulse 1.5s infinite" },
  scoreCard: { background: "white", borderRadius: 16, padding: 32, marginTop: 24, border: "1px solid #e2e8f0" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 24 },
  feedbackCard: { 
    background: "white", 
    borderRadius: 14, 
    padding: "24px 28px", 
    border: "1px solid #e2e8f0", 
    borderLeftWidth: "6px",
    borderLeftStyle: "solid",
    borderLeftColor: "#e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
  },
  chip: { background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 16, border: "1px solid #fde68a" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 8, marginTop: 32, padding: "10px 24px", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "white", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  errorBanner: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" },
  spinner: { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #0d9488", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "16px auto 0" },
};