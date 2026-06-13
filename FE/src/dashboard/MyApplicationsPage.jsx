import React, { useState, useEffect } from "react";
import { 
  FiBell, FiArrowLeft, FiMapPin, FiClock, 
  FiCheckCircle, FiXCircle, FiLoader, FiEye, 
  FiFileText, FiBriefcase
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import api from "../utils/api";

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState("Doc"); // "Doc" or "Jobdetail"

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const userName = currentUser.full_name || currentUser.username || "User";

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await api.get('/jobs/candidate/applications');
        setApplications(res);
      } catch (err) {
        console.error('Failed to fetch applications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const getStatusConfig = (status) => {
    // Determine visual style based on application status
    const s = (status || 'pending').toLowerCase();
    switch(s) {
      case 'accepted':
        return { color: '#059669', bg: '#d1fae5', icon: <FiCheckCircle />, text: 'Accepted' };
      case 'rejected':
        return { color: '#dc2626', bg: '#fee2e2', icon: <FiXCircle />, text: 'Rejected' };
      case 'reviewed':
        return { color: '#2563eb', bg: '#dbeafe', icon: <FiEye />, text: 'Reviewed' };
      default:
        return { color: '#d97706', bg: '#fef3c7', icon: <FiLoader />, text: 'Pending' };
    }
  };

  return (
    <div style={styles.container}>
      <CandidateSidebar active="applications" />

      <div style={styles.main}>
        <CandidateHeader title="My Applications" />

        <div style={styles.content}>
          <AnimatePresence mode="wait">
            {!selectedApp ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.pageHeader}>
                  <h1 style={styles.title}>Application History</h1>
                  <p style={styles.subtitle}>Track your job application status and updates</p>
                </div>

                {loading ? (
                  <p>Loading applications...</p>
                ) : applications.length === 0 ? (
                  <div style={styles.emptyState}>
                    <FiBriefcase size={48} color="#cbd5e1" />
                    <h3>No applications yet</h3>
                    <p>Start browsing jobs and apply to see your history here.</p>
                  </div>
                ) : (
                  <div style={styles.listContainer}>
                    {applications.map((app) => {
                      const statusConf = getStatusConfig(app.status);
                      const applyDate = new Date(app.created_at).toLocaleDateString();

                      return (
                        <motion.div
                          key={app.id}
                          style={styles.card}
                          whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          onClick={() => setSelectedApp(app)}
                        >
                          <div style={styles.cardHeader}>
                            <div style={styles.jobInfo}>
                              {app.logo ? (
                                <img src={app.logo} alt="company logo" style={styles.companyLogo} />
                              ) : (
                                <div style={styles.companyLogoFallback}>
                                  <FiBriefcase size={20} />
                                </div>
                              )}
                              <div>
                                <h3 style={styles.jobTitle}>{app.title}</h3>
                                <p style={styles.companyName}>{app.company_name}</p>
                              </div>
                            </div>
                            <div style={{ ...styles.statusBadge, backgroundColor: statusConf.bg, color: statusConf.color }}>
                              {statusConf.icon}
                              <span>{statusConf.text}</span>
                            </div>
                          </div>

                          <div style={styles.cardFooter}>
                            <div style={styles.metaItem}>
                              <FiMapPin size={14} /> {app.location || 'Remote'}
                            </div>
                            <div style={styles.metaItem}>
                              <FiBriefcase size={14} /> {app.type || 'Full-time'}
                            </div>
                            <div style={styles.metaItem}>
                              <FiClock size={14} /> Applied on {applyDate}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.detailTop}>
                  <button style={styles.backBtn} onClick={() => { setSelectedApp(null); setActiveTab("Doc"); }}>
                    <FiArrowLeft size={16} /> Back to List
                  </button>
                  <div style={styles.pageHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h1 style={styles.title}>{selectedApp.title}</h1>
                      <div style={{ 
                        ...styles.statusBadge, 
                        ...getStatusConfig(selectedApp.status), 
                        fontSize: 14, padding: '6px 12px' 
                      }}>
                        {getStatusConfig(selectedApp.status).icon}
                        <span>{getStatusConfig(selectedApp.status).text}</span>
                      </div>
                    </div>
                    <p style={styles.subtitle}>{selectedApp.company_name} • {selectedApp.location || 'Remote'}</p>
                  </div>
                </div>

                <div style={styles.tabsContainer}>
                  <div 
                    style={{ ...styles.tab, borderBottom: activeTab === 'Doc' ? '2px solid #0f7c82' : '2px solid transparent', color: activeTab === 'Doc' ? '#0f7c82' : '#64748b' }}
                    onClick={() => setActiveTab('Doc')}
                  >
                    <FiFileText size={16} /> Submitted Documents
                  </div>
                  <div 
                    style={{ ...styles.tab, borderBottom: activeTab === 'Jobdetail' ? '2px solid #0f7c82' : '2px solid transparent', color: activeTab === 'Jobdetail' ? '#0f7c82' : '#64748b' }}
                    onClick={() => setActiveTab('Jobdetail')}
                  >
                    <FiBriefcase size={16} /> Job Details
                  </div>
                </div>

                <div style={styles.tabContent}>
                  {activeTab === 'Doc' ? (
                    <div style={styles.docTab}>
                      <h3>Application Summary</h3>
                      <p style={{color: '#64748b', marginBottom: 20}}>Here are the details and documents you submitted for this role.</p>
                      
                      <div style={styles.docItem}>
                        <div style={styles.docIcon}><FiFileText size={24} color="#0f7c82" /></div>
                        <div style={{flex: 1}}>
                          <h4>Resume / CV</h4>
                          <p>Uploaded from profile • {userName.replace(/\s+/g, '_')}_Resume.pdf</p>
                        </div>
                        <button style={styles.viewDocBtn}>View</button>
                      </div>

                      <div style={styles.analysisBox}>
                        <h4>Match Analysis</h4>
                        <div className="analysis-box">
                          {selectedApp.ai_analysis && selectedApp.ai_analysis.startsWith('{') ? (
                            <div className="formatted-analysis">
                              {/* Display specific fields if it's JSON */}
                              <div className="analysis-row"><strong>Strengths:</strong> {JSON.parse(selectedApp.ai_analysis).strengths?.join(', ')}</div>
                              <div className="analysis-row"><strong>Concerns:</strong> {JSON.parse(selectedApp.ai_analysis).concerns?.join(', ')}</div>
                            </div>
                          ) : (
                            selectedApp.ai_analysis || 'No analysis available for this application yet.'
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.jobDetailTab}>
                      <h3>About the Role</h3>
                      <div style={styles.metaRow}>
                        <div style={styles.detailMeta}><FiBriefcase /> {selectedApp.type || 'Full-time'}</div>
                        <div style={styles.detailMeta}><FiMapPin /> {selectedApp.location || 'Remote'}</div>
                        <div style={styles.detailMeta}><FiClock /> Applied {new Date(selectedApp.created_at).toLocaleDateString()}</div>
                      </div>
                      
                      <div style={styles.descSection}>
                        <h4>Description</h4>
                        <p>We are looking for a talented professional to join our team at {selectedApp.company_name}. In this role, you will be responsible for driving key initiatives and collaborating with cross-functional teams.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif" },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  header: {
    height: 88,
    background: "white",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    flexShrink: 0
  },
  pageLabel: { margin: 0, fontSize: 24, fontWeight: 700 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  avatar: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover" },
  roleLabel: { fontSize: 12, color: "#64748b" },
  avatarFallback: {
    width: 40, height: 40, borderRadius: "50%", background: "#0f7c82",
    display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700
  },
  content: { padding: 32, flex: 1, overflowY: "auto" },
  pageHeader: { marginBottom: 30 },
  title: { margin: "0 0 8px 0", fontSize: 28, color: "#0f172a" },
  subtitle: { margin: 0, color: "#64748b", fontSize: 16 },
  
  listContainer: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 24,
    cursor: "pointer",
    transition: "box-shadow 0.2s"
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  jobInfo: { display: "flex", gap: 16, alignItems: "center" },
  companyLogo: { width: 48, height: 48, borderRadius: 8, objectFit: "contain", background: "#f8fafc", padding: 4 },
  companyLogoFallback: { 
    width: 48, height: 48, borderRadius: 8, background: "#f1f5f9", 
    display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" 
  },
  jobTitle: { margin: "0 0 4px 0", fontSize: 18, color: "#0f172a" },
  companyName: { margin: 0, fontSize: 14, color: "#64748b" },
  statusBadge: { 
    display: "flex", alignItems: "center", gap: 6, 
    padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 500 
  },
  cardFooter: { display: "flex", gap: 24, borderTop: "1px solid #f1f5f9", paddingTop: 16 },
  metaItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#64748b" },
  
  emptyState: { 
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "60px 20px", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1",
    textAlign: "center"
  },
  
  // Detail View Styles
  detailTop: { marginBottom: 24 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
    color: "#64748b", fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 20, fontSize: 15
  },
  tabsContainer: {
    display: "flex", gap: 32, borderBottom: "1px solid #e2e8f0", marginBottom: 24
  },
  tab: {
    display: "flex", alignItems: "center", gap: 8, padding: "0 0 12px 0",
    fontWeight: 600, cursor: "pointer", fontSize: 15, transition: "color 0.2s"
  },
  tabContent: {
    background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, minHeight: 400
  },
  docTab: { display: "flex", flexDirection: "column", gap: 20 },
  docItem: { 
    display: "flex", alignItems: "center", gap: 16, padding: 20, 
    border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" 
  },
  docIcon: { width: 48, height: 48, background: "#e0f2fe", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  viewDocBtn: { 
    padding: "8px 16px", background: "white", border: "1px solid #cbd5e1", 
    borderRadius: 8, fontWeight: 500, cursor: "pointer", color: "#334155" 
  },
  analysisBox: {
    marginTop: 10, padding: 24, background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)", borderRadius: 12, border: "1px solid #99f6e4"
  },
  scoreCircle: {
    width: 60, height: 60, borderRadius: "50%", background: "white", border: "3px solid #0d9488",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#0f7c82"
  },
  
  jobDetailTab: { display: "flex", flexDirection: "column", gap: 24 },
  metaRow: { display: "flex", gap: 24, flexWrap: "wrap", paddingBottom: 20, borderBottom: "1px solid #f1f5f9" },
  detailMeta: { display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 15 },
  descSection: { lineHeight: 1.6, color: "#334155" }
};
