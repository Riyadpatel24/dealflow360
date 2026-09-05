import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const AVATARS = ["🦊", "🐼", "🐨", "🐰", "🐻", "🐯", "🐸", "🦄"];

function profileKey(email) {
  return `dealflow360_profile_${(email || "user").toLowerCase()}`;
}

function getProfile(user) {
  try {
    const raw = localStorage.getItem(profileKey(user?.email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(() => getProfile(user));

  useEffect(() => {
    setProfile(getProfile(user));
  }, [user]);

  useEffect(() => {
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) return null;

  const name = profile?.name || user.name || "Workspace user";
  const avatar = profile?.avatar || AVATARS[0];
  const role = (user.role || "USER").replaceAll("_", " ");

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-menu-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="profile-menu-avatar">{avatar}</span>
        <span className="profile-menu-copy">
          <strong>{name}</strong>
          <small>{role}</small>
        </span>
        <span className="profile-menu-chevron">⌄</span>
      </button>

      {open && (
        <div className="profile-menu-popover">
          <div className="profile-menu-summary">
            <span className="profile-menu-avatar profile-menu-avatar-large">{avatar}</span>
            <div>
              <strong>{name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <div className="profile-menu-divider" />
          <Link to="/profile" onClick={() => setOpen(false)}>👤 My profile</Link>
          <button type="button" onClick={handleLogout}>↪ Log out</button>
        </div>
      )}
    </div>
  );
}
