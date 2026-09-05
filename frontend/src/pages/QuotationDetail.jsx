import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { evaluateQuotationRisk, getQuotation } from "../api/quotations";

function StatusPill({ status }) {
  const value = String(status || "").toLowerCase().replaceAll("_", "-");
  return <span className={`status-pill status-${value}`}>{String(status || "—").replaceAll("_", " ")}</span>;
}

export default function QuotationDetail() {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [lines, setLines] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");

  async function loadQuotation() {
    try {
      setLoading(true);
      setError("");
      const data = await getQuotation(quotationId);
      setQuotation(data.quotation);
      setLines(data.lines || []);
      setRisk(data.risk || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runRiskEvaluation() {
    try {
      setEvaluating(true);
      setError("");
      const result = await evaluateQuotationRisk(quotationId);
      setRisk(result.risk);
      await loadQuotation();
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  }

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  if (loading) return <div className="loading-screen"><p>Loading quotation...</p></div>;

  if (!quotation) {
    return <div className="dashboard-container"><div className="error-message">{error || "Quotation not found."}</div></div>;
  }

  const subtotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);
    const discount = Number(line.discount_percent || 0);
    return sum + quantity * price * (1 - discount / 100);
  }, 0);

  const riskLevel = String(risk?.risk_level || "").toLowerCase();
  const isBlocked = ["under_approval", "rejected"].includes(String(quotation.status).toLowerCase());

  return (
    <div className="app-shell quotation-detail-page">
      <header className="topbar">
        <div className="brand-lockup">
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">Sales / Quotation</span>
        </div>
        <Link to="/sales/quotations" className="secondary-button">← Quotations</Link>
      </header>

      <main className="dashboard-container">
        {error && <div className="error-message">{error}</div>}

        <section className="quote-hero">
          <div>
            <div className="eyebrow">QUOTATION</div>
            <div className="quote-title-row">
              <h1>{quotation.quotation_number}</h1>
              <StatusPill status={quotation.status} />
            </div>
            <p>Customer ID: {quotation.customer_id} <span className="dot-separator">•</span> {quotation.currency || "USD"}</p>
          </div>
          <div className="quote-actions">
            <button className="primary-small-button" onClick={runRiskEvaluation} disabled={evaluating || isBlocked}>
              {evaluating ? "Evaluating..." : "Evaluate Risk"}
            </button>
            <button className="secondary-button" onClick={() => navigate(`/sales/fulfillment/${quotationId}`)}>Fulfillment →</button>
          </div>
        </section>

        <section className="detail-stat-grid">
          <div className="detail-stat-card">
            <span>DEAL VALUE</span>
            <strong>{quotation.currency || "USD"} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <small>{lines.length} line item{lines.length === 1 ? "" : "s"}</small>
          </div>
          <div className="detail-stat-card">
            <span>RISK LEVEL</span>
            <strong className={`stat-risk ${riskLevel || "neutral"}`}>{risk?.risk_level || "Not evaluated"}</strong>
            <small>{risk ? `${risk.worst_deviation || 0} pts worst deviation` : "Run policy evaluation"}</small>
          </div>
          <div className="detail-stat-card">
            <span>WORKFLOW</span>
            <strong>{quotation.status === "APPROVED" ? "Ready" : quotation.status === "UNDER_APPROVAL" ? "Approval required" : "In progress"}</strong>
            <small>Policy-controlled deal flow</small>
          </div>
        </section>

        <section className="content-card detail-section">
          <div className="section-header">
            <div>
              <div className="eyebrow">COMMERCIAL TERMS</div>
              <h2>Quotation items</h2>
            </div>
            <StatusPill status={quotation.status} />
          </div>

          {lines.length === 0 ? (
            <div className="empty-state"><p>This quotation has no line items.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Line total</th></tr></thead>
                <tbody>
                  {lines.map((line) => {
                    const total = Number(line.quantity || 0) * Number(line.unit_price || 0) * (1 - Number(line.discount_percent || 0) / 100);
                    return (
                      <tr key={line.id}>
                        <td><strong>Product #{line.product_id}</strong></td>
                        <td>{line.quantity}</td>
                        <td>{quotation.currency || "USD"} {Number(line.unit_price || 0).toFixed(2)}</td>
                        <td><span className="discount-value">{line.discount_percent}%</span></td>
                        <td><strong>{quotation.currency || "USD"} {total.toFixed(2)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="quote-total-row"><span>Net quotation value</span><strong>{quotation.currency || "USD"} {subtotal.toFixed(2)}</strong></div>
        </section>

        <section className="content-card detail-section">
          <div className="section-header">
            <div><div className="eyebrow">GOVERNANCE</div><h2>Risk evaluation</h2></div>
            {risk && <span className={`risk-badge ${riskLevel}`}>{risk.risk_level}</span>}
          </div>

          {!risk ? (
            <div className="risk-empty-panel">
              <div className="risk-empty-icon">!</div>
              <div><strong>No risk evaluation yet</strong><p>Run the policy engine to check discounts against customer and product rules.</p></div>
            </div>
          ) : (
            <>
              <div className="risk-summary detail-risk-summary">
                <div><span>Risk level</span><strong className={`stat-risk ${riskLevel}`}>{risk.risk_level}</strong></div>
                <div><span>Worst deviation</span><strong>{risk.worst_deviation} pts</strong></div>
                <div><span>Decision reason</span><strong>{risk.reason || "No policy exception detected."}</strong></div>
              </div>

              {risk.risk_lines?.length > 0 && (
                <div className="risk-findings">
                  <div className="eyebrow">POLICY FINDINGS</div>
                  {risk.risk_lines.map((riskLine) => (
                    <div className="risk-finding" key={riskLine.id}>
                      <div><strong>Line #{riskLine.quotation_line_id}</strong><span>{riskLine.reason}</span></div>
                      <div className="risk-finding-values"><span>{riskLine.requested_discount}% requested</span><span>{riskLine.allowed_discount}% allowed</span><strong>{riskLine.deviation} pts</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <div className="detail-footer-note">
          <span>DealFlow360 governance</span>
          <span>Discount policy → Risk → Approval → Fulfillment</span>
        </div>
      </main>
    </div>
  );
}
