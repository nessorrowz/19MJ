import { useState } from "react";

import {
  FiBell,
  FiUpload,
  FiFileText,
  FiTrash2
} from "react-icons/fi";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

import CandidateSidebar from "./CandidateSidebar";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  pdfWorkerUrl;

export default function CVReview() {

  // =========================
  // USER + PROFILE
  // =========================
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") || "{}"
  );

  const profileStorageKey =
    `candidateProfile_${currentUser.email}`;

  const profile = JSON.parse(
    localStorage.getItem(profileStorageKey) || "{}"
  );

  // =========================
  // CV STORAGE
  // =========================
  const cvStorageKey =
    `candidateCV_${currentUser.email}`;

  const savedCVList = JSON.parse(
    localStorage.getItem(cvStorageKey) || "[]"
  );


  const [cvList, setCvList] =
    useState(savedCVList);

  const [loading, setLoading] =
    useState(false);

  const [selectedReview, setSelectedReview] =
    useState(null);



  // =========================
  // SAVE CV
  // =========================
  const updateCVList = (
    newList
  ) => {

    setCvList(
      newList
    );

    localStorage.setItem(
      cvStorageKey,
      JSON.stringify(
        newList
      )
    );

  };



  // =========================
  // PDF
  // =========================
  const extractPDFText =
    async (file) => {

      const arrayBuffer =
        await file.arrayBuffer();

      const pdf =
        await pdfjsLib
          .getDocument({
            data:
              arrayBuffer
          })
          .promise;

      let text = "";

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {

        const page =
          await pdf.getPage(i);

        const content =
          await page.getTextContent();

        text +=
          content.items
            .map(
              item => item.str
            )
            .join(" ");

      }

      return text;

    };



  // =========================
  // DOCX
  // =========================
  const extractDOCXText =
    async (file) => {

      const buffer =
        await file.arrayBuffer();

      const result =
        await mammoth.extractRawText({
          arrayBuffer:
            buffer
        });

      return result.value;

    };



  // =========================
  // DELETE
  // =========================
  const deleteCV =
    (index) => {

      const updated =
        cvList.filter(
          (_, i) =>
            i !== index
        );

      updateCVList(
        updated
      );

    };



  // =========================
  // UPLOAD
  // =========================
  const handleUpload =
    async (e) => {

      const file =
        e.target.files[0];

      if (!file)
        return;

      try {

        setLoading(
          true
        );

        let cvText =
          "";

        if (
          file.name.endsWith(".pdf")
        ) {

          cvText =
            await extractPDFText(
              file
            );

        } else if (

          file.name.endsWith(".docx")

        ) {

          cvText =
            await extractDOCXText(
              file
            );

        } else {

          alert(
            "Only PDF or DOCX"
          );

          return;

        }


        const token =
          localStorage.getItem(
            "token"
          );

        const response =
          await fetch(
            "http://localhost:3000/api/ai/cv-review",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`
              },

              body:
                JSON.stringify({
                  cvText,
                  targetRole:
                    "Software Engineer"
                })
            }
          );

        const result =
          await response.json();

        const newCV = {
          name:
            file.name,

          size:
            `${(
              file.size /
              1024 /
              1024
            ).toFixed(1)} MB`,

          date:
            new Date().toLocaleDateString(),

          status:
            "Reviewed",

          review:
            result.data ||
            result
        };

        const updated =
          [
            newCV,
            ...cvList
          ];

        updateCVList(
          updated
        );

      } catch (
      error
      ) {

        console.error(
          error
        );

        alert(
          "AI analysis failed"
        );

      } finally {

        setLoading(
          false
        );

      }

    };



  return (
    <div style={styles.container}>

      <CandidateSidebar active="cv" />

      <div style={styles.main}>


        {/* HEADER */}
        <div style={styles.header}>

          <h2>
            CV & AI Review
          </h2>

          <div style={styles.headerUser}>

            <FiBell />

            {profile.photo ? (

              <img
                src={
                  profile.photo
                }
                alt="profile"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius:
                    "50%",
                  objectFit:
                    "cover"
                }}
              />

            ) : (

              <div style={styles.avatar}>
                {(profile.fullName || "U")[0]}
              </div>

            )}

            <div>

              <div
                style={{
                  fontWeight: 600
                }}
              >
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



        {/* BODY */}
        <div
          style={{
            padding: 30
          }}
        >

          <h1>
            CV & AI Review
          </h1>

          <p
            style={{
              color:
                "#666",
              marginTop: 10,
              marginBottom: 30
            }}
          >
            Upload your CV to get AI feedback.
          </p>



          {/* UPLOAD */}
          <div style={styles.uploadBox}>

            <div style={styles.uploadIcon}>
              <FiUpload />
            </div>

            <h3>
              Drag and drop your CV here
            </h3>

            <p
              style={{
                color:
                  "#666",
                marginTop: 10
              }}
            >
              Supports PDF & DOCX
            </p>

            <label style={styles.uploadButton}>

              {loading
                ? "Analyzing..."
                : "Browse Files"}

              <input
                type="file"
                accept=".pdf,.docx"
                onChange={
                  handleUpload
                }
                style={{
                  display:
                    "none"
                }}
              />

            </label>

          </div>



          {/* LIST */}
          <h3
            style={{
              marginTop: 40,
              marginBottom: 20
            }}
          >
            Your CVs ({cvList.length})
          </h3>


          {cvList.map(
            (
              cv,
              index
            ) => (

              <div
                key={index}
                style={styles.cvCard}
              >

                <div
                  style={{
                    display:
                      "flex",
                    gap: 14,
                    alignItems:
                      "center"
                  }}
                >

                  <FiFileText />

                  <div>

                    <div
                      style={{
                        fontWeight: 600
                      }}
                    >
                      {cv.name}
                    </div>

                    <div
                      style={{
                        color:
                          "#666"
                      }}
                    >
                      {cv.date}
                      {" • "}
                      {cv.size}
                    </div>

                  </div>

                </div>


                <div
                  style={{
                    display:
                      "flex",
                    gap: 20,
                    alignItems:
                      "center"
                  }}
                >

                  <button
                    style={
                      styles.actionButton
                    }
                    onClick={() =>
                      setSelectedReview(
                        cv.review
                      )
                    }
                  >
                    View AI Review
                  </button>

                  <FiTrash2
                    onClick={() =>
                      deleteCV(
                        index
                      )
                    }
                    style={{
                      cursor:
                        "pointer"
                    }}
                  />

                </div>

              </div>

            )
          )}



          {/* REVIEW */}
          {selectedReview && (

            <div
              style={
                styles.reviewBox
              }
            >

              <h2>
                AI Review
              </h2>

              <pre
                style={{
                  whiteSpace:
                    "pre-wrap"
                }}
              >
                {JSON.stringify(
                  selectedReview,
                  null,
                  2
                )}
              </pre>

            </div>

          )}

        </div>

      </div>

    </div>
  );

}



const styles = {
  container: {
    display: "flex",
    minHeight:
      "100vh",
    background:
      "#f5f7fa"
  },

  main: {
    flex: 1
  },

  header: {
    background:
      "white",
    padding:
      "20px 30px",
    display:
      "flex",
    justifyContent:
      "space-between"
  },

  headerUser: {
    display:
      "flex",
    gap: 15,
    alignItems:
      "center"
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius:
      "50%",
    background:
      "#0f7c82",
    color:
      "white",
    display:
      "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  uploadBox: {
    background:
      "white",
    border:
      "2px dashed #99f6e4",
    borderRadius:
      20,
    padding: 60,
    textAlign:
      "center"
  },

  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius:
      "50%",
    background:
      "#ccfbf1",
    display:
      "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    margin:
      "0 auto 20px"
  },

  uploadButton: {
    display:
      "inline-block",
    marginTop: 20,
    padding:
      "12px 20px",
    border:
      "1px solid #0f7c82",
    borderRadius:
      10,
    cursor:
      "pointer"
  },

  cvCard: {
    background:
      "white",
    borderRadius:
      16,
    padding: 20,
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginBottom:
      16
  },

  actionButton: {
    border:
      "1px solid #0f7c82",
    background:
      "white",
    color:
      "#0f7c82",
    borderRadius:
      10,
    padding:
      "8px 16px",
    cursor:
      "pointer"
  },

  reviewBox: {
    background:
      "white",
    borderRadius:
      20,
    padding: 30,
    marginTop: 30
  }
};