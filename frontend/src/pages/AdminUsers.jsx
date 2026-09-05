import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    createUser,
    getUsers,
} from "../api/admin";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES",
    customer_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        customer_id: form.customer_id
          ? Number(form.customer_id)
          : null,
      });

      setForm({
        name: "",
        email: "",
        password: "",
        role: "SALES",
        customer_id: "",
      });

      await loadUsers();
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
            Admin / Users
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
            <h1>Users & Sales</h1>
            <p>
              Create and manage internal DealFlow360 users.
            </p>
          </div>
        </div>

        <section className="content-card">
          <h2>Create User</h2>

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              placeholder="Name"
              required
            />

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateForm}
              placeholder="Email"
              required
            />

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              placeholder="Password"
              required
            />

            <select
              name="role"
              value={form.role}
              onChange={updateForm}
            >
              <option value="SALES">
                Sales
              </option>

              <option value="ADMIN">
                Admin
              </option>

              <option value="CUSTOMER">
                Customer
              </option>
            </select>

            <input
              name="customer_id"
              type="number"
              value={form.customer_id}
              onChange={updateForm}
              placeholder="Customer ID (optional)"
            />

            <button
              className="primary-small-button"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create User"}
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
            <h2>Users</h2>

            <button
              className="secondary-button"
              onClick={loadUsers}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Customer ID</th>
                    <th>Active</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge">
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.customer_id ?? "—"}
                      </td>
                      <td>
                        {user.is_active
                          ? "Yes"
                          : "No"}
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