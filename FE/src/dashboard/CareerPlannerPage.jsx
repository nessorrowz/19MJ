import { useState, useEffect } from "react";
import { FiBell, FiCompass, FiCheckCircle, FiBookOpen, FiClock, FiPlus, FiX, FiAward, FiArrowLeft, FiAlertCircle } from "react-icons/fi";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/ai' : '/api/ai';

export default function CareerPlannerPage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  // State Management
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState(null);

  // Form Inputs
  const [targetRole, setTargetRole] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [currentSkills, setCurrentSkills] = useState([]);
  const [timelineWeeks, setTimelineWeeks] = useState(12); // Default to 3 months (12 weeks)

  // Interactive Checklist State (persisted per user & role)
  const checklistKey = `roadmap_tasks_${currentUser.email}_${roadmap?.targetRole || "default"}`;
  const [checkedTasks, setCheckedTasks] = useState({});

  // Active Accordion Phase Index
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  // Load latest roadmap on mount
  useEffect(() => {
    fetchLatestRoadmap();
  }, []);

  // Sync checklist state when roadmap loads
  useEffect(() => {
    if (roadmap) {
      const saved = JSON.parse(localStorage.getItem(checklistKey) || "{}");
      setCheckedTasks(saved);
    }
  }, [roadmap, checklistKey]);

  const fetchLatestRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/career-roadmap/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setRoadmap(null);
      } else if (!res.ok) {
        throw new Error("Failed to load latest career roadmap.");
      } else {
        const data = await res.json();
        setRoadmap(data.result?.result_json || data.result);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      setError("Please enter your target role.");
      return;
    }
    if (currentSkills.length === 0) {
      setError("Please add at least one current skill.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/career-roadmap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetRole: targetRole.trim(),
          currentSkills,
          preferredTimelineWeeks: Number(timelineWeeks),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate career roadmap.");
      }

      const data = await res.json();
      setRoadmap(data.result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add Skill Tag
  const handleAddSkill = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim().replace(/,$/, "");
      if (val && !currentSkills.includes(val)) {
        setCurrentSkills([...currentSkills, val]);
        setSkillInput("");
      }
    }
  };

  const handleRemoveSkill = (idx) => {
    setCurrentSkills(currentSkills.filter((_, i) => i !== idx));
  };

  // Toggle checklist tasks
  const handleToggleTask = (taskKey) => {
    const updated = { ...checkedTasks, [taskKey]: !checkedTasks[taskKey] };
    setCheckedTasks(updated);
    localStorage.setItem(checklistKey, JSON.stringify(updated));
  };

  const getCompletedCount = (phaseIdx) => {
    if (!roadmap?.phases?.[phaseIdx]) return 0;
    const phase = roadmap.phases[phaseIdx];
    return phase.tasks.filter((_, tIdx) => checkedTasks[`${phaseIdx}_${tIdx}`]).length;
  };

  const resetRoadmap = () => {
    setRoadmap(null);
    setTargetRole("");
    setCurrentSkills([]);
  };

  return (
    <div style={styles.container}>
      <CandidateSidebar active="career" />

      <div style={styles.main}>
        {/* HEADER */}
        <CandidateHeader title="Career Planner" />

        {/* CONTENT */}
        <div style={styles.contentWrapper}>
          {error && (
            <div style={styles.errorBanner}>
              <FiAlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={styles.skeletonContainer}>
              <div style={styles.skeletonLoader}>
                <div style={styles.skeletonCircle}></div>
                <h3 style={styles.skeletonTitle}>Mapping Your Future...</h3>
                <p style={styles.skeletonDesc}>
                  Our system is formulating a step-by-step learning roadmap, technical skill gaps, and best deliverables for your career.
                </p>
                <div style={styles.pulseBar}></div>
              </div>
            </div>
          ) : !roadmap ? (
            /* WIZARD FORM */
            <div style={styles.card}>
              <div style={styles.iconWrapper}>
                <FiCompass size={26} style={{ color: "#0d9488" }} />
              </div>

              <h2 style={styles.cardTitle}>Where do you want your career to go?</h2>
              <p style={styles.cardDesc}>
                Define your target role and outline a structured career path with clear learning milestones adapted to your current skillset.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Developer, Product Manager, DevOps Engineer"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Your Current Skills (Press Enter/Comma)</label>
                <div style={styles.tagInputContainer}>
                  {currentSkills.map((skill, idx) => (
                    <span key={idx} style={styles.tagChip}>
                      {skill}
                      <FiX size={12} style={styles.tagClose} onClick={() => handleRemoveSkill(idx)} />
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder={currentSkills.length === 0 ? "e.g. Node.js, SQL, Git" : "Add more skills..."}
                    style={styles.tagInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Estimated Roadmap Duration</label>
                <select
                  value={timelineWeeks}
                  onChange={(e) => setTimelineWeeks(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value={4}>1 Month (4 Weeks)</option>
                  <option value={12}>3 Months (12 Weeks)</option>
                  <option value={24}>6 Months (24 Weeks)</option>
                  <option value={48}>1 Year (48 Weeks)</option>
                </select>
              </div>

              <button style={styles.button} onClick={handleGenerate}>
                <FiCompass size={16} />
                Create My Learning Roadmap
              </button>
            </div>
          ) : (
            /* ROADMAP VIEW */
            <div style={styles.roadmapView}>
              {/* Back Button */}
              <button onClick={resetRoadmap} style={styles.backButton}>
                <FiArrowLeft size={16} />
                Back to Form
              </button>

              {/* Top Banner Card */}
              <div style={styles.roadmapHeaderCard}>
                <div style={styles.headerLeftCol}>
                  <span style={styles.roadmapBadge}>ACTIVE ROADMAP</span>
                  <h1 style={styles.roadmapTargetTitle}>{roadmap.targetRole}</h1>
                  <p style={styles.roadmapSummaryText}>{roadmap.summary}</p>

                  <div style={styles.skillGapBox}>
                    <h4 style={styles.sectionMiniTitle}>Key Skill Gaps</h4>
                    <div style={styles.tagInputContainer}>
                      {roadmap.skillGaps?.map((gap, idx) => (
                        <span key={idx} style={styles.gapChip}>
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Circular Score Column */}
                <div style={styles.headerRightCol}>
                  <div style={styles.circularContainer}>
                    <svg style={styles.svgCircular} viewBox="0 0 36 36">
                      <path
                        style={styles.circularBg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        style={{
                          ...styles.circularFill,
                          strokeDasharray: `${roadmap.readinessScore || 0}, 100`,
                        }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div style={styles.circularText}>
                      <span style={styles.circularVal}>{roadmap.readinessScore}%</span>
                      <span style={styles.circularSubText}>Readiness</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                    Career Readiness Score
                  </div>
                </div>
              </div>

              {/* TIMELINE SECTION */}
              <h2 style={styles.timelineLabel}>Your Learning Phase Roadmap</h2>
              <div style={styles.timelineWrapper}>
                {roadmap.phases?.map((phase, pIdx) => {
                  const isActive = activePhaseIdx === pIdx;
                  const totalTasks = phase.tasks?.length || 0;
                  const completedTasks = getCompletedCount(pIdx);
                  const isFinished = completedTasks === totalTasks && totalTasks > 0;

                  return (
                    <div key={pIdx} style={styles.phaseNode}>
                      {/* Left timeline bar indicators */}
                      <div style={styles.timelineSidebar}>
                        <div
                          style={{
                            ...styles.timelineMarker,
                            background: isFinished ? "#10b981" : isActive ? "#0f7c82" : "#cbd5e1",
                            boxShadow: isActive ? "0 0 0 4px rgba(15,124,130,0.18)" : "none",
                          }}
                        >
                          {isFinished ? <FiCheckCircle size={16} color="white" /> : pIdx + 1}
                        </div>
                        {pIdx < roadmap.phases.length - 1 && <div style={styles.timelineConnector}></div>}
                      </div>

                      {/* Right phase card contents */}
                      <div
                        style={{
                          ...styles.phaseCard,
                          borderColor: isActive ? "#0f7c82" : "#e2e8f0",
                          background: isActive ? "#f8fafc" : "white",
                        }}
                        onClick={() => setActivePhaseIdx(pIdx)}
                      >
                        <div style={styles.phaseHeader}>
                          <div>
                            <h3 style={styles.phaseTitle}>{phase.title}</h3>
                            <div style={styles.phaseMetaRow}>
                              <span style={styles.metaBadge}>
                                <FiClock size={12} />
                                {phase.durationWeeks} Weeks
                              </span>
                              <span style={styles.metaBadgeProgress}>
                                Progress: {completedTasks} / {totalTasks}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Phase Contents */}
                        {isActive && (
                          <div style={styles.phaseBody}>
                            <div style={styles.focusSection}>
                              <h4 style={styles.focusLabel}>Main Focus</h4>
                              <p style={styles.focusText}>{phase.focus}</p>
                            </div>

                            {/* Learning Tasks Checkboxes */}
                            <div style={styles.tasksSection}>
                              <h4 style={styles.tasksTitle}>Learning Steps & Topics</h4>
                              {phase.tasks?.map((task, tIdx) => {
                                const taskKey = `${pIdx}_${tIdx}`;
                                const isChecked = checkedTasks[taskKey];

                                return (
                                  <label
                                    key={tIdx}
                                    style={{
                                      ...styles.taskLabel,
                                      background: isChecked ? "#f1f5f9" : "white",
                                      borderColor: isChecked ? "#0f7c82" : "#e2e8f0",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTask(taskKey);
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!isChecked}
                                      onChange={() => {}}
                                      style={styles.taskCheckbox}
                                    />
                                    <span style={{
                                      ...styles.taskText,
                                      textDecoration: isChecked ? "line-through" : "none",
                                      color: isChecked ? "#64748b" : "#1e293b",
                                    }}>
                                      {task}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>

                            {/* Milestone Deliverables */}
                            <div style={styles.deliverablesSection}>
                              <h4 style={styles.deliverablesTitle}>Milestone Deliverables</h4>
                              <ul style={styles.deliverablesList}>
                                {phase.deliverables?.map((del, dIdx) => (
                                  <li key={dIdx} style={styles.deliverableItem}>
                                    <FiAward size={14} style={{ color: "#0f7c82", marginRight: 8, flexShrink: 0 }} />
                                    <span>{del}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset Roadmap Action Box */}
              <div style={styles.actionBox}>
                <h3>Want to create a roadmap with a new target?</h3>
                <p>You can reset and enter a new target role and skills anytime.</p>
                <button onClick={resetRoadmap} style={styles.resetBtn}>
                  Start New Career Plan
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
  pageTitle: {
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
    objectFit: "cover",
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
  contentWrapper: {
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
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
    textAlign: "center",
  },
  iconWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "#eafaf7",
    color: "#0f7c82",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  cardTitle: {
    margin: "0 0 12px 0",
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
  },
  cardDesc: {
    color: "#64748b",
    marginBottom: "36px",
    lineHeight: 1.6,
    fontSize: "15px",
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
  input: {
    width: "100%",
    height: "50px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0 16px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border 0.2s",
  },
  tagInputContainer: {
    width: "100%",
    minHeight: "50px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "6px 12px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    boxSizing: "border-box",
    alignItems: "center",
    background: "white",
  },
  tagChip: {
    background: "#e2f2f1",
    color: "#0f7c82",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tagClose: {
    cursor: "pointer",
    borderRadius: "50%",
    padding: "2px",
  },
  tagInput: {
    border: "none",
    outline: "none",
    flex: 1,
    minWidth: "150px",
    fontSize: "15px",
    height: "36px",
  },
  selectInput: {
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
  button: {
    width: "100%",
    marginTop: "12px",
    height: "54px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "16px",
    color: "white",
    background: "linear-gradient(135deg, #0f7c82, #0d9488)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "transform 0.15s, opacity 0.15s",
  },
  footerText: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#64748b",
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
  skeletonTitle: {
    margin: "0 0 12px 0",
    fontSize: "20px",
    fontWeight: 700,
    color: "#0f172a",
  },
  skeletonDesc: {
    color: "#64748b",
    fontSize: "14px",
    maxWidth: "500px",
    lineHeight: 1.6,
    margin: "0 0 32px 0",
  },
  pulseBar: {
    width: "140px",
    height: "4px",
    background: "#f1f5f9",
    borderRadius: "2px",
    position: "relative",
    overflow: "hidden",
  },
  backButton: {
    border: "none",
    background: "transparent",
    color: "#0f7c82",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "24px",
    padding: 0,
  },
  roadmapView: {
    display: "flex",
    flexDirection: "column",
  },
  roadmapHeaderCard: {
    background: "white",
    borderRadius: "20px",
    padding: "36px",
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "36px",
    marginBottom: "32px",
  },
  headerLeftCol: {
    flex: 1,
  },
  roadmapBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  roadmapTargetTitle: {
    margin: "12px 0 8px 0",
    fontSize: "26px",
    fontWeight: 800,
    color: "#0f172a",
  },
  roadmapSummaryText: {
    color: "#475569",
    lineHeight: 1.6,
    fontSize: "15px",
    margin: "0 0 24px 0",
  },
  sectionMiniTitle: {
    margin: "0 0 10px 0",
    fontSize: "13px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  gapChip: {
    background: "#fef2f2",
    color: "#ef4444",
    border: "1px solid #fee2e2",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
  },
  circularContainer: {
    position: "relative",
    width: "120px",
    height: "120px",
    margin: "0 auto",
  },
  svgCircular: {
    width: "100%",
    height: "100%",
  },
  circularBg: {
    fill: "none",
    stroke: "#f1f5f9",
    strokeWidth: 3,
  },
  circularFill: {
    fill: "none",
    stroke: "#0f7c82",
    strokeWidth: 3,
    strokeLinecap: "round",
    transition: "stroke-dasharray 0.3s ease",
  },
  circularText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  circularVal: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0f172a",
  },
  circularSubText: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: 500,
  },
  timelineLabel: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 24px 0",
  },
  timelineWrapper: {
    position: "relative",
  },
  phaseNode: {
    display: "flex",
    gap: "24px",
    marginBottom: "16px",
  },
  timelineSidebar: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "36px",
  },
  timelineMarker: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700,
    color: "white",
    zIndex: 2,
    transition: "background-color 0.2s, box-shadow 0.2s",
  },
  timelineConnector: {
    width: "2px",
    flex: 1,
    background: "#cbd5e1",
    margin: "8px 0",
  },
  phaseCard: {
    flex: 1,
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "border-color 0.2s, background-color 0.2s",
  },
  phaseTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a",
  },
  phaseMetaRow: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  metaBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  metaBadgeProgress: {
    background: "#e0f2fe",
    color: "#0369a1",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
  },
  phaseBody: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #f1f5f9",
  },
  focusSection: {
    marginBottom: "20px",
  },
  focusLabel: {
    margin: "0 0 6px 0",
    fontSize: "13px",
    color: "#64748b",
    textTransform: "uppercase",
  },
  focusText: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  tasksSection: {
    marginBottom: "24px",
  },
  tasksTitle: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    color: "#64748b",
    textTransform: "uppercase",
  },
  taskLabel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    border: "1px solid",
    borderRadius: "10px",
    marginBottom: "8px",
    cursor: "pointer",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border 0.2s, background 0.2s",
  },
  taskCheckbox: {
    accentColor: "#0f7c82",
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  taskText: {
    fontWeight: 500,
  },
  deliverablesSection: {},
  deliverablesTitle: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    color: "#64748b",
    textTransform: "uppercase",
  },
  deliverablesList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  deliverableItem: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    color: "#334155",
    fontWeight: 500,
  },
  actionBox: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "32px",
    marginTop: "24px",
    textAlign: "center",
  },
  resetBtn: {
    background: "#0f7c82",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "12px",
  },
};
