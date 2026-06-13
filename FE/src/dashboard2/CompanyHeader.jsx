import React, { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import api from "../utils/api";

export default function CompanyHeader({ title }) {
  const CACHE_KEY = "companyHeaderProfileCache";

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return { companyName: "", logo: "" };
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        const newProfile = {
          companyName: user.company_name || "",
          logo: user.logo || ""
        };
        setProfile(newProfile);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newProfile));
      } catch (err) {
        console.error("Failed to load header profile", err);
      }
    };

    loadProfile();

    window.addEventListener("companyProfileUpdated", loadProfile);
    return () => {
      window.removeEventListener("companyProfileUpdated", loadProfile);
    };
  }, []);

  return (
    <div style={styles.header}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{title}</h2>

      <div style={styles.headerRight}>
        <FiBell size={18} color="#64748b" style={{ cursor: "pointer" }} />

        {profile.logo ? (
          <img
            src={profile.logo}
            alt="Company"
            style={styles.headerPhoto}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div style={styles.avatarFallback}>
            {(profile.companyName || "C")[0].toUpperCase()}
          </div>
        )}

        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
            {profile.companyName || "Company"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Company
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    height: 88,
    background: "white",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    flexShrink: 0,
    boxSizing: "border-box"
  },
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