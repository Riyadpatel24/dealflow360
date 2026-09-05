import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProducts } from "../api/admin";

export default function ProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then((items) => setProduct(items.find((item) => String(item.id) === String(productId))))
      .catch((err) => setError(err.message));
  }, [productId]);

  if (error) return <div className="app-shell"><div className="error-message">{error}</div></div>;
  if (!product) return <div className="app-shell"><main className="dashboard-container"><p>Loading product...</p></main></div>;

  const margin = product.cost_price == null ? null : Number(product.unit_price) - Number(product.cost_price);
  const marginPercent = margin == null || Number(product.unit_price) === 0 ? null : (margin / Number(product.unit_price)) * 100;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>DealFlow360</strong><span className="topbar-subtitle">Admin / Products / Detail</span></div>
        <Link to="/admin/products" className="secondary-button">← Products</Link>
      </header>
      <main className="dashboard-container">
        <div className="page-heading">
          <div><div className="eyebrow">PRODUCT DETAIL</div><h1>{product.name}</h1><p>Catalog configuration and commercial pricing.</p></div>
          <span className="status-pill">{product.is_subscription ? "SUBSCRIPTION" : "ONE-TIME"}</span>
        </div>
        <section className="stat-grid">
          <div className="stat-card"><span>Sell price</span><strong>${Number(product.unit_price).toFixed(2)}</strong><small>Current unit price</small></div>
          <div className="stat-card"><span>Cost price</span><strong>{product.cost_price == null ? "—" : `$${Number(product.cost_price).toFixed(2)}`}</strong><small>Internal cost basis</small></div>
          <div className="stat-card"><span>Gross margin</span><strong>{marginPercent == null ? "—" : `${marginPercent.toFixed(1)}%`}</strong><small>Based on catalog price and cost</small></div>
          <div className="stat-card"><span>Category</span><strong>{product.category}</strong><small>Catalog classification</small></div>
        </section>
        <section className="content-card">
          <h2>Product & pricelist</h2>
          <div className="detail-grid">
            <div><span>Product name</span><strong>{product.name}</strong></div>
            <div><span>Category</span><strong>{product.category}</strong></div>
            <div><span>Unit price</span><strong>${Number(product.unit_price).toFixed(2)} USD</strong></div>
            <div><span>Subscription</span><strong>{product.is_subscription ? "Yes" : "No"}</strong></div>
            <div><span>Subscription plan</span><strong>{product.subscription_plan_id ? `Plan #${product.subscription_plan_id}` : "Not linked"}</strong></div>
            <div><span>Product ID</span><strong>#{product.id}</strong></div>
          </div>
        </section>
        <section className="content-card">
          <h2>Commercial readiness</h2>
          <p className="muted">This product is available to the quotation workflow and uses the catalog price shown above. Discount eligibility is evaluated against the configured policy when a quotation is assessed.</p>
        </section>
      </main>
    </div>
  );
}
