import { useState, useEffect } from "react";
import {
  FiBell,
  FiCamera,
  FiMapPin,
  FiX,
  FiBriefcase,
  FiBookOpen
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
      skills: []
    };
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        const newProfile = {
          photo: user.photo || "",
          fullName: user.full_name || user.username || "",
          headline: user.headline || "",
          location: user.location || "",
          about: user.about || "",
          education: user.education || "",
          experiences: user.experiences || [],
          educationList: user.education_list || [],
          skills: user.skills || []
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

  const [newSkill, setNewSkill] = useState("");

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
      window.dispatchEvent(new Event('candidateProfileUpdated'));
      alert("Profile saved successfully to the backend!");
    } catch (err) {
      console.error("Error saving profile", err);
      alert("Failed to save profile. Please try again.");
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

    setProfile({
      ...profile,
      skills:
        profile.skills.filter(
          (_, i) => i !== index
        )
    });

  };


  // =========================
  // EXPERIENCE
  // =========================
  const handleExperienceChange = (e) => {

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
    <div style={styles.container}>

      <CandidateSidebar active="my-profile" />

      <div style={styles.main}>


        {/* HEADER */}
        <CandidateHeader title="Profile" />

        <div style={styles.content}>
          {/* PAGE TOP */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
            <div>
              <h1 style={{ marginBottom: 8, marginTop: 0, color: "#0f172a" }}>My Profile</h1>
              <p style={{ color: "#64748b", margin: 0 }}>Complete your profile to showcase your skills and experience to potential employers.</p>
            </div>
            <button onClick={saveProfile} style={styles.saveButton}>
              Save Changes
            </button>
          </div>

          {/* MODERN BANNER */}
          <div style={{ position: 'relative', marginBottom: 80, background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ height: 160, background: 'linear-gradient(135deg, #0f7c82 0%, #14b8a6 100%)' }} />
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 24, padding: '0 40px', bottom: 30 }}>
              <label style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid white', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {profile.photo ? (
                  <img src={profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                    <FiCamera size={28} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
              
              <div style={{ flex: 1, paddingBottom: 5 }}>
                <h1 style={{ margin: 0, fontSize: 26, color: '#0f172a', fontWeight: 700 }}>{profile.fullName || "Your Name"}</h1>
                <p style={{ margin: '4px 0 0', fontSize: 15, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiBriefcase size={14} /> {profile.headline || "Add your professional headline"}
                </p>
              </div>
            </div>
          </div>
        <div style={styles.grid}>


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
              <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Full Name</p>
                  <input name="fullName" value={profile.fullName} onChange={handleChange} style={styles.profileInput} placeholder="e.g. Budi Santoso" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: "8px", color: "#334155" }}>Professional Headline</p>
                  <input name="headline" value={profile.headline} onChange={handleChange} style={styles.profileInput} placeholder="e.g. Senior Software Engineer" />
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
              <p style={{ color: "#0f7c82", cursor: "pointer", fontWeight: 600 }}>+ Add Document</p>
            </div>
            
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 20 }}>
              Upload your resume, transcripts, or professional certifications to make your profile stand out.
            </p>

            <div style={{ ...styles.expCard, minHeight: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', cursor: 'pointer' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', marginBottom: 16 }}>
                <FiBookOpen size={28} />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 18, color: '#334155' }}>Upload a file</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>PDF, DOCX, or Image (Max 5MB)</p>
            </div>
          </div>
        </div>
        </div>

      </div>
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