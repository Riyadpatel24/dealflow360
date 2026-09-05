import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getQuotations } from "../api/quotations";

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQuotations() {
    try {
      setLoading(true);
      setError("");

      const data = await getQuotations();
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
          <span className="topbar-subtitle">
            Sales / Quotations
          </span>
        </div>

        <Link
          to="/sales"
          className="secondary-button"
        >
          ← Sales Dashboard
        </Link>
      </header>

      <main className="dashboard-container">

        <div className="page-heading">
          <div>
            <h1>Quotations</h1>
            <p>
              Live quotation data from PostgreSQL.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadQuotations}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <section className="content-card">

          {loading ? (
            <p>Loading quotations...</p>
          ) : quotations.length === 0 ? (
            <p>No quotations found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Currency</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td>
                        <strong>
                          {quotation.quotation_number}
                        </strong>
                      </td>

                      <td>
                        {quotation.customer?.name ||
                          quotation.customer_name ||
                          "—"}
                      </td>

                      <td>
                        <span className="badge">
                          {quotation.status}
                        </span>
                      </td>

                      <td>{quotation.currency}</td>

                      <td>
                        {quotation.created_at
                          ? new Date(
                              quotation.created_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        <Link
                          className="table-link"
                          to={`/sales/quotations/${quotation.id}`}
                        >
                          View →
                        </Link>
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