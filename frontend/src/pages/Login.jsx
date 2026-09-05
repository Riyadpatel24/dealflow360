import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/login.css";

const DEMO_ACCOUNTS = [
  ["Admin", "admin@dealflow360.com"],
  ["Sales", "sales@dealflow360.com"],
  ["Manager", "manager@dealflow360.com"],
  ["Finance", "finance@dealflow360.com"],
  ["Customer", "customer@dealflow360.com"],
];

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
    <div className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <div className="login-brand-icon">D</div>
          <div>
            <div className="login-brand-name">DealFlow360</div>
            <div className="login-brand-subtitle">Intelligent Sales Operations</div>
          </div>
        </div>
        <div className="login-hero-copy">
          <h1>From Quotes<br />to Revenue —<br /><span>Smarter, Faster.</span></h1>
          <p>Automate approvals. Enforce policies.<br />Close deals with confidence.</p>
        </div>
        <div className="login-features">
          <div className="login-feature"><div className="login-feature-icon">◇</div><div><strong>Policy-driven discounts</strong><span>Stay compliant, always</span></div></div>
          <div className="login-feature"><div className="login-feature-icon">♧</div><div><strong>Multi-level approvals</strong><span>Sales → Manager → Finance</span></div></div>
          <div className="login-feature"><div className="login-feature-icon">⌁</div><div><strong>Real-time risk evaluation</strong><span>Spot and mitigate risks early</span></div></div>
          <div className="login-feature"><div className="login-feature-icon">ϟ</div><div><strong>Faster deal closures</strong><span>From quotation to fulfillment</span></div></div>
        </div>
        <div className="login-footer-note">Built for modern sales teams. Powered by <strong>Odoo.</strong></div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-heading"><h2>Welcome back</h2><p>Sign in to your workspace</p></div>
          <form onSubmit={handleSubmit}>
            <div className="login-field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
            <div className="login-field"><label htmlFor="login-password">Password</label><input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" /></div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          </form>
          <div className="login-divider"><span />or<span /></div>
          <button type="button" className="google-button" onClick={() => setError("Google sign-in is not configured for this hackathon build.")}><span className="google-mark">G</span> Continue with Google</button>
          <div className="login-demo"><h3>Hackathon demo accounts</h3>{DEMO_ACCOUNTS.map(([label, account]) => <p key={label}><strong>{label}:</strong> {account}</p>)}</div>
          <div className="login-signup">New customer? <Link to="/signup">Create an account</Link></div>
        </div>
      </section>
    </div>
  );
}
