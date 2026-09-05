import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCustomerQuotation, submitNegotiation } from "../api/quotations";

function StatusPill({ status }) {
  return <span className="status-pill">{String(status || "—").replaceAll("_", " ")}</span>;
}

export default function CustomerQuotationDetail() {
  const { quotationId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lineId, setLineId] = useState("");
  const [discount, setDiscount] = useState("");
  const [comment, setComment] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      setData(await getCustomerQuotation(quotationId));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [quotationId]);

  async function negotiate(event) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setMessage("");
      const result = await submitNegotiation(quotationId, {
        quotation_line_id: lineId ? Number(lineId) : null,
        requested_discount: discount === "" ? null : Number(discount),
        comment,
      });
      setMessage(`Request submitted. Risk: ${result.risk?.risk_level || "LOW"}.`);
      setComment(""); setDiscount(""); setLineId("");
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="loading-screen"><p>Loading quotation...</p></div>;
  if (!data) return <main className="dashboard-container"><div className="error-message">{error || "Quotation not found."}</div></main>;

  const quote = data.quotation;
  const lines = data.lines || [];
  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0) * (1 - Number(line.discount_percent || 0) / 100), 0);
  const locked = ["INVOICED", "PAID", "FULFILLED", "PARTIALLY_FULFILLED"].includes(String(quote.status).toUpperCase());

  return (
    <div className="app-shell quotation-detail-page">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Customer / Quotation</span></div>
        <Link to="/customer/quotations" className="secondary-button">← My Quotations</Link>
      </header>
      <main className="dashboard-container">
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <section className="quote-hero">
          <div>
            <div className="eyebrow">CUSTOMER QUOTATION</div>
            <div className="quote-title-row"><h1>{quote.quotation_number}</h1><StatusPill status={quote.status} /></div>
            <p>{quote.currency || "USD"} · Customer account</p>
          </div>
        </section>

        <section className="content-card detail-section">
          <div className="section-header"><div><div className="eyebrow">COMMERCIAL TERMS</div><h2>Quotation items</h2></div></div>
          <div className="table-wrapper">
            <table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Line total</th></tr></thead>
              <tbody>{lines.map(line => {
                const total = Number(line.quantity || 0) * Number(line.unit_price || 0) * (1 - Number(line.discount_percent || 0) / 100);
                return <tr key={line.id}><td><strong>Product #{line.product_id}</strong></td><td>{line.quantity}</td><td>{quote.currency || "USD"} {Number(line.unit_price || 0).toFixed(2)}</td><td>{line.discount_percent}%</td><td><strong>{quote.currency || "USD"} {total.toFixed(2)}</strong></td></tr>;
              })}</tbody>
            </table>
          </div>
          <div className="quote-total-row"><span>Net quotation value</span><strong>{quote.currency || "USD"} {subtotal.toFixed(2)}</strong></div>
        </section>

        <section className="content-card detail-section">
          <div className="section-header"><div><div className="eyebrow">NEGOTIATION</div><h2>Request a commercial change</h2><p>Submit a counter-proposal for the sales team to review.</p></div></div>
          {locked ? (
            <div className="risk-empty-panel"><div className="risk-empty-icon">✓</div><div><strong>Negotiation is closed</strong><p>This quotation has already progressed to {String(quote.status).replaceAll("_", " ")}.</p></div></div>
          ) : (
            <form className="negotiation-form" onSubmit={negotiate}>
              <label>Quotation line<select value={lineId} onChange={e => setLineId(e.target.value)}><option value="">General request</option>{lines.map(line => <option key={line.id} value={line.id}>Product #{line.product_id} · current {line.discount_percent}%</option>)}</select></label>
              <label>Requested discount (%)<input type="number" min="0" max="100" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="e.g. 20" /></label>
              <label>Comment<textarea required value={comment} onChange={e => setComment(e.target.value)} placeholder="Explain the requested change..." rows="4" /></label>
              <button className="primary-small-button" disabled={saving}>{saving ? "Submitting..." : "Submit negotiation request"}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
