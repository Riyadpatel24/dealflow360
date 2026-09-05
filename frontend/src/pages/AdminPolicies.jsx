import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    createDiscountPolicy,
    getDiscountPolicies,
} from "../api/admin";

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);

  const [form, setForm] = useState({
    name: "",
    customer_tier: "Gold",
    category: "Hardware",
    max_discount_percent: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadPolicies() {
    try {
      setError("");

      const data = await getDiscountPolicies();
      setPolicies(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  function updateForm(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createDiscountPolicy({
        name: form.name,
        customer_tier: form.customer_tier,
        category: form.category,
        max_discount_percent: Number(
          form.max_discount_percent
        ),
      });

      setForm({
        name: "",
        customer_tier: "Gold",
        category: "Hardware",
        max_discount_percent: "",
      });

      await loadPolicies();
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
            Admin / Discount Policies
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
            <h1>Discount Policies</h1>
            <p>
              These policies drive quotation discount governance.
            </p>
          </div>
        </div>

        <section className="content-card">

          <h2>Create Policy</h2>

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              placeholder="Policy name"
              required
            />

            <select
              name="customer_tier"
              value={form.customer_tier}
              onChange={updateForm}
            >
              <option>Bronze</option>
              <option>Silver</option>
              <option>Gold</option>
            </select>

            <select
              name="category"
              value={form.category}
              onChange={updateForm}
            >
              <option>Hardware</option>
              <option>Services</option>
            </select>

            <input
              name="max_discount_percent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.max_discount_percent}
              onChange={updateForm}
              placeholder="Maximum discount %"
              required
            />

            <button
              className="primary-small-button"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Policy"}
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
            <h2>Active Policies</h2>

            <button
              className="secondary-button"
              onClick={loadPolicies}
            >
              Refresh
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Policy</th>
                  <th>Tier</th>
                  <th>Category</th>
                  <th>Maximum Discount</th>
                </tr>
              </thead>

              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>{policy.id}</td>
                    <td>{policy.name}</td>
                    <td>
                      <span className="badge">
                        {policy.customer_tier}
                      </span>
                    </td>
                    <td>{policy.category}</td>
                    <td>
                      <strong>
                        {policy.max_discount_percent}%
                      </strong>
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