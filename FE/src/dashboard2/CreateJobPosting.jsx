import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import CompanySidebar from "./CompanySidebar";
import CompanyHeader from "./CompanyHeader";
import "./Dashboard2.css";

export default function CreateJobPosting() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

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

  const publishJob = () => {
    const jobs =
      JSON.parse(
        localStorage.getItem(
          "jobPostings"
        ) || "[]"
      );

    const newJob = {
      id: Date.now(),

      title: form.title,
      category: form.category,
      location: form.location,
      description:
        form.description,
      requirements:
        form.requirements,

      experienceLevel:
        form.experienceLevel,

      employmentType:
        form.employmentType,

      screeningQuestions:
        form.skipScreening
          ? []
          : form.screeningQuestions.filter(
              (q) => q.trim()
            ),

      videoScreening:
        form.videoScreening,

      skipScreening:
        form.skipScreening,

      applicants: 0,
      views: 0,

      status: "Active",

      createdAt:
        new Date().toISOString(),
    };

    jobs.unshift(newJob);

    localStorage.setItem(
      "jobPostings",
      JSON.stringify(jobs)
    );

    window.dispatchEvent(
      new Event(
        "jobPostingUpdated"
      )
    );

    navigate(
      "/company/job-postings"
    );
  };

  return (
    <div className="company-layout">
      <CompanySidebar active="jobs" />

      <div className="company-main">
        <CompanyHeader title="Create Job Posting" />

        <div className="dashboard-content">
          {/* STEPPER */}

          <div className="stepper">
            <div
              className={`step ${
                step >= 1
                  ? "active"
                  : ""
              }`}
            >
              1
            </div>

            <div className="step-line" />

            <div
              className={`step ${
                step >= 2
                  ? "active"
                  : ""
              }`}
            >
              2
            </div>

            <div className="step-line" />

            <div
              className={`step ${
                step >= 3
                  ? "active"
                  : ""
              }`}
            >
              3
            </div>
          </div>

          {/* STEP 1 */}

          {step === 1 && (
            <div className="wizard-card">
              <h2>
                Job Details
              </h2>

              <div className="form-grid">
                <div>
                  <label>
                    Job Title
                  </label>

                  <input
                    value={
                      form.title
                    }
                    onChange={(
                      e
                    ) =>
                      updateField(
                        "title",
                        e.target
                          .value
                      )
                    }
                  />
                </div>

                <div>
                  <label>
                    Location
                  </label>

                  <input
                    value={
                      form.location
                    }
                    onChange={(
                      e
                    ) =>
                      updateField(
                        "location",
                        e.target
                          .value
                      )
                    }
                  />
                </div>
              </div>

              <label>
                Category
              </label>

              <input
                value={
                  form.category
                }
                onChange={(e) =>
                  updateField(
                    "category",
                    e.target.value
                  )
                }
              />

              <label>
                Description
              </label>

              <textarea
                rows="6"
                value={
                  form.description
                }
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
              />

              <label>
                Requirements
              </label>

              <textarea
                rows="6"
                value={
                  form.requirements
                }
                onChange={(e) =>
                  updateField(
                    "requirements",
                    e.target.value
                  )
                }
              />

              <div className="form-grid">
                <div>
                  <label>
                    Experience
                  </label>

                  <select
                    value={
                      form.experienceLevel
                    }
                    onChange={(
                      e
                    ) =>
                      updateField(
                        "experienceLevel",
                        e.target
                          .value
                      )
                    }
                  >
                    <option>
                      Entry Level
                    </option>
                    <option>
                      Mid Level
                    </option>
                    <option>
                      Senior
                    </option>
                  </select>
                </div>

                <div>
                  <label>
                    Employment Type
                  </label>

                  <select
                    value={
                      form.employmentType
                    }
                    onChange={(
                      e
                    ) =>
                      updateField(
                        "employmentType",
                        e.target
                          .value
                      )
                    }
                  >
                    <option>
                      Full-Time
                    </option>
                    <option>
                      Part-Time
                    </option>
                    <option>
                      Contract
                    </option>
                    <option>
                      Internship
                    </option>
                  </select>
                </div>
              </div>

              <div className="wizard-footer">
                <button
                  className="primary-btn"
                  onClick={() =>
                    setStep(2)
                  }
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <div className="screening-container fade-in">
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
                >
                    ← Back
                </button>

                <button
                    className="primary-btn"
                    onClick={() => setStep(3)}
                >
                    Continue →
                </button>
                </div>
            </div>
            )}

          {/* STEP 3 */}

          {step === 3 && (
            <div className="wizard-card">
              <h2>
                Review & Publish
              </h2>

              <div className="review-card">
                <h3>
                  {form.title}
                </h3>

                <p>
                  {
                    form.category
                  }
                </p>

                <br />

                <p>
                  📍{" "}
                  {
                    form.location
                  }
                </p>

                <p>
                  💼{" "}
                  {
                    form.employmentType
                  }
                </p>

                <p>
                  ⭐{" "}
                  {
                    form.experienceLevel
                  }
                </p>
              </div>

              <div className="review-card">
                <h4>
                  Description
                </h4>

                <p>
                  {
                    form.description
                  }
                </p>
              </div>

              <div className="review-card">
                <h4>
                  Screening
                </h4>

                {form.skipScreening ? (
                  <p>
                    No Screening
                    Questions
                  </p>
                ) : (
                  <ul>
                    {form.screeningQuestions
                      .filter(
                        (q) =>
                          q.trim()
                      )
                      .map(
                        (
                          q,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            {q}
                          </li>
                        )
                      )}
                  </ul>
                )}
              </div>

              <div className="wizard-footer">
                <button
                  className="secondary-btn"
                  onClick={() =>
                    setStep(2)
                  }
                >
                  Back
                </button>

                <button
                  className="primary-btn"
                  onClick={
                    publishJob
                  }
                >
                  Publish Job
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}