import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const AVATARS = ["🦊", "🐼", "🐨", "🐰", "🐻", "🐯", "🐸", "🦄"];

function profileKey(email) {
  return `dealflow360_profile_${(email || "user").toLowerCase()}`;
}

function readProfile(user) {
  try {
    const saved = localStorage.getItem(profileKey(user?.email));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const saved = useMemo(() => readProfile(user), [user]);
  const [name, setName] = useState(saved?.name || user?.name || "");
  const [mobile, setMobile] = useState(saved?.mobile || user?.mobile || "");
  const [avatar, setAvatar] = useState(saved?.avatar || "🦊");
  const [savedMessage, setSavedMessage] = useState("");

  if (!user) return null;

  const roleLabel = (user.role || "USER").replaceAll("_", " ");
  const initials = (name || user.email || "U").trim().charAt(0).toUpperCase();

  function saveProfile(event) {
    event.preventDefault();
    const profile = { name: name.trim() || user.name || "DealFlow User", mobile: mobile.trim(), avatar };
    localStorage.setItem(profileKey(user.email), JSON.stringify(profile));
    setSavedMessage("Profile updated successfully.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <button className="profile-back" type="button" onClick={() => navigate(-1)}>← Back</button>

        <div className="profile-header">
          <div>
            <div className="eyebrow">ACCOUNT SETTINGS</div>
            <h1>My Profile</h1>
            <p>Manage the details shown across your DealFlow360 workspace.</p>
          </div>
          <div className="profile-avatar profile-avatar-large" aria-label="Profile avatar">
            {avatar || initials}
          </div>
        </div>

        <div className="profile-grid">
          <section className="content-card profile-card">
            <div className="profile-card-heading">
              <div>
                <h2>Personal information</h2>
                <p>Keep your workspace identity up to date.</p>
              </div>
              <span className="profile-role">{roleLabel}</span>
            </div>

            <form onSubmit={saveProfile}>
              <div className="profile-form-grid">
                <div className="profile-field profile-field-full">
                  <label htmlFor="profile-name">Full name</label>
                  <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-email">Email address</label>
                  <input id="profile-email" value={user.email || ""} readOnly />
                  <small>Your sign-in email cannot be changed here.</small>
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-mobile">Mobile number</label>
                  <input id="profile-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" />
                </div>
              </div>

              <div className="profile-avatar-picker">
                <div>
                  <label>Choose your avatar</label>
                  <small>A little personality for your workspace.</small>
                </div>
                <div className="avatar-options">
                  {AVATARS.map((item) => (
                    <button key={item} type="button" className={`avatar-option ${avatar === item ? "selected" : ""}`} onClick={() => setAvatar(item)} aria-label={`Choose ${item}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {savedMessage && <div className="success-message">{savedMessage}</div>}

              <div className="profile-actions">
                <button className="primary-small-button" type="submit">Save changes</button>
                <button className="secondary-button" type="button" onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </form>
          </section>

          <aside className="content-card profile-side-card">
            <div className="profile-mini-avatar">{avatar}</div>
            <h2>{name || "DealFlow User"}</h2>
            <p>{user.email}</p>
            <span className="profile-role">{roleLabel}</span>
            <div className="profile-side-divider" />
            <button className="profile-logout" type="button" onClick={handleLogout}>↪ Log out</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
