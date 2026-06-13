import React, { useEffect, useState, useRef } from "react";
import { FiCamera, FiMapPin, FiX, FiCheckCircle, FiAlertCircle, FiBriefcase, FiGlobe } from "react-icons/fi";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import api from "../utils/api";

export default function CompanyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSidebarNavigate = (path, executeNavigation) => {
    if (isDirty) {
      setPendingNavigation(() => executeNavigation);
    } else {
      executeNavigation();
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [company, setCompany] = useState({
    companyName: "",
    industry: "",
    headquarters: "",
    employees: "",
    website: "",
    description: "",
    email: "",
    phone: "",
    techStack: [],
    logo: ""
  });

  const [newTech, setNewTech] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        setCompany({
          companyName: user.company_name || "",
          industry: user.industry || "",
          headquarters: user.location || "",
          employees: "",
          website: user.website || "",
          description: user.description || "",
          email: user.email || "",
          phone: "",
          techStack: [],
          logo: user.logo || ""
        });
      } catch (err) {
        console.error("Failed to load company profile", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    setCompany({
      ...company,
      [e.target.name]: e.target.value,
    });
    setIsDirty(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const resized = canvas.toDataURL("image/jpeg", 0.8);
        setCompany((prev) => ({ ...prev, logo: resized }));
        setIsDirty(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const addTech = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (!newTech.trim()) return;
      setCompany({
        ...company,
        techStack: [...company.techStack, newTech],
      });
      setIsDirty(true);
      setNewTech("");
    }
  };

  const removeTech = (index) => {
    setCompany({
      ...company,
      techStack: company.techStack.filter((_, i) => i !== index),
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        company_name: company.companyName,
        industry: company.industry,
        website: company.website,
        description: company.description,
        logo: company.logo,
        location: company.headquarters
      };
      await api.put('/auth/profile', payload);
      window.dispatchEvent(new Event("companyProfileUpdated"));
      setIsDirty(false);
      showToast("Company profile saved successfully!", "success");
    } catch (err) {
      console.error("Failed to save company profile", err);
      showToast("Failed to save profile. Please try again.", "error");
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  const completedFields = [
    company.logo,
    company.companyName,
    company.industry,
    company.headquarters,
    company.description,
    company.website,
    company.techStack && company.techStack.length > 0
  ];
  const percentage = Math.round((completedFields.filter(Boolean).length / completedFields.length) * 100);
  
  let strengthLabel = "LOW";
  if (percentage > 40) strengthLabel = "MEDIUM";
  if (percentage > 80) strengthLabel = "HIGH";


  return (
    <div style={styles.container}>
      <CompanySidebar active="profile" onNavigate={handleSidebarNavigate} />

      <div style={styles.main}>
        <CompanyHeader title="My Profile" />

        <div style={styles.content}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>My Profile</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                Complete your profile to showcase your company to potential candidates.
              </p>
            </div>
            <button 
              onClick={handleSave}
              style={{ padding: '10px 24px', background: '#0f7c82', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(15, 124, 130, 0.2)' }}
            >
              Save Changes
            </button>
          </div>

          {/* MODERN BANNER */}
          <div style={{ position: 'relative', marginBottom: 80, background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ height: 160, background: 'linear-gradient(135deg, #0f7c82 0%, #14b8a6 100%)' }} />
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 24, padding: '0 40px', bottom: 30 }}>
              <label style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid white', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {company.logo ? (
                  <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                    <FiCamera size={28} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
              
              <div style={{ flex: 1, paddingBottom: 5 }}>
                <h1 style={{ margin: 0, fontSize: 26, color: '#0f172a', fontWeight: 700 }}>{company.companyName || "Your Company"}</h1>
                <p style={{ margin: '4px 0 0', fontSize: 15, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiBriefcase size={14} /> {company.industry || "Add your industry"}
                </p>
              </div>
            </div>
          </div>


          <div style={styles.grid}>

            {/* LEFT */}
            <div>
              {/* BASIC */}
              <div style={styles.card}>
                <h3 style={{ fontSize: "30px", marginBottom: "30px" }}>Basic Information</h3>

                {/* TOP INPUTS */}
                <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Company Name</p>
                    <input name="companyName" value={company.companyName || ""} onChange={handleChange} style={styles.profileInput} placeholder="e.g. PT Teknologi Masa Depan" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Industry</p>
                    <input name="industry" value={company.industry || ""} onChange={handleChange} style={styles.profileInput} placeholder="e.g. Software Development" />
                  </div>
                </div>

                {/* LOCATION */}
                <div style={{ marginBottom: "24px" }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Headquarters</p>
                  <div style={styles.locationInput}>
                    <FiMapPin />
                    <input
                      name="headquarters"
                      value={company.headquarters || ""}
                      onChange={handleChange}
                      placeholder="e.g. Jakarta, Indonesia"
                      style={styles.cleanInput}
                    />
                  </div>
                </div>
                
                {/* WEBSITE & EMAIL */}
                <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Website</p>
                    <div style={styles.locationInput}>
                      <FiGlobe />
                      <input name="website" value={company.website || ""} onChange={handleChange} style={styles.cleanInput} placeholder="https://example.com" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Company Email</p>
                    <input name="email" value={company.email || ""} onChange={handleChange} style={styles.profileInput} placeholder="hello@company.com" />
                  </div>
                </div>

                {/* ABOUT ME */}
                <div style={{ marginBottom: "24px" }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Company Description</p>
                  <textarea
                    name="description"
                    value={company.description || ""}
                    onChange={handleChange}
                    style={styles.profileTextarea}
                    placeholder="Describe your company, culture, and mission..."
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div>

              {/* SKILLS / TECH STACK */}
              <div style={styles.card}>
                <h3>Technologies & Tools</h3>
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
                  Add the tools and technologies your company uses.
                </p>

                <div style={styles.skillWrap}>
                  {company.techStack.map((skill, index) => (
                    <div key={index} style={styles.skill}>
                      {skill}
                      <FiX style={{ cursor: "pointer" }} onClick={() => removeTech(index)} />
                    </div>
                  ))}
                </div>

                <input
                  placeholder="Type technology..."
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyDown={addTech}
                  style={styles.profileInput}
                />
              </div>

              {/* STRENGTH */}
              <div style={styles.card}>
                <h4>PROFILE STRENGTH</h4>
                <h1 style={{ margin: "10px 0" }}>{percentage}%</h1>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 16 }}>{strengthLabel}</p>

                <div style={styles.progress}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${percentage}%`
                    }}
                  />
                </div>
                
                <p style={{ marginTop: 16, fontSize: 14, color: "#475569" }}>
                  {percentage === 100 
                    ? "Great! Your company profile is fully complete." 
                    : "Good progress. Add more information to attract better candidates."}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* UNSAVED CHANGES MODAL */}
      {pendingNavigation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                <FiAlertCircle />
              </div>
            </div>
            <h3 style={{ textAlign: 'center', margin: '0 0 12px 0', color: '#0f172a', fontSize: 20 }}>Unsaved Changes</h3>
            <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              You have made changes to your profile that haven't been saved. Are you sure you want to leave this page?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={cancelNavigation}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Keep Editing
              </button>
              <button 
                onClick={confirmNavigation}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Discard Changes
              </button>
            </div>
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

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "Inter, sans-serif"
  },

  main: {
    flex: 1
  },

  content: {
    padding: 32,
    flex: 1,
    overflowY: "auto"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24
  },

  card: {
    background: "white",
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    border: "1px solid #e2e8f0"
  },

  skillWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 20
  },

  skill: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "#e6fffa",
    color: "#0f7c82",
    fontWeight: 500,
    borderRadius: 20,
    padding: "8px 12px"
  },

  progress: {
    height: 8,
    background: "#eee",
    borderRadius: 10,
    marginTop: 12
  },

  progressFill: {
    height: "100%",
    background: "#4f46e5",
    borderRadius: 10
  },

  profileInput: {
    width: "100%",
    height: "54px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "0 18px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    background: "white",
    color: "#1e293b"
  },

  cleanInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "15px",
    color: "#1e293b"
  },

  locationInput: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "0 18px",
    height: "54px",
    color: "#64748b",
    background: "white"
  },

  profileTextarea: {
    width: "100%",
    minHeight: "120px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 18px",
    fontSize: "15px",
    resize: "none",
    boxSizing: "border-box",
    outline: "none",
    background: "white",
    color: "#1e293b"
  }
};