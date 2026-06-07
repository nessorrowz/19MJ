import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBriefcase,
  FiUsers,
  FiTrendingUp,
  FiLogOut,
} from "react-icons/fi";

import "./Dashboard2.css";

export default function CompanySidebar({
  active,
}) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/company/login");
  };

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <FiGrid />,
      path: "/company/dashboard",
    },
    {
      key: "profile",
      label: "Company Profile",
      icon: <FiBriefcase />,
      path: "/company/profile",
    },
    {
      key: "jobs",
      label: "Job Postings",
      icon: <FiBriefcase />,
      path: "/company/job-postings",
    },
    {
      key: "recruitment",
      label: "Recruitment",
      icon: <FiUsers />,
      path: "/company/recruitment",
    },
    {
      key: "recommendations",
      label: "Recommendations",
      icon: <FiTrendingUp />,
      path: "/company/recommendations",
    },
  ];

  return (
    <div className="company-sidebar">
      <div>
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <h2
            style={{
              color: "#0f7c82",
              fontWeight: "700",
            }}
          >
            19MJ
          </h2>
        </div>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.key}
              className={`sidebar-item ${
                active === item.key
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate(item.path)
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="sidebar-item"
        onClick={logout}
      >
        <FiLogOut />
        <span>Logout</span>
      </div>
    </div>
  );
}