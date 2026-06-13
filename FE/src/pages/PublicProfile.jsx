import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiGlobe, FiBriefcase, FiCalendar, FiBookOpen } from "react-icons/fi";
import api from "../utils/api";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/auth/profile/${id}`);
        setProfile(res);
      } catch (err) {
        setError("Profil tidak ditemukan atau terjadi kesalahan.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <p style={{ color: '#64748b' }}>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Oops!</h2>
        <p style={{ color: '#64748b', margin: 0 }}>{error}</p>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', background: '#0f7c82', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  const isCompany = profile.role === 'company';

  // Format helper
  const formatDateMonthYear = (dateStr) => {
    if (!dateStr) return "Present";
    if (!dateStr.includes("-")) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIMPLE NAVBAR */}
      <div style={{ height: 70, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
          <FiArrowLeft /> Back
        </button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Profile</h2>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
        
        {/* BANNER */}
        <div style={{ position: 'relative', marginBottom: 80, background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ height: 160, background: 'linear-gradient(135deg, #0f7c82 0%, #14b8a6 100%)' }} />
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 24, padding: '0 40px', bottom: 30 }}>
            <div style={{ width: 120, height: 120, borderRadius: isCompany ? 16 : '50%', border: '4px solid white', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              {isCompany ? (
                profile.logo ? <img src={profile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40, fontWeight: 700, color: '#94a3b8' }}>{(profile.company_name || 'C')[0]}</span>
              ) : (
                profile.photo ? <img src={profile.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40, fontWeight: 700, color: '#94a3b8' }}>{(profile.full_name || profile.username || 'U')[0]}</span>
              )}
            </div>
            
            <div style={{ flex: 1, paddingBottom: 5 }}>
              <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a', fontWeight: 700 }}>
                {isCompany ? profile.company_name : (profile.full_name || profile.username)}
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                {isCompany ? (
                  <>
                    <FiBriefcase size={14} /> {profile.industry || "Company"}
                  </>
                ) : (
                  <>
                    <FiBriefcase size={14} /> {profile.headline || "Professional"}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          
          {/* LEFT COLUMN */}
          <div>
            {/* ABOUT */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 20, margin: '0 0 16px 0', color: '#0f172a' }}>{isCompany ? 'About Company' : 'About'}</h3>
              <p style={{ color: '#475569', lineHeight: 1.6, margin: 0 }}>
                {(isCompany ? profile.description : profile.about) || "No information provided."}
              </p>
            </div>

            {/* CANDIDATE SPECIFIC: EXPERIENCES */}
            {!isCompany && profile.experiences && profile.experiences.length > 0 && (
              <div style={{ background: 'white', borderRadius: 24, padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 20, margin: '0 0 24px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiBriefcase /> Experience
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {profile.experiences.map((exp, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8' }}>
                        <FiBriefcase size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{exp.position}</h4>
                        <div style={{ color: '#0f7c82', fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{exp.company}</div>
                        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FiCalendar size={12} /> {formatDateMonthYear(exp.startDate)} - {exp.isCurrent || !exp.endDate ? "Present" : formatDateMonthYear(exp.endDate)}
                        </div>
                        <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{exp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CANDIDATE SPECIFIC: EDUCATION */}
            {!isCompany && profile.education_list && profile.education_list.length > 0 && (
              <div style={{ background: 'white', borderRadius: 24, padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 20, margin: '0 0 24px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiBookOpen /> Education
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {profile.education_list.map((edu, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8' }}>
                        <FiBookOpen size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{edu.school}</h4>
                        <div style={{ color: '#0f7c82', fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{edu.degree}</div>
                        <div style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FiCalendar size={12} /> {edu.startYear} - {edu.endYear || "Present"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* OVERVIEW INFO */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#0f172a' }}>Overview</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#475569' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <FiMapPin size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>LOCATION</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{profile.location}</div>
                    </div>
                  </div>
                )}

                {isCompany && profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#475569' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <FiGlobe size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>WEBSITE</div>
                      <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 500, color: '#0f7c82', textDecoration: 'none' }}>
                        {profile.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SKILLS OR TECH STACK */}
            {((!isCompany && profile.skills && profile.skills.length > 0) || (isCompany && profile.techStack && profile.techStack.length > 0)) && (
              <div style={{ background: 'white', borderRadius: 24, padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#0f172a' }}>
                  {isCompany ? 'Technologies' : 'Skills'}
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(isCompany ? profile.techStack : profile.skills).map((item, idx) => (
                    <div key={idx} style={{ background: '#eef2f7', color: '#475569', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
