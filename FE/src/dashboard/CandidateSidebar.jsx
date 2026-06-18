import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiUser,
  FiFileText,
  FiMap,
  FiMic,
  FiSearch,
  FiBriefcase,
  FiLogOut,
} from "react-icons/fi";

export default function CandidateSidebar({
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
      onNavigate("/login", () => {
        localStorage.clear();
        navigate("/login");
      });
    } else {
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="candidate-sidebar">

      <div>

        <img
          src="/gambar/19mj.png"
          alt="logo"
          style={{
            width: 120,
            marginBottom: 20,
          }}
        />

        <MenuItem
          active={active === "dashboard"}
          icon={<FiGrid />}
          text="Dashboard"
          onClick={() => handleNav("/dashboard")}
        />

        <MenuItem
          active={active === "my-profile"}
          icon={<FiUser />}
          text="My Profile"
          onClick={() => handleNav("/my-profile")}
        />

        <MenuItem
          active={active === "cv"}
          icon={<FiFileText />}
          text="CV Review"
          onClick={() => handleNav("/cv-review")}
        />

        <MenuItem
          active={active === "career"}
          icon={<FiMap />}
          text="Career Planner"
          onClick={() => handleNav("/career-planner")}
        />

        <MenuItem
          active={active === "practice"}
          icon={<FiMic />}
          text="Interview Practice"
          onClick={() => handleNav("/interview-practice")}
        />

        <MenuItem
          active={active === "jobs"}
          icon={<FiSearch />}
          text="Find Jobs"
          onClick={() => handleNav("/find-jobs")}
        />

        <MenuItem
          active={active === "applications"}
          icon={<FiBriefcase />}
          text="My Applications"
          onClick={() => handleNav("/my-applications")}
        />

      </div>

      <MenuItem
        icon={<FiLogOut />}
        text="Logout"
        onClick={logout}
      />

      <style>{`
        .candidate-sidebar {
          width: 260px;
          background: linear-gradient(180deg, #d9edf8 0%, #c8e6f0 100%);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .candidate-sidebar-menu {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 12px;
          margin-top: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #222;
          background: transparent;
          align-items: center;
          white-space: nowrap;
        }

        .candidate-sidebar-menu.active {
          background: #0f7c82;
          color: white;
        }

        @media (max-width: 768px) {
          .candidate-sidebar {
            width: 100%;
            padding: 10px;
            flex-direction: row;
            overflow-x: auto;
            align-items: center;
            height: 70px;
          }
          
          .candidate-sidebar > div:first-child {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .candidate-sidebar img {
            display: none; /* Hide logo on mobile sidebar to save space */
          }

          .candidate-sidebar-menu {
            margin-top: 0;
            padding: 8px 12px;
          }

          /* Hide logout on mobile topbar, or keep it small */
          .candidate-sidebar > div:last-child {
            margin-left: 10px;
          }
          
          .menu-text {
            display: none; /* Hide text on mobile, just show icons */
          }
        }
      `}</style>
    </div>
  );
}

function MenuItem({
  icon,
  text,
  onClick,
  active,
}) {
  return (
    <div
      onClick={onClick}
      className={`candidate-sidebar-menu ${active ? "active" : ""}`}
    >
      {icon}
      <span className="menu-text">{text}</span>
    </div>
  );
}

const styles = {};