import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getQuotationApproval,
    getQuotations,
} from "../api/quotations";

export default function Approvals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadApprovals() {
    try {
      setLoading(true);
      setError("");

      const quotations = await getQuotations();

      const results = [];

      for (const quotation of quotations) {
        try {
          const approval =
            await getQuotationApproval(
              quotation.id
            );

          if (approval) {
            results.push({
              quotation,
              approval,
            });
          }
        } catch {
          // No approval request for this quotation.
        }
      }

      setItems(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  return (
    <div className="app-shell">

      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">
            Sales / Approvals
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
            <h1>Approval Queue</h1>
            <p>
              Quotations requiring governance review.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadApprovals}
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
            <p>Loading approvals...</p>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <h3>No approval requests found</h3>
              <p>
                Run risk evaluation on a quotation
                whose discount exceeds policy.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Approval Status</th>
                    <th>Created</th>
                    <th>Steps</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    ({ quotation, approval }) => (
                      <tr key={approval.id}>
                        <td>
                          {quotation.quotation_number}
                        </td>

                        <td>
                          <span className="badge">
                            {approval.status}
                          </span>
                        </td>

                        <td>
                          {approval.created_at
                            ? new Date(
                                approval.created_at
                              ).toLocaleString()
                            : "—"}
                        </td>

                        <td>
                          {approval.steps?.length ||
                            0}
                        </td>

                        <td>
                          <Link
                            className="table-link"
                            to={`/sales/quotations/${quotation.id}`}
                          >
                            Review →
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

        </section>

      </main>
    </div>
  );
}