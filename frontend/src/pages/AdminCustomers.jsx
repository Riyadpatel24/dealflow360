import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    createCustomer,
    getCustomers,
} from "../api/admin";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    tier: "Bronze",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    try {
      setError("");

      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCustomers();
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

      await createCustomer(form);

      setForm({
        name: "",
        email: "",
        tier: "Bronze",
      });

      await loadCustomers();
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
            Admin / Customers
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
            <h1>Customers</h1>
            <p>
              Manage customer organizations and their tiers.
            </p>
          </div>
        </div>

        <section className="content-card">
          <h2>Add Customer</h2>

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              placeholder="Company name"
              required
            />

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateForm}
              placeholder="Company email"
              required
            />

            <select
              name="tier"
              value={form.tier}
              onChange={updateForm}
            >
              <option>Bronze</option>
              <option>Silver</option>
              <option>Gold</option>
            </select>

            <button
              className="primary-small-button"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Add Customer"}
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
            <h2>Customer Accounts</h2>

            <button
              className="secondary-button"
              onClick={loadCustomers}
            >
              Refresh
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Tier</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.id}</td>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>
                      <span className="badge">
                        {customer.tier}
                      </span>
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