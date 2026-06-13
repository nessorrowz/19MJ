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
  onNavigate
}) {
  const navigate = useNavigate();

  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path, () => navigate(path));
    } else {
      navigate(path);
    }
  };

  const logout = () => {
    if (onNavigate) {
      onNavigate("/company/login", () => {
        localStorage.clear();
        navigate("/company/login");
      });
    } else {
      localStorage.clear();
      navigate("/company/login");
    }
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
        <img
          src="/gambar/19mj.png"
          alt="logo"
          style={{
            width: 120,
            marginBottom: 20,
          }}
        />

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
                handleNav(item.path)
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