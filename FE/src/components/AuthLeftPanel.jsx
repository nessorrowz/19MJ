import "../pages/Auth.css";

export default function AuthLeftPanel() {
  return (
    <div className="auth-left-panel">
      {/* Logo */}
      <img
        src="/gambar/19mj.png"
        alt="19MJ Logo"
        className="auth-logo"
      />

      {/* Character Illustration Container */}
      <div className="auth-illustration-container">
        {/* Character Image (already contains floating cards baked in) */}
        <img
          src="/gambar/ceweray.png"
          alt="Character illustration"
          className="character-animation auth-character-img"
        />
      </div>

      {/* Feature Badges */}
      <div className="auth-feature-badges">
        <div className="feature-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 5H13L9.5 7.5L10.5 12L7 9.5L3.5 12L4.5 7.5L1 5H5.5L7 1Z" fill="#0f7c82"/>
          </svg>
          <span>AI-Powered Analysis</span>
        </div>
        <div className="feature-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1C3.7 1 1 3.7 1 7C1 10.3 3.7 13 7 13C10.3 13 13 10.3 13 7C13 3.7 10.3 1 7 1ZM7 11.5C4.5 11.5 2.5 9.5 2.5 7C2.5 4.5 4.5 2.5 7 2.5C9.5 2.5 11.5 4.5 11.5 7C11.5 9.5 9.5 11.5 7 11.5Z" fill="#555"/>
            <path d="M7 4V7.5L9.5 9" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>Private & Secure</span>
        </div>
        <div className="feature-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#555" strokeWidth="1.2" fill="none"/>
            <path d="M4.5 7L6.5 9L9.5 5" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Free to Start</span>
        </div>
      </div>
    </div>
  );
}
