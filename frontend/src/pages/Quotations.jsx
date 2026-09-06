import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createQuotation, addQuotationLine, getQuotations } from "../api/quotations";

const API_BASE_URL = "http://127.0.0.1:8000";
async function getFormOptions() {
  const token = sessionStorage.getItem("dealflow360_token");
  const response = await fetch(`${API_BASE_URL}/quotation-form/options`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Unable to load quotation options");
  return data;
}

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ quotation_number: "", customer_id: "", currency: "USD" });
  const [lines, setLines] = useState([{ product_id: "", quantity: 1, unit_price: "", discount_percent: 0 }]);

  async function loadQuotations() {
    try { setLoading(true); setError(""); setQuotations(await getQuotations()); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadQuotations(); }, []);

  async function openCreate() {
    setShowCreate(true); setError(""); setLoadingOptions(true);
    try {
      const data = await getFormOptions();
      setCustomers(data.customers || []); setProducts(data.products || []);
      const firstProduct = data.products?.[0];
      setForm((current) => ({ ...current, quotation_number: current.quotation_number || `Q-${Date.now().toString().slice(-6)}`, customer_id: current.customer_id || String(data.customers?.[0]?.id || "") }));
      setLines([{ product_id: String(firstProduct?.id || ""), quantity: 1, unit_price: firstProduct?.unit_price ?? "", discount_percent: 0 }]);
    } catch (err) { setError(err.message); } finally { setLoadingOptions(false); }
  }
  function updateLine(index, field, value) {
    setLines((current) => current.map((line, i) => {
      if (i !== index) return line;
      if (field === "product_id") { const p = products.find((item) => String(item.id) === String(value)); return { ...line, product_id: value, unit_price: p?.unit_price ?? "" }; }
      return { ...line, [field]: value };
    }));
  }
  function addLine() { const p = products[0]; setLines((c) => [...c, { product_id: String(p?.id || ""), quantity: 1, unit_price: p?.unit_price ?? "", discount_percent: 0 }]); }
  function removeLine(index) { setLines((c) => c.filter((_, i) => i !== index)); }
  const total = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) * (1 - (Number(l.discount_percent) || 0) / 100), 0), [lines]);

  async function handleCreate(event) {
    event.preventDefault(); setError("");
    if (!form.customer_id) return setError("Select a customer.");
    if (!lines.length || lines.some((l) => !l.product_id || Number(l.quantity) <= 0 || Number(l.unit_price) <= 0)) return setError("Add at least one valid product line.");
    try {
      setSaving(true);
      const quotation = await createQuotation({ quotation_number: form.quotation_number, customer_id: Number(form.customer_id), currency: form.currency });
      for (const line of lines) await addQuotationLine(quotation.id, { product_id: Number(line.product_id), quantity: Number(line.quantity), unit_price: Number(line.unit_price), discount_percent: Number(line.discount_percent) || 0 });
      navigate(`/sales/quotations/${quotation.id}`);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><div><strong>DealFlow360</strong><span className="topbar-subtitle">Sales / Quotations</span></div><Link to="/sales" className="secondary-button">← Sales Dashboard</Link></header>
    <main className="dashboard-container">
      <div className="page-heading"><div><div className="eyebrow">DEAL PIPELINE</div><h1>Quotations</h1><p>Create, price and evaluate customer deals.</p></div><button className="primary-small-button" onClick={openCreate}>+ Create Quotation</button></div>
      {error && <div className="error-message">{error}</div>}
      {showCreate && <section className="content-card" style={{ marginBottom: 20 }}>
        <div className="section-header"><div><div className="eyebrow">NEW DEAL</div><h2>Create Quotation</h2></div><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button></div>
        {loadingOptions ? <p>Loading customers and products...</p> : <form onSubmit={handleCreate}>
          <div className="admin-form">
            <input value={form.quotation_number} onChange={(e) => setForm({ ...form, quotation_number: e.target.value })} placeholder="Quotation number" required />
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.tier}</option>)}</select>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>USD</option><option>EUR</option><option>INR</option></select>
          </div>
          <div className="section-header" style={{ marginTop: 22 }}><h3>Quotation Items</h3><button type="button" className="secondary-button" onClick={addLine}>+ Add line</button></div>
          <div className="table-wrapper"><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Discount %</th><th>Line total</th><th /></tr></thead><tbody>
            {lines.map((line, index) => { const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * (1 - (Number(line.discount_percent) || 0) / 100); return <tr key={index}>
              <td><select value={line.product_id} onChange={(e) => updateLine(index, "product_id", e.target.value)} required><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — ${Number(p.unit_price).toFixed(2)}</option>)}</select></td>
              <td><input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} required /></td>
              <td><input type="number" min="0.01" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, "unit_price", e.target.value)} required /></td>
              <td><input type="number" min="0" max="100" step="0.01" value={line.discount_percent} onChange={(e) => updateLine(index, "discount_percent", e.target.value)} /></td>
              <td><strong>{form.currency} {lineTotal.toFixed(2)}</strong></td><td>{lines.length > 1 && <button type="button" className="table-link" onClick={() => removeLine(index)}>Remove</button>}</td>
            </tr>; })}
          </tbody></table></div>
          <div className="quote-total-row"><span>Net quotation value</span><strong>{form.currency} {total.toFixed(2)}</strong></div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="primary-small-button" disabled={saving}>{saving ? "Creating..." : "Create Quotation →"}</button></div>
        </form>}
      </section>}
      <section className="content-card quotations-table-card">{loading ? <p>Loading quotations...</p> : quotations.length === 0 ? <div className="empty-state"><h3>No quotations found</h3><p>Create a quotation to start the deal workflow.</p></div> : <div className="table-wrapper"><table><thead><tr><th>Quotation</th><th>Customer</th><th>Status</th><th>Currency</th><th>Created</th><th>Actions</th></tr></thead><tbody>{quotations.map((q) => <tr key={q.id}><td><strong>{q.quotation_number}</strong></td><td>{q.customer?.name || q.customer_name || "—"}</td><td><span className="badge">{q.status}</span></td><td>{q.currency}</td><td>{q.created_at ? new Date(q.created_at).toLocaleDateString() : "—"}</td><td><Link className="table-link" to={`/sales/quotations/${q.id}`}>View →</Link></td></tr>)}</tbody></table></div>}</section>
    </main>
  </div>;
}
