import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyQuotations } from "../api/quotations";

export default function CustomerQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQuotations() {
    try {
      setLoading(true);
      setError("");
      const data = await getMyQuotations();
      setQuotations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotations();
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">Customer / Quotations</span>
        </div>
        <Link to="/customer" className="secondary-button">
          ← Customer Portal
        </Link>
      </header>

      <main className="dashboard-container">
        <div className="page-heading">
          <div>
            <h1>My Quotations</h1>
            <p>Quotations associated with your customer account.</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="content-card">
          {loading ? (
            <p>Loading quotations...</p>
          ) : quotations.length === 0 ? (
            <div className="empty-state">
              <h3>No quotations found</h3>
              <p>Your account currently has no quotations.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Status</th>
                    <th>Currency</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td><strong>{quotation.quotation_number}</strong></td>
                      <td><span className="badge">{quotation.status}</span></td>
                      <td>{quotation.currency}</td>
                      <td>
                        {quotation.created_at
                          ? new Date(quotation.created_at).toLocaleDateString()
                          : "—"}
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
