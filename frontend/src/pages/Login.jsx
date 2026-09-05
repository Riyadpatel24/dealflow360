import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { googleLoginUrl } from "../api/auth";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); setError("");
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      const role = data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (["SALES", "SALES_MANAGER", "FINANCE"].includes(role)) navigate("/sales");
      else if (role === "CUSTOMER") navigate("/customer");
      else setError(`Unsupported account role: ${role || "unknown"}`);
    } catch (err) { setError(err.message || "Invalid email or password."); }
    finally { setLoading(false); }
  }

  return <div className="login-page">
    <section className="login-hero">
      <div className="login-brand"><div className="login-brand-icon">D</div><div><div className="login-brand-name">DealFlow360</div><div className="login-brand-subtitle">Intelligent Sales Operations</div></div></div>
      <div className="login-hero-copy"><span className="login-kicker">THE DEAL OPERATING SYSTEM</span><h1>One deal.<br /><span>Every decision.</span></h1><p>Price with policy. Route exceptions. Move approved revenue into fulfillment — without losing the story behind the deal.</p></div>
      <div className="login-signal-grid"><div><span>01</span><strong>QUOTE</strong><small>Price &amp; configure</small></div><div><span>02</span><strong>RISK</strong><small>Policy intelligence</small></div><div><span>03</span><strong>APPROVAL</strong><small>Govern exceptions</small></div><div><span>04</span><strong>REVENUE</strong><small>Fulfill &amp; collect</small></div></div>
      <div className="login-hero-note">A connected workspace for sales, finance, operations and customers.</div>
    </section>
    <section className="login-panel"><div className="login-card">
      <div className="login-card-topline"><span>SECURE WORKSPACE</span><i>● ONLINE</i></div>
      <div className="login-heading"><h2>Welcome back.</h2><p>Sign in to continue where your deals left off.</p></div>
      <form onSubmit={handleSubmit}><div className="login-field"><label htmlFor="login-email">Work email</label><input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></div><div className="login-field"><div className="login-label-row"><label htmlFor="login-password">Password</label><span>Protected session</span></div><input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" /></div>{error && <div className="login-error">{error}</div>}<button className="login-submit" type="submit" disabled={loading}>{loading ? "Opening workspace…" : "Enter workspace  →"}</button></form>
      <div className="login-divider"><span />or<span /></div>
      <button type="button" className="google-button" onClick={() => { window.location.href = googleLoginUrl(); }}><span className="google-mark">G</span> Continue with Google</button>
      <div className="login-access-note"><span>◈</span><div><strong>Private by design</strong><small>Only accounts provisioned in DealFlow360 can access the workspace.</small></div></div>
      <div className="login-signup">New customer? <Link to="/signup">Create an account</Link></div>
    </div></section>
  </div>;
}
