import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/admin";

export default function ProductDashboard() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  const stats = useMemo(() => ({
    total: products.length,
    hardware: products.filter((p) => p.category === "Hardware").length,
    services: products.filter((p) => p.category === "Services").length,
    subscriptions: products.filter((p) => p.is_subscription).length,
  }), [products]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Product Workspace</span></div>
        <Link to="/sales" className="secondary-button">← Dashboard</Link>
      </header>

      <main className="dashboard-container">
        <div className="page-heading">
          <div>
            <div className="eyebrow">PRODUCT CATALOG</div>
            <h1>Products</h1>
            <p>Manage catalog items, pricing and subscription products.</p>
          </div>
          <Link to="/admin/products" className="secondary-button">Manage Catalog</Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="stat-grid">
          <div className="stat-card"><span>Total Products</span><strong>{stats.total}</strong><small>Active catalog items</small></div>
          <div className="stat-card"><span>Hardware</span><strong>{stats.hardware}</strong><small>Physical products</small></div>
          <div className="stat-card"><span>Services</span><strong>{stats.services}</strong><small>Service offerings</small></div>
          <div className="stat-card"><span>Subscriptions</span><strong>{stats.subscriptions}</strong><small>Recurring products</small></div>
        </section>

        <section className="content-card">
          <div className="section-header">
            <div><div className="eyebrow">CATALOG</div><h2>Product Catalog</h2></div>
            <span className="status-pill">{products.length} items</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Type</th><th>Action</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td>{product.category}</td>
                    <td>${Number(product.unit_price).toFixed(2)}</td>
                    <td>{product.is_subscription ? "Subscription" : "One-time"}</td>
                    <td><Link to={`/products/${product.id}`}>Open →</Link></td>
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
