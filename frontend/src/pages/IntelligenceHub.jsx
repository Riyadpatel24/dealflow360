import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getAuditTrail, getCustomer360, getDealAI, getDealHealthV2, getNextBestActions, getNotifications, getPipeline, getReceivables, getRevenueAnalytics, getWarehouse, globalSearch, markAllNotificationsRead, markNotificationRead } from "../api/intelligence";
import "../styles/intelligence.css";

const money = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));

export default function IntelligenceHub() {
  const { token, user } = useAuth();
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiQuote, setAiQuote] = useState("");

  async function load() {
    setError("");
    try {
      const calls = [getNotifications(token), getRevenueAnalytics(token), getDealHealthV2(token), getWarehouse(token), getNextBestActions(token), getPipeline(token)];
      if (["ADMIN", "SALES_MANAGER", "FINANCE"].includes(user?.role)) calls.push(getReceivables(token), getAuditTrail(token));
      const values = await Promise.all(calls);
      setData({ notifications: values[0], revenue: values[1], health: values[2], warehouse: values[3], actions: values[4], pipeline: values[5], receivables: values[6], audit: values[7] });
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (token) load(); }, [token]);

  async function search() {
    if (q.trim().length < 2) return;
    try { setResults(await globalSearch(q.trim(), token)); } catch (e) { setError(e.message); }
  }
  async function openCustomer(id) { try { setCustomer(await getCustomer360(id, token)); } catch (e) { setError(e.message); } }
  async function openAI() { if (!aiQuote) return; try { setAi(await getDealAI(aiQuote, token)); } catch (e) { setError(e.message); } }
  async function read(id) { await markNotificationRead(id, token); load(); }
  async function readAll() { await markAllNotificationsRead(token); load(); }

  const r = data.revenue?.metrics || {};
  const h = data.health?.summary || {};
  const n = data.notifications || { unread: 0, items: [] };
  const rec = data.receivables?.summary || {};

  return <main className="intel-page">
    <header className="intel-header"><div><span className="intel-kicker">DEALFLOW360 / INTELLIGENCE</span><h1>Revenue command center.</h1><p>Signals, actions and financial truth in one operating view.</p></div><div className="intel-user">{user?.name}<small>{user?.role}</small></div></header>
    {error && <div className="intel-error">{error}</div>}

    <section className="intel-search"><div><span>GLOBAL SEARCH</span><strong>Find anything across the workspace</strong></div><div className="intel-search-box"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Quote, customer, product…"/><button onClick={search}>Search</button></div></section>
    {results && <section className="intel-results"><div><b>Customers</b>{results.customers?.length ? results.customers.map(x => <button key={x.id} onClick={() => openCustomer(x.id)}>{x.name}<small>{x.email} · {x.tier}</small></button>) : <span>None</span>}</div><div><b>Quotations</b>{results.quotations?.length ? results.quotations.map(x => <div key={x.id}><strong>{x.quotation_number}</strong><small>{x.status} · {money(x.total)}</small></div>) : <span>None</span>}</div><div><b>Products</b>{results.products?.length ? results.products.map(x => <div key={x.id}><strong>{x.name}</strong><small>{x.category} · {money(x.unit_price)}</small></div>) : <span>None</span>}</div></section>}

    <section className="intel-metrics"><Metric label="Pipeline" value={money(r.pipeline_value)}/><Metric label="Won value" value={money(r.won_value)}/><Metric label="Collected" value={money(r.collected_value)}/><Metric label="Outstanding" value={money(r.outstanding_value)}/><Metric label="Win rate" value={`${r.win_rate || 0}%`}/><Metric label="Deals at risk" value={h.at_risk || 0}/></section>

    <div className="intel-grid">
      <Panel title="Revenue pipeline" eyebrow="14 · PIPELINE"><div className="pipeline">{(data.pipeline?.stages || []).map(x => <div className="pipeline-row" key={x.stage}><span>{x.stage.replaceAll("_", " ")}</span><i style={{ width: `${Math.min(100, x.value / Math.max(1, r.pipeline_value) * 100)}%` }}/><strong>{money(x.value)}</strong><small>{x.count}</small></div>)}</div></Panel>
      <Panel title="Deal Health 2.0" eyebrow="10 · RISK + MOMENTUM"><div className="health-summary"><b>{h.healthy || 0}<small>healthy</small></b><b>{h.watch || 0}<small>watch</small></b><b>{h.at_risk || 0}<small>at risk</small></b></div><div className="intel-list">{(data.health?.deals || []).filter(x => x.band !== "HEALTHY").slice(0, 6).map(x => <div key={x.id}><strong>{x.number}</strong><span>{x.score}/100 · {x.alerts.join(" · ")}</span></div>)}</div></Panel>
      <Panel title="Next best actions" eyebrow="13 · ACTION ENGINE"><div className="intel-list">{(data.actions?.items || []).slice(0, 8).map((x, i) => <div key={i}><em className={x.priority.toLowerCase()}>{x.priority}</em><strong>{x.title}</strong><span>{x.action}</span></div>)}</div></Panel>
      <Panel title="Smart warehouse" eyebrow="12 · SUPPLY SIGNALS"><div className="intel-list">{(data.warehouse?.items || []).slice(0, 8).map(x => <div key={`${x.product_id}-${x.available}`}><em className={x.signal.toLowerCase()}>{x.signal}</em><strong>{x.product}</strong><span>{x.available} available · {x.open_demand} demand · {x.backordered} backordered</span></div>)}</div></Panel>
      <Panel title="Receivables analytics" eyebrow="15 · CASH CONVERSION"><div className="receivable-head"><b>{money(rec.outstanding)}</b><span>outstanding</span><b>{money(rec.overdue)}</b><span>overdue</span></div><div className="bucket-grid">{(data.receivables?.buckets || []).map(x => <div key={x.bucket}><span>{x.bucket}</span><strong>{money(x.value)}</strong></div>)}</div></Panel>
      <Panel title="DealFlow AI" eyebrow="11 · EXPLAINABLE AI"><div className="ai-box"><div><input value={aiQuote} onChange={e => setAiQuote(e.target.value)} placeholder="Quotation ID"/><button onClick={openAI}>Analyze deal</button></div>{ai && <><strong>{ai.deal.number} · {money(ai.deal.value)}</strong><p>{ai.recommendation}</p><small>{ai.explainability.join(" · ")}</small></>}</div></Panel>
      {data.audit && <Panel title="Audit trail" eyebrow="6 · GOVERNANCE"><div className="intel-list audit">{(data.audit.items || []).slice(0, 8).map(x => <div key={x.id}><strong>{x.action}</strong><span>{x.entity} #{x.entity_id}</span><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</div></Panel>}
      <Panel title={`Notifications · ${n.unread} unread`} eyebrow="5 · WORKFLOW"><div className="panel-action"><button onClick={readAll}>Mark all read</button></div><div className="intel-list">{n.items.slice(0, 8).map(x => <button className={`notice ${x.is_read ? "read" : ""}`} key={x.id} onClick={() => !x.is_read && read(x.id)}><strong>{x.title}</strong><span>{x.message}</span></button>)}</div></Panel>
    </div>

    {customer && <div className="modal-backdrop" onClick={() => setCustomer(null)}><section className="customer360" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setCustomer(null)}>×</button><span>CUSTOMER 360</span><h2>{customer.customer.name}</h2><p>{customer.customer.email} · {customer.customer.tier}</p><div className="customer-metrics"><Metric label="Quoted" value={money(customer.metrics.quoted_value)}/><Metric label="Invoiced" value={money(customer.metrics.invoiced)}/><Metric label="Paid" value={money(customer.metrics.paid)}/><Metric label="Open BO" value={customer.metrics.open_backorders}/></div><h3>Recent quotations</h3>{customer.quotes.slice(0, 8).map(x => <div className="customer-row" key={x.id}><strong>{x.number}</strong><span>{x.status}</span><b>{money(x.value)}</b></div>)}</section></div>}
  </main>;
}

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, eyebrow, children }) { return <section className="intel-panel"><div className="panel-heading"><span>{eyebrow}</span><h2>{title}</h2></div>{children}</section>; }
