import React, { useEffect, useState } from "react";
import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import api from "../utils/api";
import "./Dashboard2.css";

export default function CompanyProfile() {
  const [isEditing, setIsEditing] = useState(false);

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
          employees: "50-200", // placeholder
          website: user.website || "",
          description: user.description || "",
          email: user.email || "",
          phone: "+62 21 555 0123", // placeholder
          techStack: ["React", "Node.js"], // placeholder since companies techStack not in db yet
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
  };

const handleLogoUpload = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  // hanya gambar
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image");
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();

    img.onload = () => {
      const canvas =
        document.createElement("canvas");

      const ctx =
        canvas.getContext("2d");

      const size = 200;

      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(
        img,
        0,
        0,
        size,
        size
      );

      const resized =
        canvas.toDataURL(
          "image/jpeg",
          0.8
        );

      setCompany((prev) => ({
        ...prev,
        logo: resized,
      }));
    };

    img.src = event.target.result;
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
      setIsEditing(false);
      alert("Company profile saved to backend!");
    } catch (err) {
      console.error("Failed to save company profile", err);
      alert("Failed to save profile. Please try again.");
    }
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