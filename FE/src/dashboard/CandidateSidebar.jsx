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
    <div style={styles.sidebar}>

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
      style={{
        ...styles.menu,
        background: active
          ? "#0f7c82"
          : "transparent",
        color: active
          ? "white"
          : "#222",
      }}
    >
      {icon}
      {text}
    </div>
  );
}

const styles = {
  sidebar: {
    width: 260,
    background:
      "linear-gradient(180deg, #d9edf8 0%, #c8e6f0 100%)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  menu: {
    display: "flex",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
};