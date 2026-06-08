import React, {
  useEffect,
  useState,
} from "react";

import { FiBell } from "react-icons/fi";
import "./Dashboard2.css";

import api from "../utils/api";

export default function CompanyHeader({
  title,
}) {
  const [company, setCompany] =
    useState({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.user;
        setCompany({
          companyName: user.company_name,
          logo: user.logo
        });
      } catch (err) {
        console.error("Failed to load header profile", err);
      }
    };

    loadProfile();

    window.addEventListener(
      "companyProfileUpdated",
      loadProfile
    );

    return () => {
      window.removeEventListener(
        "companyProfileUpdated",
        loadProfile
      );
    };
  }, []);

  return (
    <div className="company-header">
      <h2>{title}</h2>

      <div className="company-profile">
        <FiBell size={18} />

        <img
        src={
            company.logo &&
            company.logo.trim() !== ""
            ? company.logo
            : "https://ui-avatars.com/api/?name=Company"
        }
        alt="Company"
        className="company-header-avatar"
        onError={(e) => {
            e.target.src =
            "https://ui-avatars.com/api/?name=Company";
        }}
        />

        <div>
          <div className="company-name">
            {company.companyName ||
              "Company"}
          </div>

          <div className="company-role">
            Company
          </div>
        </div>
      </div>
    </div>
  );
}