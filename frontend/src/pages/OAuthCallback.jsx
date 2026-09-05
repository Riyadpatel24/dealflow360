import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogleToken } = useAuth();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    if (!token) { setError("Google sign-in did not return a session."); return; }
    loginWithGoogleToken(token).then((user) => {
      if (user.role === "ADMIN") navigate("/admin", { replace: true });
      else if (["SALES", "SALES_MANAGER", "FINANCE"].includes(user.role)) navigate("/sales", { replace: true });
      else if (user.role === "CUSTOMER") navigate("/customer", { replace: true });
      else setError("Unsupported account role.");
    }).catch((err) => setError(err.message || "Unable to complete Google sign-in."));
  }, [params, navigate, loginWithGoogleToken]);

  return <div className="auth-page"><div className="auth-card"><div className="auth-heading"><h2>{error ? "Sign-in failed" : "Signing you in…"}</h2><p>{error || "Verifying your Google account and opening DealFlow360."}</p></div>{error && <button className="primary-button" type="button" onClick={() => navigate("/login")}>Back to sign in</button>}</div></div>;
}
