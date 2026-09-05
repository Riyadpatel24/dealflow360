import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ProfileMenu from "../components/ProfileMenu";

export default function CustomerDashboard() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Customer Portal</span></div>
        <div className="topbar-user"><ProfileMenu /></div>
      </header>
      <main className="dashboard-container">
        <div className="page-heading"><div><h1>Customer Portal</h1><p>Manage your DealFlow360 transactions.</p></div></div>
        <div className="module-grid">
          <Link to="/customer/quotations" className="module-card"><div className="module-icon">📄</div><h2>My Quotations</h2><p>View quotations associated with your company.</p><span className="module-link">Open →</span></Link>
          <Link to="/customer/quotations" className="module-card"><div className="module-icon">🤝</div><h2>Negotiation</h2><p>Review quotations and submit counter-proposals.</p><span className="module-link">Open →</span></Link>
          <div className="module-card"><div className="module-icon">🧾</div><h2>Invoices</h2><p>View invoices and payment status.</p><span className="coming-soon">Available from Finance</span></div>
        </div>
      </main>
    </div>
  );
}