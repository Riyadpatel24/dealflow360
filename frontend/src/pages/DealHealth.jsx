import { Link } from "react-router-dom";

export default function DealHealth() {
  return (
    <div className="app-shell">

      <header className="topbar">
        <div>
          <strong>DealFlow360</strong>
          <span className="topbar-subtitle">
            Sales / Deal Health
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
            <h1>Deal Health</h1>
            <p>
              Monitor operational risk across active deals.
            </p>
          </div>
        </div>

        <section className="content-card">

          <div className="feature-header">
            <div className="module-icon">
              📊
            </div>

            <div>
              <h2>Deal Health Engine</h2>

              <p>
                Deal health will combine quotation age,
                discount anomalies, approval state and
                fulfillment risk into explainable alerts.
              </p>
            </div>
          </div>

          <div className="workflow-grid">

            <div>
              <span>01</span>
              <strong>Idle deals</strong>
              <p>
                Identify quotations with no recent activity.
              </p>
            </div>

            <div>
              <span>02</span>
              <strong>Discount anomalies</strong>
              <p>
                Detect unusual discount behavior.
              </p>
            </div>

            <div>
              <span>03</span>
              <strong>Promise risk</strong>
              <p>
                Surface delivery commitments at risk.
              </p>
            </div>

            <div>
              <span>04</span>
              <strong>Explainability</strong>
              <p>
                Show why the deal is considered unhealthy.
              </p>
            </div>

          </div>

          <div className="info-message">
            The dedicated deal-health service and alert
            model still need to be added to the backend.
            We are not generating fake health scores here.
          </div>

        </section>

      </main>
    </div>
  );
}