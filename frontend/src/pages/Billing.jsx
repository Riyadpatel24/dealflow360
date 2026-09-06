import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createInvoices, getInvoices, getQuotations, recordPayment } from "../api/operations";

const INVOICE_READY = new Set(["FULFILLED", "PARTIALLY_FULFILLED", "READY_TO_SHIP"]);

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [quotationId, setQuotationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payment, setPayment] = useState({});

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [invoiceRows, quotationRows] = await Promise.all([getInvoices(), getQuotations()]);
      setInvoices(invoiceRows);
      setQuotations(quotationRows);
      const ready = quotationRows.filter((q) => INVOICE_READY.has(q.status));
      setQuotationId((current) => current || String(ready[0]?.id || ""));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const invoiceReady = quotations.filter((q) => INVOICE_READY.has(q.status));

  async function generate() {
    try {
      setWorking(true); setError(""); setSuccess("");
      const result = await createInvoices(quotationId);
      setSuccess(`${Array.isArray(result) ? result.length : 1} invoice(s) generated for Q-${quotationId}.`);
      await load();
    } catch (err) { setError(err.message); }
    finally { setWorking(false); }
  }

  async function pay(invoice) {
    const amount = payment[invoice.id] ?? invoice.amount;
    const reference = payment[`${invoice.id}-ref`] || `DEMO-${invoice.invoice_number}`;
    try {
      setWorking(true); setError(""); setSuccess("");
      await recordPayment(invoice.id, { amount: Number(amount), reference });
      setSuccess(`${invoice.invoice_number} payment recorded.`);
      setPayment((current) => ({ ...current, [invoice.id]: "", [`${invoice.id}-ref`]: "" }));
      await load();
    } catch (err) { setError(err.message); }
    finally { setWorking(false); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Finance Operations / Billing</span></div>
        <Link to="/sales" className="secondary-button">← Finance Operations</Link>
      </header>

      <main className="dashboard-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">REVENUE CONTROL</span>
            <h1>Billing & Payments</h1>
            <p>Turn fulfilled deals into invoices and record settlement against the receivable.</p>
          </div>
          <span className="badge">Finance</span>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <section className="content-card" style={{ marginBottom: 18 }}>
          <div className="section-header">
            <div><h2>Generate invoice</h2><p>Only approved/fulfilled workflow states can be invoiced.</p></div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 260 }}>
              <span className="field-label">Invoice-ready quotation</span>
              <select value={quotationId} onChange={(e) => setQuotationId(e.target.value)} disabled={loading || working || invoiceReady.length === 0}>
                {invoiceReady.length === 0 ? <option value="">No quotation is ready for invoicing</option> : invoiceReady.map((quote) => (
                  <option key={quote.id} value={quote.id}>Q-{quote.id} · {quote.quotation_number} · {quote.status}</option>
                ))}
              </select>
            </label>
            <button className="primary-small-button" onClick={generate} disabled={working || !quotationId || invoiceReady.length === 0}>
              {working ? "Working..." : "Generate Invoice"}
            </button>
          </div>
          {invoiceReady.length === 0 && !loading && (
            <p style={{ marginTop: 12, color: "#8b2e24" }}>No quotations are currently FULFILLED, PARTIALLY_FULFILLED, or READY_TO_SHIP. Complete fulfillment/shipping first.</p>
          )}
          {invoiceReady.length > 0 && (
            <p style={{ marginTop: 12, color: "#52606d" }}>{invoiceReady.length} quotation(s) ready. Drafts and quotes still under approval are intentionally excluded.</p>
          )}
        </section>

        <section className="content-card">
          <div className="section-header">
            <div><h2>Invoices</h2><p>Issued invoices and their payment status.</p></div>
            <span className="badge">{invoices.length} total</span>
          </div>
          {loading ? <p>Loading invoices...</p> : invoices.length === 0 ? (
            <div className="empty-state"><strong>No invoices yet</strong><span>Generate one above after fulfillment.</span></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Invoice</th><th>Quotation</th><th>Type</th><th>Amount</th><th>Status</th><th>Due</th><th>Payment</th></tr></thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td><strong>{invoice.invoice_number}</strong></td>
                      <td>Q-{invoice.quotation_id}</td>
                      <td>{invoice.invoice_type}</td>
                      <td>{invoice.currency} {Number(invoice.amount).toFixed(2)}</td>
                      <td><span className="badge">{invoice.status}</span></td>
                      <td>{invoice.due_date || "—"}</td>
                      <td>
                        {invoice.status === "PAID" ? <span className="success-text">Paid</span> : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <input style={{ width: 110 }} type="number" min="0.01" step="0.01" placeholder={String(invoice.amount)} value={payment[invoice.id] ?? ""} onChange={(e) => setPayment((p) => ({ ...p, [invoice.id]: e.target.value }))} />
                            <input style={{ width: 130 }} placeholder="Reference" value={payment[`${invoice.id}-ref`] ?? ""} onChange={(e) => setPayment((p) => ({ ...p, [`${invoice.id}-ref`]: e.target.value }))} />
                            <button className="primary-small-button" onClick={() => pay(invoice)} disabled={working}>Record payment</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
