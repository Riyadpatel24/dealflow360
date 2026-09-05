import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createInvoices, getInvoices, recordPayment } from "../api/operations";

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [quotationId, setQuotationId] = useState("1");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payment, setPayment] = useState({});

  async function load() {
    try {
      setLoading(true);
      setError("");
      setInvoices(await getInvoices());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    try {
      setWorking(true); setError(""); setSuccess("");
      const result = await createInvoices(quotationId);
      setSuccess(`${Array.isArray(result) ? result.length : 1} invoice(s) generated for quotation Q-${quotationId}.`);
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
            <div><h2>Generate invoice</h2><p>Use an approved/fulfilled quotation to create its billing documents.</p></div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
              <span className="field-label">Quotation ID</span>
              <input value={quotationId} onChange={(e) => setQuotationId(e.target.value)} type="number" min="1" />
            </label>
            <button className="primary-small-button" onClick={generate} disabled={working || !quotationId}>
              {working ? "Working..." : "Generate Invoice"}
            </button>
          </div>
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
