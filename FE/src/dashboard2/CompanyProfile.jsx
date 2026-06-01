import React, { useEffect, useState } from "react";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function CompanyProfile() {
  const [isEditing, setIsEditing] = useState(false);

  const [company, setCompany] = useState({
    companyName: "TechCorp Solutions",
    industry: "",
    headquarters: "Jakarta, Indonesia",
    employees: "50-200",
    website: "https://techcorp.solutions",
    description: "",
    email: "hr@techcorp.com",
    phone: "+62 21 555 0123",
    techStack: [
      "React",
      "Node.js",
      "AWS",
      "TypeScript",
      "PostgreSQL",
    ],
    logo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300",
  });

  const [newTech, setNewTech] =
    useState("");

  useEffect(() => {
    const saved = localStorage.getItem(
      "companyProfile"
    );

    if (saved) {
      setCompany(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e) => {
    setCompany({
      ...company,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setCompany((prev) => ({
        ...prev,
        logo: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const addTech = () => {
    if (!newTech.trim()) return;

    setCompany({
      ...company,
      techStack: [
        ...company.techStack,
        newTech,
      ],
    });

    setNewTech("");
  };

  const removeTech = (index) => {
    setCompany({
      ...company,
      techStack:
        company.techStack.filter(
          (_, i) => i !== index
        ),
    });
  };

  const handleSave = () => {
    localStorage.setItem(
      "companyProfile",
      JSON.stringify(company)
    );

    window.dispatchEvent(
      new Event("companyProfileUpdated")
    );

    setIsEditing(false);
  };

  return (
    <div className="company-layout">
      <CompanySidebar active="profile" />

      <div className="company-main">
        <CompanyHeader title="Profile" />

        <div className="profile-container">
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 25,
            }}
          >
            <div>
              <h1>
                Company Profile
              </h1>

              <p
                style={{
                  color: "#64748b",
                }}
              >
                Update your company
                details to help AI
                match you with the
                best candidates.
              </p>
            </div>

            {!isEditing ? (
              <button
                className="primary-btn"
                onClick={() =>
                  setIsEditing(true)
                }
              >
                Edit Profile
              </button>
            ) : (
              <button
                className="primary-btn"
                onClick={handleSave}
              >
                Save Changes
              </button>
            )}
          </div>

          {!isEditing ? (
            <>
              <div className="profile-card">
                <div className="profile-banner"></div>

                <div className="profile-body">
                    <img
                        src={
                            company.logo &&
                            company.logo.trim() !== ""
                            ? company.logo
                            : "https://ui-avatars.com/api/?name=Company"
                        }
                        alt="Company Logo"
                        className="profile-logo"
                        onError={(e) => {
                            e.target.src =
                            "https://ui-avatars.com/api/?name=Company";
                        }}
                        />

                    <h1
                    style={{
                        marginTop: 15,
                        marginBottom: 6,
                    }}
                    >
                    {company.companyName}
                    </h1>

                    <p
                    style={{
                        color: "#64748b",
                    }}
                    >
                    {company.industry}
                    </p>
                </div>
                </div>

              <div
                className="profile-grid"
                style={{
                  marginTop: 20,
                }}
              >
                <div className="info-card">
                  <h3>
                    About Company
                  </h3>

                  <p
                    style={{
                      marginTop: 15,
                      lineHeight:
                        1.8,
                    }}
                  >
                    {
                      company.description
                    }
                  </p>
                </div>

                <div className="info-card">
                  <h3>
                    Company Info
                  </h3>

                  <div
                    style={{
                      marginTop: 15,
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: 15,
                    }}
                  >
                    <div>
                      👥{" "}
                      {
                        company.employees
                      }{" "}
                      Employees
                    </div>

                    <div>
                      📍{" "}
                      {
                        company.headquarters
                      }
                    </div>

                    <div>
                      🌐{" "}
                      {
                        company.website
                      }
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <h3>
                    Tech Stack
                  </h3>

                  <div
                    className="tech-stack"
                    style={{
                      marginTop: 15,
                    }}
                  >
                    {company.techStack.map(
                      (
                        tech,
                        index
                      ) => (
                        <span
                          key={
                            index
                          }
                          className="tech-badge"
                        >
                          {tech}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="info-card">
                  <h3>
                    Contact Details
                  </h3>

                  <div
                    style={{
                      marginTop: 15,
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: 15,
                    }}
                  >
                    <div>
                      ✉️{" "}
                      {
                        company.email
                      }
                    </div>

                    <div>
                      📞{" "}
                      {
                        company.phone
                      }
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr",
                gap: 20,
              }}
            >
              <div className="profile-form">
                <h3
                  style={{
                    marginBottom: 25,
                  }}
                >
                  Company
                  Information
                </h3>

                <div
                  style={{
                    display:
                      "flex",
                    gap: 25,
                  }}
                >
                  <div>
                    <img
                      src={
                        company.logo
                      }
                      alt=""
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        objectFit:
                          "cover",
                      }}
                    />

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleLogoUpload
                      }
                      style={{
                        marginTop: 10,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <input
                      name="companyName"
                      placeholder="Company Name"
                      value={
                        company.companyName
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <input
                      name="industry"
                      placeholder="Industry"
                      value={
                        company.industry
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </div>
                </div>

                <input
                  name="headquarters"
                  placeholder="Headquarters"
                  value={
                    company.headquarters
                  }
                  onChange={
                    handleChange
                  }
                />

                <input
                  name="employees"
                  placeholder="Employees"
                  value={
                    company.employees
                  }
                  onChange={
                    handleChange
                  }
                />

                <input
                  name="website"
                  placeholder="Website"
                  value={
                    company.website
                  }
                  onChange={
                    handleChange
                  }
                />

                <input
                  name="email"
                  placeholder="Email"
                  value={
                    company.email
                  }
                  onChange={
                    handleChange
                  }
                />

                <input
                  name="phone"
                  placeholder="Phone"
                  value={
                    company.phone
                  }
                  onChange={
                    handleChange
                  }
                />

                <textarea
                  rows="6"
                  name="description"
                  placeholder="Company Description"
                  value={
                    company.description
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 20,
                }}
              >
                <div className="info-card">
                  <h3>Company</h3>

                  <p
                    style={{
                      marginTop: 10,
                      color:
                        "#64748b",
                      fontSize: 13,
                    }}
                  >
                    Add the tools and
                    technologies your
                    company uses.
                  </p>

                  <div
                    className="tech-stack"
                    style={{
                      marginTop: 15,
                    }}
                  >
                    {company.techStack.map(
                      (
                        tech,
                        index
                      ) => (
                        <span
                          key={
                            index
                          }
                          className="tech-badge"
                          onClick={() =>
                            removeTech(
                              index
                            )
                          }
                          style={{
                            cursor:
                              "pointer",
                          }}
                        >
                          {tech} ×
                        </span>
                      )
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      marginTop: 15,
                      gap: 10,
                    }}
                  >
                    <input
                      value={
                        newTech
                      }
                      onChange={(
                        e
                      ) =>
                        setNewTech(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Add technology..."
                    />

                    <button
                      className="primary-btn"
                      onClick={
                        addTech
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="info-card">
                  <h4>
                    PROFILE
                    VISIBILITY
                  </h4>

                  <p
                    style={{
                      marginTop: 15,
                      color:
                        "#64748b",
                      fontSize: 14,
                    }}
                  >
                    🟢 Public &
                    Active
                  </p>

                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color:
                        "#64748b",
                    }}
                  >
                    Your company
                    profile is
                    visible to
                    candidates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}