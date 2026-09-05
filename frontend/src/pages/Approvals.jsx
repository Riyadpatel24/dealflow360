import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getQuotationApproval, getQuotations, actOnQuotationApproval } from "../api/quotations";
import { useAuth } from "../auth/AuthContext";
import "./Approvals.css";

function stepTone(status) { return String(status || "").toLowerCase().replaceAll("_", "-"); }

export default function Approvals() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function loadApprovals() {
    try {
      setLoading(true); setError("");
      const quotations = await getQuotations();
      const results = [];
      for (const quotation of quotations) {
        try {
          const approval = await getQuotationApproval(quotation.id);
          if (approval?.approval_request) results.push({ quotation, approval });
        } catch {}
      }
      setItems(results);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function decide(quotationId, stepId, action) {
    let reason = null;
    if (action !== "APPROVE") {
      reason = window.prompt(`Reason for ${action.toLowerCase()}:`);
      if (!reason?.trim()) return;
    }
    const key = `${quotationId}-${stepId}`;
    try {
      setBusy(key); setError("");
      await actOnQuotationApproval(quotationId, stepId, action, reason);
      await loadApprovals();
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  useEffect(() => { loadApprovals(); }, []);
  const role = user?.role;

  return (
    <div className="app-shell approval-page">
      <header className="topbar">
        <div className="brand-lockup"><strong>DealFlow360</strong><span className="topbar-subtitle">Sales / Approvals</span></div>
        <Link to="/sales" className="secondary-button">← Sales Dashboard</Link>
      </header>
      <main className="dashboard-container">
        <div className="page-heading">
          <div><div className="eyebrow">GOVERNANCE CENTER</div><h1>Approval Queue</h1><p>Review policy exceptions and move deals through the correct approval chain.</p></div>
          <span className="approval-role">{role === "FINANCE" ? "Finance review" : role === "SALES_MANAGER" ? "Manager review" : "Admin review"}</span>
        </div>
        {error && <div className="error-message">{error}</div>}
        {loading ? <div className="content-card"><p>Loading approvals...</p></div> : items.length === 0 ? (
          <div className="content-card empty-state"><div className="approval-empty-icon">✓</div><h3>No active approval requests</h3><p>High-risk quotations will appear here after policy evaluation.</p></div>
        ) : (
          <div className="approval-list">
            {items.map(({ quotation, approval }) => {
              const actionable = approval.steps?.find(step => step.status === "PENDING");
              const canAct = actionable && (role === "ADMIN" || role === actionable.approver_role);
              const key = `${quotation.id}-${actionable?.id || ""}`;
              return (
                <section className="content-card approval-card" key={approval.approval_request.id}>
                  <div className="approval-card-head">
                    <div><div className="eyebrow">QUOTATION</div><h2>{quotation.quotation_number}</h2><p>Deal #{quotation.id} · {quotation.currency || "USD"} · {quotation.status.replaceAll("_", " ")}</p></div>
                    <span className={`status-pill status-${stepTone(approval.approval_request.status)}`}>{approval.approval_request.status.replaceAll("_", " ")}</span>
                  </div>
                  <div className="approval-timeline">
                    {approval.steps.map((step, index) => (
                      <div className={`approval-step ${stepTone(step.status)}`} key={step.id}>
                        <div className="approval-step-number">{index + 1}</div>
                        <div className="approval-step-copy"><strong>{step.approver_role.replaceAll("_", " ")}</strong><span>{step.status.replaceAll("_", " ")}</span></div>
                        {step.status === "PENDING" && canAct && <div className="approval-actions"><button className="primary-small-button" disabled={busy === key} onClick={() => decide(quotation.id, step.id, "APPROVE")}>{busy === key ? "Saving..." : "Approve"}</button><button className="approval-reject-button" disabled={busy === key} onClick={() => decide(quotation.id, step.id, "REJECT")}>Reject</button><button className="secondary-button" disabled={busy === key} onClick={() => decide(quotation.id, step.id, "RETURN")}>Return</button></div>}
                        {step.status === "PENDING" && !canAct && <span className="approval-waiting">Awaiting {step.approver_role.replaceAll("_", " ")}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="approval-card-footer"><span>Sequential governance: Manager → Finance</span><Link className="table-link" to={`/sales/quotations/${quotation.id}`}>Open quotation →</Link></div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
