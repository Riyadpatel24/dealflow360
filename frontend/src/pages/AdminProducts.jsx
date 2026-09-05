import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createProduct, getProducts } from "../api/admin";
import "../styles/product-catalog.css";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", category: "Hardware", unit_price: "", is_subscription: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    try {
      setError("");
      setProducts(await getProducts());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createProduct({
        name: form.name,
        category: form.category,
        unit_price: Number(form.unit_price),
        is_subscription: form.is_subscription,
      });
      setForm({ name: "", category: "Hardware", unit_price: "", is_subscription: false });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const subscriptionCount = products.filter((product) => product.is_subscription).length;
  const hardwareCount = products.filter((product) => product.category === "Hardware").length;
  const serviceCount = products.filter((product) => product.category === "Services").length;

  return (
    <div className="app-shell product-catalog-page">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Admin / Products</span></div>
        <Link to="/admin" className="secondary-button">← Admin Dashboard</Link>
      </header>

      <main className="dashboard-container">
        <div className="page-heading product-heading">
          <div>
            <div className="eyebrow">PRODUCT CATALOG</div>
            <h1>Products</h1>
            <p>Manage products, services and subscription items used across DealFlow360.</p>
          </div>
          <span className="status-pill">Live catalog</span>
        </div>

        <section className="product-stats">
          <div className="product-stat"><span>Total products</span><strong>{products.length}</strong><small>Active catalog records</small></div>
          <div className="product-stat"><span>Hardware</span><strong>{hardwareCount}</strong><small>Physical products</small></div>
          <div className="product-stat"><span>Services</span><strong>{serviceCount}</strong><small>Professional services</small></div>
          <div className="product-stat"><span>Subscriptions</span><strong>{subscriptionCount}</strong><small>Recurring products</small></div>
        </section>

        <section className="content-card product-form-card">
          <div className="product-section-title">
            <div>
              <h2>Add Product</h2>
              <p className="muted">Create a catalog item that can be selected while building a quotation.</p>
            </div>
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <div className="product-field">
              <label htmlFor="product-name">Product name</label>
              <input id="product-name" name="name" value={form.name} onChange={updateForm} placeholder="e.g. Laptop Pro 16" required />
            </div>

            <div className="product-field">
              <label htmlFor="product-category">Category</label>
              <select id="product-category" name="category" value={form.category} onChange={updateForm}>
                <option>Hardware</option>
                <option>Services</option>
              </select>
            </div>

            <div className="product-field">
              <label htmlFor="product-price">Unit price</label>
              <div className="price-input-wrap">
                <span>$</span>
                <input id="product-price" name="unit_price" type="number" min="0" step="0.01" value={form.unit_price} onChange={updateForm} placeholder="0.00" required />
              </div>
            </div>

            <label className={`subscription-option ${form.is_subscription ? "selected" : ""}`}>
              <input name="is_subscription" type="checkbox" checked={form.is_subscription} onChange={updateForm} />
              <span>
                <strong>Subscription product</strong>
                <small>Enable recurring billing for this catalog item</small>
              </span>
            </label>

            <button className="primary-small-button product-submit" disabled={saving}>
              {saving ? "Creating..." : "Add Product"}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
        </section>

        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>Product Catalog</h2>
              <p className="muted">Select a product to inspect its pricing and subscription configuration.</p>
            </div>
            <span className="catalog-count">{products.length} items</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Cost</th><th>Type</th><th>Action</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><div className="table-subtext">#{product.id}</div></td>
                    <td>{product.category}</td>
                    <td>${Number(product.unit_price).toFixed(2)}</td>
                    <td>{product.cost_price == null ? "—" : `$${Number(product.cost_price).toFixed(2)}`}</td>
                    <td><span className="status-pill">{product.is_subscription ? "SUBSCRIPTION" : "ONE-TIME"}</span></td>
                    <td><Link className="text-link" to={`/admin/products/${product.id}`}>Open detail →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
