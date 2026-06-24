import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMapPin, FiCheckCircle, FiBriefcase, FiClock, FiChevronLeft, FiChevronRight, FiArrowRight, FiArrowLeft, FiAlertCircle } from "react-icons/fi";
import api from "../utils/api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function CreateJobPosting() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
    requirements: "",

    experienceLevel: "Mid Level",
    employmentType: "Full-Time",

    screeningQuestions: [
      "",
      "",
      "",
    ],

    videoScreening: false,
    skipScreening: false,
  });

  const updateField = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateQuestion = (
    index,
    value
  ) => {
    const updated = [
      ...form.screeningQuestions,
    ];

    updated[index] = value;

    updateField(
      "screeningQuestions",
      updated
    );
  };

  const addQuestion = () => {
    updateField(
      "screeningQuestions",
      [
        ...form.screeningQuestions,
        "",
      ]
    );
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['clean']
    ]
  };

  const publishJob = async () => {
    try {
      const payload = {
        title: form.title,
        category: form.category,
        location: form.location,
        description: form.description,
        requirements: form.requirements,
        experience_level: form.experienceLevel,
        type: form.employmentType,
        skills: [], // Can extract from requirements if needed
        screening_questions: form.skipScreening ? [] : form.screeningQuestions.filter(q => q.trim() !== ""),
        video_screening: form.videoScreening || false
      };

      const response = await api.post("/jobs", payload);

      // Optional: still save screening questions to backend if implemented,
      // but for now the jobs table only stores basic info.

      window.dispatchEvent(new Event("jobPostingUpdated"));
      setForm({ ...form, id: response.job.id });
      showToast("Pekerjaan berhasil dibuat! Anda sekarang dapat menambahkan pertanyaan screening (opsional).", "success");
      setStep(4);
    } catch (error) {
      console.error(error);
      showToast("Gagal membuat pekerjaan: " + (error.response?.data?.message || error.message), "error");
    }
  };

  return (
    <div className="company-layout">
      <CompanySidebar active="jobs" />

      <div className="company-main">
        <CompanyHeader title="Create" />

        <div className="dashboard-content">
          {/* STEPPER */}

          <div className="create-job-page">
            <div className="company-hero">
              <h1 className="company-title">
                {JSON.parse(localStorage.getItem('currentUser') || '{}').company_name || "Your Company"}
              </h1>
            </div>

            {/* STEPPER */}

            <div className="job-stepper">
              <div className={`job-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
                <div className="circle">
                  {step > 1 ? <FiCheckCircle size={20} /> : "1"}
                </div>
                <span>Job Details</span>
              </div>

              <div className={`line ${step >= 2 ? "active" : ""}`}></div>

              <div className={`job-step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
                <div className="circle">
                  {step > 2 ? <FiCheckCircle size={20} /> : "2"}
                </div>
                <span>Screening Details</span>
              </div>

              <div className={`line ${step >= 3 ? "active" : ""}`}></div>

              <div className={`job-step ${step >= 3 ? "active" : ""}`}>
                <div className="circle">3</div>
                <span>Publish</span>
              </div>
            </div>

            {/* STEP 1 */}

            {step === 1 && (
              <div className="job-form-card">
                <div className="form-header">
                  <h2>Create a Job Posting</h2>
                </div>

                {/* LOCATION */}

                <div className="field-group">
                  <label>Location</label>

                  <div className="input-with-icon">
                    <FiMapPin className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="City, Country or 'Remote'"
                      value={form.location}
                      onChange={(e) =>
                        updateField(
                          "location",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* TITLE */}

                <div className="field-group">
                  <label>Job Title</label>

                  <input
                    type="text"
                    placeholder="e.g. Senior Backend Engineer"
                    value={form.title}
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value
                      )
                    }
                  />
                </div>

                {/* JOB DESCRIPTION */}

                <div className="field-group">
                  <label>Job Description</label>

                  <div className="editor-wrapper" style={{ border: 'none', padding: 0 }}>
                    <ReactQuill 
                      theme="snow" 
                      value={form.description} 
                      onChange={(val) => updateField("description", val)}
                      modules={quillModules}
                      placeholder="Describe the role, the team, and what makes this a great opportunity."
                      style={{ height: '200px', marginBottom: '50px' }}
                    />
                  </div>
                </div>

                {/* REQUIREMENTS */}

                <div className="field-group">
                  <label>Requirements</label>

                  <div className="editor-wrapper" style={{ border: 'none', padding: 0 }}>
                    <ReactQuill 
                      theme="snow" 
                      value={form.requirements} 
                      onChange={(val) => updateField("requirements", val)}
                      modules={quillModules}
                      placeholder="List skills, qualifications, and experience required."
                      style={{ height: '150px', marginBottom: '50px' }}
                    />
                  </div>
                </div>

                {/* CATEGORY */}

                <div className="field-group">
                  <label>Field / Category</label>

                  <input
                    type="text"
                    placeholder="Technology, Finance, Marketing..."
                    value={form.category}
                    onChange={(e) =>
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                  />
                </div>

                {/* EXPERIENCE */}

                <div className="field-group">
                  <label>Experience Level</label>

                  <div className="option-group">
                    {[
                      "Entry Level",
                      "Mid Level",
                      "Senior",
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`option-btn ${form.experienceLevel === item
                          ? "selected"
                          : ""
                          }`}
                        onClick={() =>
                          updateField(
                            "experienceLevel",
                            item
                          )
                        }
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* EMPLOYMENT */}

                <div className="field-group">
                  <label>Employment Type</label>

                  <div className="option-group four">
                    {[
                      "Full-Time",
                      "Part-Time",
                      "Contract",
                      "Internship",
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`option-btn ${form.employmentType === item
                          ? "selected"
                          : ""
                          }`}
                        onClick={() =>
                          updateField(
                            "employmentType",
                            item
                          )
                        }
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>


                {/* ACTION */}

                <div className="wizard-footer">
                  <button
                    type="button"
                    className="continue-btn"
                    onClick={() => setStep(2)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                  >
                    Continue <FiArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}

            {step === 2 && (
              <div className="job-form-card">
                <div className="screening-header">
                  <div>
                    <h2>Add Screening Process</h2>
                    <p>Interview Questions</p>
                  </div>

                  <label className="skip-checkbox">
                    <input
                      type="checkbox"
                      checked={form.skipScreening}
                      onChange={(e) =>
                        updateField(
                          "skipScreening",
                          e.target.checked
                        )
                      }
                    />

                    <span>
                      Skip screening questions
                    </span>
                  </label>
                </div>

                <div className="screening-info">
                  <ul>
                    <li>
                      Best practice: Ask 2–3 focused
                      questions. Avoid yes/no
                      questions to allow candidates
                      to demonstrate their reasoning.
                    </li>
                  </ul>
                </div>

                {!form.skipScreening && (
                  <>
                    {form.screeningQuestions.map(
                      (question, index) => (
                        <div
                          key={index}
                          className="question-card"
                        >
                          <div className="question-top">
                            <div className="question-label">
                              ⋮⋮ QUESTION {index + 1}
                            </div>

                            <button
                              type="button"
                              className="delete-question"
                            >
                              🗑
                            </button>
                          </div>

                          <textarea
                            rows="3"
                            placeholder="Enter your screening question here..."
                            value={question}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )
                    )}

                    <button
                      type="button"
                      className="add-question-btn"
                      onClick={addQuestion}
                    >
                      + Add another question
                    </button>
                  </>
                )}

                <div className="video-screening-card">
                  <div>
                    <div className="video-title">
                      🎥 Video Screening
                    </div>

                    <div className="video-desc">
                      Candidates will record a video
                      response for these questions.
                    </div>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={form.videoScreening}
                      onChange={(e) =>
                        updateField(
                          "videoScreening",
                          e.target.checked
                        )
                      }
                    />

                    <span className="slider"></span>
                  </label>
                </div>

                <div className="wizard-footer">
                  <button
                    className="secondary-btn"
                    onClick={() => setStep(1)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                  >
                    <FiArrowLeft /> Back
                  </button>

                  <button
                    className="primary-btn"
                    onClick={() => setStep(3)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                  >
                    Continue <FiArrowRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}

            {step === 3 && (
              <div className="job-form-card">
                <div className="form-header">
                  <h2>Review Before Publishing</h2>
                  <p>Once published, candidates can immediately find and apply for this role.</p>
                </div>

                {/* Job Title + Edit */}
                <div className="review-title-row">
                  <h3 className="review-job-title">{form.title || "Untitled Position"}</h3>
                  <button
                    type="button"
                    className="edit-link-btn"
                    onClick={() => setStep(1)}
                  >
                    Edit Details
                  </button>
                </div>

                {/* Tags */}
                <div className="review-tags">
                  <span className="review-tag">
                    <FiBriefcase size={14} />
                    {form.experienceLevel}
                  </span>
                  <span className="review-tag">
                    <FiCheckCircle size={14} />
                    {form.category || "Uncategorized"}
                  </span>
                  <span className="review-tag">
                    <FiClock size={14} />
                    {form.employmentType}
                  </span>
                  <span className="review-tag">
                    <FiMapPin size={14} />
                    {form.location || "Not specified"}
                  </span>
                </div>

                {/* About the Role */}
                <div className="review-section">
                  <h4 className="review-section-title">About the Role</h4>
                  <p className="review-section-text">
                    {form.description || "No description provided."}
                  </p>
                  {form.description && form.description.length > 200 && (
                    <button type="button" className="read-more-btn">Read more</button>
                  )}
                </div>

                {/* Screening Summary */}
                <div className="review-screening-box">
                  <div className="review-screening-header">
                    <div className="review-screening-left">
                      <span className="screening-icon">📋</span>
                      <strong>Screening Summary</strong>
                    </div>
                    <button
                      type="button"
                      className="edit-link-btn"
                      onClick={() => setStep(2)}
                    >
                      Edit Questions
                    </button>
                  </div>

                  <ul className="review-screening-list">
                    {form.skipScreening ? (
                      <li>No screening questions</li>
                    ) : (
                      <li>
                        {form.screeningQuestions.filter((q) => q.trim()).length} screening questions defined
                      </li>
                    )}
                    <li>
                      {form.videoScreening
                        ? "Video responses required"
                        : "No video screening"}
                    </li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="wizard-footer">
                  <button
                    className="back-btn"
                    onClick={() => setStep(2)}
                  >
                    <FiChevronLeft size={16} />
                    Back
                  </button>

                  <button
                    className="publish-btn"
                    onClick={publishJob}
                  >
                    Publish Job
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
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