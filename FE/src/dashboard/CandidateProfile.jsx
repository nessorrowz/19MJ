import { useState, useEffect, useRef } from "react";
import {
  FiBell,
  FiCamera,
  FiMapPin,
  FiX,
  FiBriefcase,
  FiBookOpen,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit3
} from "react-icons/fi";

import CandidateSidebar from "./CandidateSidebar";
import CandidateHeader from "./CandidateHeader";
import api from "../utils/api";

export default function CandidateProfile() {

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const CACHE_KEY = "candidateProfileFullCache";

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return {
      photo: "",
      fullName: currentUser.full_name || currentUser.username || "",
      headline: currentUser.headline || "",
      location: currentUser.location || "",
      about: currentUser.about || "",
      education: currentUser.education || "",
      experiences: [],
      educationList: [],
      skills: [],
      documents: []
    };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [newSkill, setNewSkill] = useState("");
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

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        const cachedStr = localStorage.getItem(CACHE_KEY);
        let cachedDocs = [];
        if (cachedStr) {
          try {
             cachedDocs = JSON.parse(cachedStr).documents || [];
          } catch(e){}
        }

        const newProfile = {
          photo: user.photo || "",
          fullName: user.full_name || user.username || "",
          headline: user.headline || "",
          location: user.location || "",
          about: user.about || "",
          education: user.education || "",
          experiences: user.experiences || [],
          educationList: user.education_list || [],
          skills: user.skills || [],
          documents: user.documents || cachedDocs
        };
        setProfile(newProfile);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const formatDateMonthYear = (dateStr) => {
    if (!dateStr) return "Present";
    // Check if it's already just a year or text
    if (!dateStr.includes("-")) return dateStr;
    
    // For type="month" it returns YYYY-MM
    // For type="date" it returns YYYY-MM-DD
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const [showExperienceForm, setShowExperienceForm] =
    useState(false);

  const [experienceForm, setExperienceForm] =
    useState({
      position: "",
      company: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrent: false
    });
  const [showEducationForm, setShowEducationForm] =
    useState(false);

  const [educationForm, setEducationForm] =
    useState({
      degree: "",
      school: "",
      startYear: "",
      endYear: ""
    });

  const [editingEduIndex, setEditingEduIndex] =
    useState(null);
  const [editingExpIndex, setEditingExpIndex] =
    useState(null);


  // =========================
  // PROFILE %
  // =========================
  const completedFields = [
    profile.photo,
    profile.fullName,
    profile.headline,
    profile.location,
    profile.about,
    profile.experiences && profile.experiences.length > 0,
    profile.educationList && profile.educationList.length > 0,
    profile.skills && profile.skills.length > 0
  ];

  const percentage = Math.round(
    (completedFields.filter(Boolean).length /
      completedFields.length) * 100
  );

  let strengthLabel = "";
  let strengthDescription = "";

  if (percentage < 40) {
    strengthLabel = "WEAK";

    strengthDescription =
      "Your profile still needs basic information.";

  } else if (percentage < 80) {
    strengthLabel = "MEDIUM";

    strengthDescription =
      "Good progress. Add more information.";

  } else {
    strengthLabel = "STRONG";

    strengthDescription =
      "Excellent profile. Recruiters can evaluate you better.";
  }


  // =========================
  // BASIC INPUT
  // =========================
  const handleChange = (e) => {
    setIsDirty(true);
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };


  // =========================
  // PHOTO
  // =========================
  const handlePhotoUpload = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setIsDirty(true);
      setProfile({
        ...profile,
        photo: reader.result
      });
    };

    reader.readAsDataURL(file);
  };


  // =========================
  // SAVE PROFILE
  // =========================
  const saveProfile = async () => {
    try {
      await api.put('/auth/profile', profile);
      setIsDirty(false);
      window.dispatchEvent(new Event('candidateProfileUpdated'));
      showToast("Profile saved successfully!", "success");
    } catch (err) {
      console.error("Error saving profile", err);
      showToast("Failed to save profile. Please try again.", "error");
    }
  };


  // =========================
  // SKILL
  // =========================
  const addSkill = (e) => {

    if (
      e.key === "Enter" &&
      newSkill.trim()
    ) {

      setIsDirty(true);
      setProfile({
        ...profile,
        skills: [
          ...profile.skills,
          newSkill.trim()
        ]
      });

      setNewSkill("");
    }

  };

  const removeSkill = (index) => {

    const updated = [...profile.skills];

    updated.splice(index, 1);

    setIsDirty(true);
    setProfile({
      ...profile,
      skills: updated
    });

  };

  const removeDocument = (index) => {
    const updated = [...profile.documents];
    updated.splice(index, 1);
    const newProfile = { ...profile, documents: updated };
    setProfile(newProfile);
    localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
  };

  // =========================
  // EXPERIENCE
  // =========================
  const handleExperienceChange = (e) => {
    setIsDirty(true);
    setExperienceForm({
      ...experienceForm,
      [e.target.name]: e.target.value
    });

  };


  const saveExperience = () => {

    if (
      !experienceForm.position ||
      !experienceForm.company
    ) return;

    let updated = [
      ...profile.experiences
    ];

    if (
      editingExpIndex !== null
    ) {

      updated[
        editingExpIndex
      ] = experienceForm;

    } else {

      updated.push(
        experienceForm
      );

    }

    setIsDirty(true);
    setProfile({
      ...profile,
      experiences: updated
    });

    setExperienceForm({
      position: "",
      company: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrent: false
    });

    setEditingExpIndex(null);

    setShowExperienceForm(false);

  };


  const editExperience = (index) => {

    setExperienceForm(
      profile.experiences[index]
    );

    setEditingExpIndex(index);

    setShowExperienceForm(true);

  };


  const removeExperience = (index) => {
    setIsDirty(true);
    setProfile({
      ...profile,
      experiences:
        profile.experiences.filter(
          (_, i) => i !== index
        )
    });

  };

  // =========================
  // EDUCATION
  // =========================
  const handleEducationChange = (e) => {
    setIsDirty(true);
    setEducationForm({
      ...educationForm,
      [e.target.name]: e.target.value
    });

  };


  const saveEducation = () => {

    if (
      !educationForm.degree ||
      !educationForm.school
    ) return;

    let updated = [
      ...profile.educationList
    ];

    if (
      editingEduIndex !== null
    ) {

      updated[
        editingEduIndex
      ] = educationForm;

    } else {

      updated.push(
        educationForm
      );

    }

    setIsDirty(true);
    setProfile({
      ...profile,
      educationList: updated
    });

    setEducationForm({
      degree: "",
      school: "",
      startYear: "",
      endYear: ""
    });

    setEditingEduIndex(null);

    setShowEducationForm(false);

  };


  const editEducation = (index) => {

    setEducationForm(
      profile.educationList[index]
    );

    setEditingEduIndex(index);

    setShowEducationForm(true);

  };


  const removeEducation = (index) => {
    setIsDirty(true);
    setProfile({
      ...profile,

      educationList:
        profile.educationList.filter(
          (_, i) =>
            i !== index
        )
    });

  };


  return (
    <div className="profile-container">

      <CandidateSidebar active="my-profile" onNavigate={handleSidebarNavigate} />

      <div className="profile-main">


        {/* HEADER */}
        <CandidateHeader title="Profile" />

        <div className="profile-content">
          {/* PAGE TOP */}
          <div className="header-section">
            <div>
              <h1 style={{ marginBottom: 8, marginTop: 0, color: "#0f172a" }}>My Profile</h1>
              <p style={{ color: "#64748b", margin: 0 }}>Complete your profile to showcase your skills and experience to potential employers.</p>
            </div>
            <button onClick={saveProfile} style={styles.saveButton}>
              Save Changes
            </button>
          </div>

          {/* MODERN BANNER */}
          <div className="profile-banner-v2">
            <div className="banner-bg-v2" />
            
            <div className="banner-content-v2">
              <label className="banner-photo-upload-v2">
                {profile.photo ? (
                  <>
                    <img src={profile.photo} alt="" />
                    <div className="photo-edit-overlay-v2">
                      <FiEdit3 size={16} />
                    </div>
                  </>
                ) : (
                  <div className="banner-photo-placeholder-v2">
                    <FiCamera size={28} />
                    <span style={{ fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>Edit</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
              
              <div className="banner-text-v2">
                <h1>{profile.fullName || "Your Name"}</h1>
                <p>
                  <FiBriefcase size={14} /> {profile.headline || "Add your professional headline"}
                </p>
              </div>
            </div>
          </div>
        <div className="profile-grid">


          {/* LEFT */}
          <div>


            {/* BASIC */}
            <div style={styles.card}>

              <h3
                style={{
                  fontSize: "30px",
                  marginBottom: "30px"
                }}
              >
                Basic Information
              </h3>


              {/* TOP INPUTS (Because Photo is moved to Banner) */}
              <div className="basic-section">
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Full Name</p>
                  <input name="fullName" value={profile.fullName || ""} onChange={handleChange} style={styles.input} placeholder="e.g. Budi Santoso" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Professional Headline</p>
                  <input name="headline" value={profile.headline || ""} onChange={handleChange} style={styles.input} placeholder="e.g. Senior Software Engineer" />
                </div>
              </div>


              {/* LOCATION */}
              <div
                style={{
                  marginBottom:
                    "24px"
                }}
              >

                <p
                  style={{
                    fontWeight:
                      500,
                    marginBottom:
                      "8px"
                  }}
                >
                  Location
                </p>

                <div
                  style={
                    styles.locationInput
                  }
                >

                  <FiMapPin />

                  <input
                    name="location"
                    value={
                      profile.location
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Location"
                    style={
                      styles.cleanInput
                    }
                  />

                </div>

              </div>


              {/* ABOUT */}
              <div>

                <p
                  style={{
                    fontWeight:
                      500,
                    marginBottom:
                      "8px"
                  }}
                >
                  About Me
                </p>

                <textarea
                  name="about"
                  placeholder="Describe your background, what you're looking for, and what makes you unique..."
                  value={
                    profile.about
                  }
                  onChange={
                    handleChange
                  }
                  style={
                    styles.profileTextarea
                  }
                />

              </div>

            </div>



            {/* EXPERIENCE */}
            <div style={styles.card}>


              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom: 20
                }}
              >

                <h3>
                  Work Experience
                </h3>


                <p
                  onClick={() => {

                    if (showExperienceForm) {

                      setShowExperienceForm(false);

                      setEditingExpIndex(null);

                    } else {

                      setShowExperienceForm(true);

                      setEditingExpIndex(null);

                      setExperienceForm({
                        position: "",
                        company: "",
                        startDate: "",
                        endDate: "",
                        description: "",
                        isCurrent: false
                      });

                    }

                  }}
                  style={{
                    color: "#0f7c82",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {showExperienceForm
                    ? "Cancel"
                    : "+ Add Experience"}
                </p>

              </div>



              {showExperienceForm && (

                <div>

                  <input
                    name="position"
                    placeholder="Position"
                    value={
                      experienceForm.position
                    }
                    onChange={
                      handleExperienceChange
                    }
                    style={styles.input}
                  />

                  <input
                    name="company"
                    placeholder="Company Name"
                    value={
                      experienceForm.company
                    }
                    onChange={
                      handleExperienceChange
                    }
                    style={styles.input}
                  />

                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748b", fontWeight: 500 }}>Start Date</p>
                      <input
                        type="month"
                        name="startDate"
                        value={experienceForm.startDate}
                        onChange={handleExperienceChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={{ flex: 1, opacity: experienceForm.isCurrent ? 0.5 : 1 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748b", fontWeight: 500 }}>End Date</p>
                      <input
                        type="month"
                        name="endDate"
                        value={experienceForm.isCurrent ? "" : experienceForm.endDate}
                        onChange={handleExperienceChange}
                        disabled={experienceForm.isCurrent}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      id="isCurrent"
                      name="isCurrent"
                      checked={experienceForm.isCurrent}
                      onChange={(e) => setExperienceForm({ ...experienceForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : experienceForm.endDate })}
                      style={{ width: 16, height: 16, accentColor: "#0f7c82" }}
                    />
                    <label htmlFor="isCurrent" style={{ fontSize: 14, color: "#334155", cursor: "pointer" }}>
                      I am currently working here
                    </label>
                  </div>


                  <textarea
                    name="description"
                    placeholder="Description"
                    value={
                      experienceForm.description
                    }
                    onChange={
                      handleExperienceChange
                    }
                    style={styles.textarea}
                  />

                  <button
                    onClick={saveExperience}
                    style={styles.saveButton}
                  >
                    Save
                  </button>

                </div>

              )}



              {profile.experiences.map(
                (exp, index) => (

                  <div
                    key={index}
                    style={styles.expCard}
                  >

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        marginBottom: 16
                      }}
                    >

                      {/* LEFT */}
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          alignItems: "center"
                        }}
                      >

                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "#eef2ff",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            color: "#4f46e5"
                          }}
                        >
                          <FiBriefcase size={22} />
                        </div>


                        <div>

                          <h4
                            style={{
                              margin: 0,
                              fontSize: 22
                            }}
                          >
                            {exp.position}
                          </h4>

                          <p
                            style={{
                              marginTop: 6,
                              color: "#666"
                            }}
                          >
                            {exp.company}
                          </p>

                        </div>

                      </div>



                      {/* RIGHT DATE */}
                      <div
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 20,
                          padding: "8px 16px",
                          fontSize: 14,
                          color: "#666"
                        }}
                      >
                        {formatDateMonthYear(exp.startDate)}
                        {" - "}
                        {exp.isCurrent || !exp.endDate ? "Present" : formatDateMonthYear(exp.endDate)}
                      </div>

                    </div>


                    <p>
                      {exp.description}
                    </p>


                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        marginTop: 16
                      }}
                    >

                      <p
                        onClick={() =>
                          editExperience(index)
                        }
                        style={{
                          color: "#0f7c82",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Edit
                      </p>


                      <p
                        onClick={() =>
                          removeExperience(index)
                        }
                        style={{
                          color: "red",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Remove
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>



          {/* RIGHT */}
          <div>


            {/* SKILLS */}
            <div style={styles.card}>

              <h3>Skills</h3>

              <div style={styles.skillWrap}>

                {profile.skills.map(
                  (
                    skill,
                    index
                  ) => (

                    <div
                      key={index}
                      style={styles.skill}
                    >

                      {skill}

                      <FiX
                        onClick={() =>
                          removeSkill(index)
                        }
                      />

                    </div>

                  )
                )}

              </div>


              <input
                placeholder="Type skill..."
                value={newSkill}
                onChange={(e) =>
                  setNewSkill(
                    e.target.value
                  )
                }
                onKeyDown={addSkill}
                style={styles.input}
              />

            </div>



            {/* STRENGTH */}
            <div style={styles.card}>

              <h4>
                PROFILE STRENGTH
              </h4>

              <h1>
                {percentage}%
              </h1>

              <p>
                {strengthLabel}
              </p>


              <div
                style={styles.progress}
              >

                <div
                  style={{
                    ...styles.progressFill,
                    width:
                      `${percentage}%`
                  }}
                />

              </div>


              <p
                style={{
                  marginTop: 15
                }}
              >
                {
                  strengthDescription
                }
              </p>

            </div>

          </div>

          <div style={styles.card}>


            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20
              }}
            >

              <h3>
                Education
              </h3>


              <p
                onClick={() => {

                  if (showEducationForm) {

                    setShowEducationForm(false);

                    setEditingEduIndex(null);

                  } else {

                    setShowEducationForm(true);

                    setEditingEduIndex(null);

                    setEducationForm({
                      degree: "",
                      school: "",
                      startYear: "",
                      endYear: ""
                    });

                  }

                }}
                style={{
                  color: "#0f7c82",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {showEducationForm
                  ? "Cancel"
                  : "+ Add Education"}
              </p>

            </div>



            {/* FORM */}
            {showEducationForm && (

              <div>

                <input
                  name="degree"
                  placeholder="Degree / Major"
                  value={educationForm.degree}
                  onChange={handleEducationChange}
                  style={styles.input}
                />

                <input
                  name="school"
                  placeholder="University / School"
                  value={educationForm.school}
                  onChange={handleEducationChange}
                  style={styles.input}
                />


                <div
                  style={{
                    display: "flex",
                    gap: 10
                  }}
                >

                  <input
                    name="startYear"
                    placeholder="Start Year"
                    value={educationForm.startYear}
                    onChange={handleEducationChange}
                    style={styles.input}
                  />

                  <input
                    name="endYear"
                    placeholder="End Year"
                    value={educationForm.endYear}
                    onChange={handleEducationChange}
                    style={styles.input}
                  />

                </div>


                <button
                  onClick={saveEducation}
                  style={styles.saveButton}
                >
                  Save
                </button>

              </div>

            )}



            {/* LIST */}
            {profile.educationList.map(
              (edu, index) => (

                <div
                  key={index}
                  style={styles.expCard}
                >

                  {/* TOP */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: 16
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "center"
                      }}
                    >

                      {/* ICON */}
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          background: "#ecfdf5",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          color: "#0f766e"
                        }}
                      >

                        <FiBookOpen size={22} />

                      </div>


                      {/* TEXT */}
                      <div>

                        <h4
                          style={{
                            margin: 0,
                            fontSize: 22
                          }}
                        >
                          {edu.degree}
                        </h4>

                        <p
                          style={{
                            marginTop: 6,
                            color: "#666"
                          }}
                        >
                          {edu.school}
                        </p>

                      </div>

                    </div>



                    {/* YEAR BADGE */}
                    <div
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 20,
                        padding: "8px 16px",
                        fontSize: 14,
                        color: "#666"
                      }}
                    >
                      {edu.startYear}
                      {" - "}
                      {edu.endYear}
                    </div>

                  </div>



                  {/* ACTION */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      marginTop: 16
                    }}
                  >

                    <p
                      onClick={() =>
                        editEducation(index)
                      }
                      style={{
                        color: "#0f7c82",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Edit
                    </p>


                    <p
                      onClick={() =>
                        removeEducation(index)
                      }
                      style={{
                        color: "red",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3>Documents & Certificates</h3>

            </div>
            
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 20 }}>
              Upload your resume, transcripts, or professional certifications to make your profile stand out.
            </p>

            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ ...styles.expCard, minHeight: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', cursor: 'pointer' }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const docInfo = {
                      name: file.name,
                      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      url: URL.createObjectURL(file)
                    };
                    const updatedDocs = [...(profile.documents || []), docInfo];
                    const newProfile = { ...profile, documents: updatedDocs };
                    setProfile(newProfile);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
                    // Reset input
                    e.target.value = null;
                  }
                }}
              />
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', marginBottom: 16 }}>
                <FiBookOpen size={28} />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 18, color: '#334155' }}>Upload a file</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>PDF, DOCX, or Image (Max 5MB)</p>
            </div>

            {/* DOCUMENT LIST */}
            {profile.documents && profile.documents.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded Documents</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {profile.documents.map((doc, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FiBookOpen size={20} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{doc.name}</strong>
                          <span style={{ fontSize: 13, color: '#64748b' }}>{doc.date} • {doc.size}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => {
                          if (doc.url) window.open(doc.url, '_blank');
                          else showToast('This document is not available for preview.', 'error');
                        }} style={{ background: 'none', border: 'none', color: '#0f7c82', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>View</button>
                        <button onClick={() => removeDocument(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        
        /* RESPONSIVENESS */
        .profile-container {
          display: flex;
          min-height: 100vh;
          background: #f5f7fa;
        }
        
        .profile-main {
          flex: 1;
          width: 100%;
        }

        .profile-header-bar {
          height: 88px;
          background: white;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          flex-shrink: 0;
        }

        .profile-content {
          padding: 32px;
          flex: 1;
          overflow-y: auto;
        }
        
        .profile-banner-v2 {
          position: relative;
          margin-bottom: 80px;
          background: white;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
        }

        .banner-bg-v2 {
          height: 160px;
          background: linear-gradient(135deg, #0f7c82 0%, #14b8a6 100%);
          border-top-left-radius: 23px;
          border-top-right-radius: 23px;
        }

        .banner-content-v2 {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: flex-end;
          gap: 24px;
          padding: 0 40px;
          margin-top: -30px;
          padding-bottom: 24px;
        }

        .banner-photo-upload-v2 {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          background: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          flex-shrink: 0;
        }
        
        .banner-photo-upload-v2 img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: filter 0.2s;
        }

        .banner-photo-upload-v2:hover img {
          filter: brightness(0.7);
        }

        .photo-edit-overlay-v2 {
          position: absolute;
          background: rgba(15, 124, 130, 0.9);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .banner-photo-upload-v2:hover .photo-edit-overlay-v2 {
          opacity: 1;
        }

        .banner-photo-placeholder-v2 {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #94a3b8;
        }

        .banner-text-v2 {
          flex: 1;
          padding-bottom: 5px;
        }

        .banner-text-v2 h1 {
          margin: 0;
          font-size: 26px;
          color: #0f172a;
          font-weight: 700;
        }

        .banner-text-v2 p {
          margin: 4px 0 0;
          font-size: 15px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        
        .profile-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        
        .basic-section {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .profile-container {
            flex-direction: column;
          }
          .profile-header-bar {
            padding: 0 16px;
          }
          .profile-content {
            padding: 16px;
          }
          .header-section {
            flex-direction: column;
            gap: 16px;
          }
          .basic-section {
            flex-direction: column;
          }
          .profile-banner-v2 {
            margin-bottom: 20px;
          }
          .banner-content-v2 {
            flex-direction: column;
            align-items: center;
            padding: 0 16px;
            margin-top: -60px;
            gap: 12px;
          }
          .banner-text-v2 {
            text-align: center;
          }
          .banner-text-v2 p {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa"
  },

  main: {
    flex: 1
  },

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

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },

  content: {
    padding: 32,
    flex: 1,
    overflowY: "auto"
  },

  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#0f7c82",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700
  },

  headerPhoto: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20
  },

  basicSection: {
    display: "flex",
    gap: 20,
    marginBottom: 20
  },

  photoBox: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "1px solid #ddd",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    overflow: "hidden"
  },

  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    marginBottom: 12,
    boxSizing: "border-box",
    background: "white",
    color: "#1e293b"
  },

  cleanInput: {
    border: "none",
    outline: "none",
    width: "100%",
    background: "transparent",
    color: "#1e293b"
  },

  inputIcon: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    background: "white",
    color: "#1e293b"
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxSizing: "border-box",
    background: "white",
    color: "#1e293b"
  },

  saveButton: {
    background: "#0f7c82",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer"
  },

  expCard: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    minHeight: 235
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
  },
};