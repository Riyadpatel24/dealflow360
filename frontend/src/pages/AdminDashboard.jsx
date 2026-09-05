import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ProfileMenu from "../components/ProfileMenu";

const modules = [
  { title: "Users", description: "Create and manage internal DealFlow360 users and access.", path: "/admin/users", icon: "👥" },
  { title: "Customers", description: "Manage customer companies and account tiers.", path: "/admin/customers", icon: "🏢" },
  { title: "Products", description: "Manage the product and service catalog.", path: "/admin/products", icon: "📦" },
  { title: "Discount Policies", description: "Configure customer-tier and category discount limits.", path: "/admin/policies", icon: "⚙️" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Admin Console</span></div>
        <div className="topbar-user"><ProfileMenu /></div>
      </header>
      <main className="dashboard-container">
        <div className="page-heading"><div><h1>Admin Dashboard</h1><p>Manage the operational foundation of DealFlow360.</p></div></div>
        <div className="module-grid">{modules.map((module) => <Link key={module.path} to={module.path} className="module-card"><div className="module-icon">{module.icon}</div><h2>{module.title}</h2><p>{module.description}</p><span className="module-link">Open →</span></Link>)}</div>
      </main>
    </div>
  );
}