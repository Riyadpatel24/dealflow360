import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDealHealth } from "../api/dashboard";

function statusClass(value) {
  return `badge ${String(value || "").toLowerCase().replaceAll("_", "-")}`;
}

export default function DealHealth() {
  const [data, setData] = useState({ summary: {}, deals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDealHealth()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = data.summary || {};

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">Sales / Deal Health</span>
        </div>
        <Link to="/sales" className="secondary-button">← Sales Dashboard</Link>
      </header>

      <main className="dashboard-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">INTELLIGENCE CENTER</span>
            <h1>Deal Health</h1>
            <p>Explainable signals across risk, approvals, fulfillment and revenue.</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="workflow-grid deal-health-summary">
          <div className="content-card"><span>DEALS</span><strong>{summary.total ?? 0}</strong><p>Total active deal records</p></div>
          <div className="content-card"><span>HEALTHY</span><strong>{summary.healthy ?? 0}</strong><p>Moving without a blocker</p></div>
          <div className="content-card"><span>WATCH</span><strong>{summary.watch ?? 0}</strong><p>Operational attention needed</p></div>
          <div className="content-card"><span>AT RISK</span><strong>{summary.at_risk ?? 0}</strong><p>Risk or approval concern</p></div>
        </section>

        <section className="content-card">
          <div className="feature-header">
            <div>
              <span className="eyebrow">LIVE DEAL SIGNALS</span>
              <h2>Deal Health Monitor</h2>
              <p>Signals are calculated from the current PostgreSQL deal state — no placeholder scores.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading live deal health...</p></div>
          ) : data.deals.length === 0 ? (
            <div className="empty-state"><h3>No deals found</h3><p>Create a quotation to begin monitoring.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Health</th>
                    <th>Risk</th>
                    <th>Workflow</th>
                    <th>Fulfillment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deals.map((deal) => (
                    <tr key={deal.quotation_id}>
                      <td>
                        <strong>{deal.quotation_number}</strong>
                        <div className="table-muted">Customer #{deal.customer_id}</div>
                      </td>
                      <td><span className={statusClass(deal.health)}>{deal.health}</span></td>
                      <td>
                        <span className={statusClass(deal.risk_level || "LOW")}>{deal.risk_level || "LOW"}</span>
                        {deal.worst_deviation > 0 && <div className="table-muted">{deal.worst_deviation} pts deviation</div>}
                      </td>
                      <td>{deal.status}</td>
                      <td>{deal.open_backorders ? `${deal.open_backorders} open backorder(s)` : "No open backorders"}</td>
                      <td><Link className="table-link" to={`/sales/quotations/${deal.quotation_id}`}>Open deal →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!loading && data.deals.length > 0 && (
          <section className="content-card">
            <span className="eyebrow">WHY IT MATTERS</span>
            <h2>Explainable alerts</h2>
            <div className="workflow-grid">
              {data.deals.slice(0, 4).map((deal) => (
                <div key={`reason-${deal.quotation_id}`}>
                  <strong>{deal.quotation_number} · {deal.health}</strong>
                  <p>{deal.reasons?.length ? deal.reasons.join(" • ") : "No current health blocker detected."}</p>
                  <p><strong>Next:</strong> {deal.recommended_action}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
