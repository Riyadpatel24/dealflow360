import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading DealFlow360...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  const savedProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem(`dealflow360_profile_${(user.email || "user").toLowerCase()}`)) || {};
    } catch {
      return {};
    }
  })();
  const displayName = savedProfile.name || user.name || user.email?.split("@")[0] || "User";
  const avatar = savedProfile.avatar || "🦊";

  return (
    <>
      <div className="profile-launcher-wrap">
        <button className="profile-launcher" type="button" onClick={() => navigate("/profile")} aria-label="Open profile">
          <span className="profile-avatar">{avatar}</span>
          <span className="profile-launcher-copy">
            <strong>{displayName}</strong>
            <small>{(user.role || "USER").replaceAll("_", " ")}</small>
          </span>
          <span className="profile-chevron">⌄</span>
        </button>
      </div>
      <Outlet />
    </>
  );
}
