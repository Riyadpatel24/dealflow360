import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ProfileMenu from "../components/ProfileMenu";
import "./SalesDashboard.css";

const baseModules = [
  { title: "Quotations", description: "Build, review and evaluate customer quotes.", path: "/sales/quotations", icon: "▣", metric: "Quote pipeline", tone: "blue", roles: ["SALES", "SALES_MANAGER"] },
  { title: "Approvals", description: "Move high-risk deals through the right approval chain.", path: "/sales/approvals", icon: "✓", metric: "Governance", tone: "green", roles: ["SALES_MANAGER", "FINANCE"] },
  { title: "Fulfillment", description: "Allocate inventory and move approved orders to shipment.", path: "/sales/fulfillment", icon: "↗", metric: "Operations", tone: "teal", roles: ["SALES", "SALES_MANAGER"] },
  { title: "Deal Health", description: "Spot risk, stalled deals and revenue blockers early.", path: "/sales/deal-health", icon: "⌁", metric: "Intelligence", tone: "blue", roles: ["SALES", "SALES_MANAGER", "FINANCE"] },
];

export default function SalesDashboard() {
  const { user } = useAuth();
  const role = user?.role || "SALES";
  const roleLabel = role === "SALES_MANAGER" ? "Sales Manager" : role === "FINANCE" ? "Finance Operations" : "Sales";
  const isFinance = role === "FINANCE";
  const modules = baseModules.filter((module) => module.roles.includes(role));

  return (
    <div className="sales-page">
      <header className="sales-topbar">
        <Link to="/sales" className="sales-brand"><span className="sales-brand-mark">D</span><span><strong>DealFlow360</strong><small>Intelligent Sales Operations</small></span></Link>
        <div className="sales-user">
          <div className="sales-user-copy"><strong>{user?.name || "Workspace user"}</strong><span>{roleLabel}</span></div>
          <ProfileMenu />
        </div>
      </header>
      <main className="sales-content">
        <section className="sales-hero"><div><span className="eyebrow">{isFinance ? "FINANCE WORKSPACE" : role === "SALES_MANAGER" ? "MANAGEMENT WORKSPACE" : "SALES WORKSPACE"}</span><h1>{isFinance ? <>Govern every deal<br /><span>with financial control.</span></> : <>Move every deal<br /><span>forward with confidence.</span></>}</h1><p>{isFinance ? "Review financial exceptions, approvals and deal health before revenue is released." : "One workspace for quotations, risk controls, approvals and fulfillment — from first quote to revenue."}</p></div><div className="sales-hero-badge"><span className="pulse-dot" /><div><strong>Workflow online</strong><small>Policy &amp; approval engine active</small></div></div></section>
        <section className="sales-stat-grid"><div className="sales-stat"><span>01</span><strong>Quote</strong><small>Create &amp; price</small></div><div className="sales-stat"><span>02</span><strong>Risk</strong><small>Evaluate policy</small></div><div className="sales-stat"><span>03</span><strong>Approval</strong><small>Govern exceptions</small></div><div className="sales-stat"><span>04</span><strong>Revenue</strong><small>Fulfill &amp; collect</small></div></section>
        <div className="sales-section-heading"><div><span className="eyebrow">{isFinance ? "FINANCE MODULES" : "WORKFLOW MODULES"}</span><h2>{isFinance ? "Your control center" : "Your command center"}</h2></div><span className="sales-live-label">● Live workspace</span></div>
        <section className="sales-module-grid">{modules.map((module, index) => <Link key={module.path} to={module.path} className={`sales-module ${module.tone}`}><div className="sales-module-top"><span className="sales-module-icon">{module.icon}</span><span className="sales-module-number">0{index + 1}</span></div><div><span className="sales-module-label">{module.metric}</span><h3>{module.title}</h3><p>{module.description}</p></div><span className="sales-module-link">Open workspace <b>→</b></span></Link>)}</section>
        <section className="sales-flow-card"><div><span className="eyebrow">DEALFLOW</span><h2>{isFinance ? "From approval to revenue" : "From quote to cash"}</h2><p>{isFinance ? "Financial governance keeps exceptions controlled before the deal becomes revenue." : "Every decision is connected, traceable and ready for the next action."}</p></div><div className="sales-flow-steps">{(isFinance ? ["Risk check", "Manager", "Finance", "Revenue"] : ["Quotation", "Risk check", "Approval", "Fulfillment"]).map((step, index, steps) => <div className="sales-flow-step" key={step}><span>{index + 1}</span><strong>{step}</strong>{index < steps.length - 1 && <i>→</i>}</div>)}</div></section>
      </main>
    </div>
  );
}
