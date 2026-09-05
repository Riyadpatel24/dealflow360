import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    createProduct,
    getProducts,
} from "../api/admin";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    name: "",
    category: "Hardware",
    unit_price: "",
    is_subscription: false,
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    try {
      setError("");

      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateForm(event) {
    const { name, value, type, checked } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
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

      setForm({
        name: "",
        category: "Hardware",
        unit_price: "",
        is_subscription: false,
      });

      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">

      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">
            Admin / Products
          </span>
        </div>

        <Link
          to="/admin"
          className="secondary-button"
        >
          ← Admin Dashboard
        </Link>
      </header>

      <main className="dashboard-container">

        <div className="page-heading">
          <div>
            <h1>Products</h1>
            <p>
              Manage products and services used in quotations.
            </p>
          </div>
        </div>

        <section className="content-card">

          <h2>Add Product</h2>

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              placeholder="Product name"
              required
            />

            <select
              name="category"
              value={form.category}
              onChange={updateForm}
            >
              <option>Hardware</option>
              <option>Services</option>
            </select>

            <input
              name="unit_price"
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={updateForm}
              placeholder="Unit price"
              required
            />

            <label className="checkbox-row">
              <input
                name="is_subscription"
                type="checkbox"
                checked={form.is_subscription}
                onChange={updateForm}
              />
              Subscription product
            </label>

            <button
              className="primary-small-button"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Add Product"}
            </button>
          </form>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

        </section>

        <section className="content-card">

          <div className="section-header">
            <h2>Product Catalog</h2>

            <button
              className="secondary-button"
              onClick={loadProducts}
            >
              Refresh
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Subscription</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      ${Number(
                        product.unit_price
                      ).toFixed(2)}
                    </td>
                    <td>
                      {product.is_subscription
                        ? "Yes"
                        : "No"}
                    </td>
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