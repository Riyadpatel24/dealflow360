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
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      const role = data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (["SALES", "SALES_MANAGER", "FINANCE"].includes(role)) navigate("/sales");
      else if (role === "CUSTOMER") navigate("/customer");
      else setError(`Unsupported account role: ${role || "unknown"}`);
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <aside className="login-rail">
        <div className="login-brand">
          <div className="login-brand-icon">D</div>
          <div>
            <div className="login-brand-name">DealFlow360</div>
            <div className="login-brand-subtitle">Intelligent Sales Operations</div>
          </div>
        </div>
        <div className="login-rail-mark">01 — 04</div>
        <div className="login-rail-copy">
          <span>THE DEAL OPERATING SYSTEM</span>
          <h1>Move the<br /><em>right</em> deal<br />forward.</h1>
          <p>One connected workspace for pricing, risk, approvals, fulfillment and revenue.</p>
        </div>
        <div className="login-route">
          <div><b>01</b><span>PRICE</span></div>
          <div><b>02</b><span>CONTROL</span></div>
          <div><b>03</b><span>APPROVE</span></div>
          <div><b>04</b><span>COLLECT</span></div>
        </div>
        <div className="login-rail-footer">Built for modern sales teams · DealFlow360</div>
      </aside>

      <section className="login-workspace">
        <div className="login-workspace-top"><span>DEALFLOW360 / ACCESS</span><span>SECURE WORKSPACE</span></div>
        <div className="login-form-wrap">
          <div className="login-intro">
            <span className="login-kicker">WELCOME BACK</span>
            <h2>Sign in.</h2>
            <p>Continue where your deals left off.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Work email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </div>
            <div className="login-field">
              <div className="login-label-row"><label htmlFor="login-password">Password</label><span>Protected session</span></div>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Opening workspace…" : "Enter workspace  →"}</button>
          </form>

          <div className="login-divider"><span />or<span /></div>
          <button type="button" className="google-button" onClick={() => { window.location.href = googleLoginUrl(); }}><span className="google-mark">G</span> Continue with Google</button>

          <div className="login-access-note"><span>◈</span><div><strong>Private by design</strong><small>Only accounts provisioned in DealFlow360 can access the workspace.</small></div></div>
          <div className="login-signup">New customer? <Link to="/signup">Create an account</Link></div>
        </div>
        <div className="login-workspace-footer"><span>AUTHENTICATED ACCESS</span><span>© DealFlow360</span></div>
      </section>
    </main>
  );
}
