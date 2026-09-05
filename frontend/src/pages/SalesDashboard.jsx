import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const modules = [
  {
    title: "Quotations",
    description:
      "Create, inspect and evaluate customer quotations.",
    path: "/sales/quotations",
    icon: "📄",
  },
  {
    title: "Approvals",
    description:
      "Review quotations requiring approval.",
    path: "/sales/approvals",
    icon: "✅",
  },
  {
    title: "Fulfillment",
    description:
      "Manage warehouse allocation and fulfillment.",
    path: "/sales/fulfillment",
    icon: "🚚",
  },
  {
    title: "Deal Health",
    description:
      "Monitor risk and identify unhealthy deals.",
    path: "/sales/deal-health",
    icon: "📊",
  },
];

export default function SalesDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">

      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">
            Sales Workspace
          </span>
        </div>

        <div className="topbar-user">
          <span>
            {user?.name} · Sales
          </span>

          <button
            className="secondary-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-container">

        <div className="page-heading">
          <div>
            <h1>Sales Dashboard</h1>
            <p>
              Manage the quotation-to-cash workflow.
            </p>
          </div>
        </div>

        <div className="module-grid">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="module-card"
            >
              <div className="module-icon">
                {module.icon}
              </div>

              <h2>{module.title}</h2>

              <p>{module.description}</p>

              <span className="module-link">
                Open →
              </span>
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}