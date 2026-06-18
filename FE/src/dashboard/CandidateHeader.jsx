import React, { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import api from "../utils/api";

export default function CandidateHeader({ title }) {
  const CACHE_KEY = "candidateHeaderProfileCache";

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return { fullName: "", photo: "" };
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        const newProfile = {
          fullName: user.full_name || user.username || "",
          photo: user.photo || ""
        };
        setProfile(newProfile);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
      } catch (err) {
        console.error("Failed to load header profile", err);
      }
    };

    loadProfile();

    window.addEventListener("candidateProfileUpdated", loadProfile);
    return () => {
      window.removeEventListener("candidateProfileUpdated", loadProfile);
    };
  }, []);

  return (
    <div className="candidate-header">
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{title}</h2>

      <div style={styles.headerRight}>
        <FiBell size={18} color="#64748b" style={{ cursor: "pointer" }} />

        {profile.photo ? (
          <img
            src={profile.photo}
            alt="Profile"
            style={styles.headerPhoto}
          />
        ) : (
          <div style={styles.avatarFallback}>
            {(profile.fullName || "U")[0].toUpperCase()}
          </div>
        )}

        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
            {profile.fullName || "User"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Job Seeker
          </div>
        </div>
      </div>
      <style>{`
        .candidate-header {
          height: 88px;
          background: white;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          flex-shrink: 0;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .candidate-header {
            padding: 0 16px;
            flex-direction: column;
            height: auto;
            padding-top: 16px;
            padding-bottom: 16px;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16
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
    fontWeight: 700,
    fontSize: 16
  },
  headerPhoto: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #e2e8f0"
  }
};
