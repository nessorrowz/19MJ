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

export default function CandidateProfile() {

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const profileStorageKey =
    `candidateProfile_${currentUser.email}`;

  const savedProfile = JSON.parse(
    localStorage.getItem(profileStorageKey) || "{}"
  );

  const [profile, setProfile] = useState({
    photo: savedProfile.photo || "",
    fullName: savedProfile.fullName || "",
    headline: savedProfile.headline || "",
    location: savedProfile.location || "",
    about: savedProfile.about || "",
    education: savedProfile.education || "",
    experiences: savedProfile.experiences || [],
    educationList: savedProfile.educationList || [],
    skills: savedProfile.skills || []
  });

  useEffect(() => {
    localStorage.setItem(
      profileStorageKey,
      JSON.stringify(profile)
    );
  }, [
    profile,
    profileStorageKey
  ]);

  const [newSkill, setNewSkill] = useState("");

  const [showExperienceForm, setShowExperienceForm] =
    useState(false);

  const [experienceForm, setExperienceForm] =
    useState({
      position: "",
      company: "",
      startDate: "",
      endDate: "",
      description: ""
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
    profile.education,
    profile.experiences.length > 0,
    profile.educationList.length > 0
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
  const saveProfile = () => {

    localStorage.setItem(
      profileStorageKey,
      JSON.stringify(profile)
    );

    alert("Profile saved!");
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
      description: ""
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
        <div style={styles.header}>

          <h2>Profile</h2>

          <div style={styles.headerUser}>

            <FiBell />

            {profile.photo ? (

              <img
                src={profile.photo}
                alt=""
                style={styles.headerPhoto}
              />

            ) : (

              <div style={styles.avatar}>
                {(profile.fullName || "U")[0]}
              </div>

            )}

            <div>
              <div style={{ fontWeight: 600 }}>
                {profile.fullName || "User"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#666"
                }}
              >
                Job Seeker
              </div>
            </div>

          </div>

        </div>



        {/* CONTENT */}
        {/* PAGE TOP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "30px 30px 0"
          }}
        >

          <div>

            <h1
              style={{
                marginBottom: 8
              }}
            >
              My Profile
            </h1>

            <p
              style={{
                color: "#666"
              }}
            >
              Complete your profile to showcase your skills and experience to potential employers.
            </p>

          </div>


          <button
            onClick={saveProfile}
            style={styles.saveButton}
          >
            Save Changes
          </button>

        </div>



        {/* CONTENT */}
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


              {/* TOP */}
              <div
                style={{
                  display: "flex",
                  gap: "30px",
                  marginBottom: "30px"
                }}
              >

                {/* PHOTO */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "120px"
                  }}
                >

                  <label
                    style={{
                      width: "90px",
                      height: "90px",
                      borderRadius: "50%",
                      border:
                        "2px dashed #14b8a6",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      overflow: "hidden",
                      color: "#94a3b8"
                    }}
                  >

                    {profile.photo ? (

                      <img
                        src={profile.photo}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover"
                        }}
                      />

                    ) : (

                      <FiCamera
                        size={28}
                      />

                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handlePhotoUpload
                      }
                      style={{
                        display:
                          "none"
                      }}
                    />

                  </label>

                  <p
                    style={{
                      fontSize:
                        "14px",
                      marginTop:
                        "12px",
                      color:
                        "#64748b"
                    }}
                  >
                    Change Photo
                  </p>

                </div>


                {/* INPUTS */}
                <div
                  style={{
                    flex: 1
                  }}
                >

                  {/* FULLNAME */}
                  <div
                    style={{
                      marginBottom:
                        "20px"
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
                      Full Name
                    </p>

                    <input
                      name="fullName"
                      value={
                        profile.fullName
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.profileInput
                      }
                    />

                  </div>


                  {/* HEADLINE */}
                  <div>

                    <p
                      style={{
                        fontWeight:
                          500,
                        marginBottom:
                          "8px"
                      }}
                    >
                      Professional Headline
                    </p>

                    <input
                      name="headline"
                      value={
                        profile.headline
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.profileInput
                      }
                    />

                  </div>

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
                        description: ""
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

                  <div
                    style={{
                      display: "flex",
                      gap: 10
                    }}
                  >

                    <input
                      type="date"
                      name="startDate"
                      value={
                        experienceForm.startDate
                      }
                      onChange={
                        handleExperienceChange
                      }
                      style={styles.input}
                    />

                    <input
                      type="date"
                      name="endDate"
                      value={
                        experienceForm.endDate
                      }
                      onChange={
                        handleExperienceChange
                      }
                      style={styles.input}
                    />

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
                        {exp.startDate}
                        {" - "}
                        {exp.endDate}
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
    background: "white",
    padding: "20px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  headerUser: {
    display: "flex",
    gap: 15,
    alignItems: "center"
  },

  avatar: {
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
    gap: 20,
    padding: 30
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