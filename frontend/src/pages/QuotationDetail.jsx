import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  evaluateQuotationRisk,
  getQuotation,
} from "../api/quotations";


export default function QuotationDetail() {

  const { quotationId } =
    useParams();

  const navigate =
    useNavigate();


  const [quotation, setQuotation] =
    useState(null);

  const [lines, setLines] =
    useState([]);

  const [risk, setRisk] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [evaluating, setEvaluating] =
    useState(false);

  const [error, setError] =
    useState("");


  async function loadQuotation() {

    try {

      setLoading(true);
      setError("");

      const data =
        await getQuotation(
          quotationId
        );

      /*
       * Backend response:
       *
       * {
       *   quotation: {...},
       *   lines: [...],
       *   risk: {...}
       * }
       */

      setQuotation(
        data.quotation
      );

      setLines(
        data.lines || []
      );

      setRisk(
        data.risk || null
      );

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setLoading(false);

    }
  }


  async function runRiskEvaluation() {

    try {

      setEvaluating(true);
      setError("");

      const result =
        await evaluateQuotationRisk(
          quotationId
        );

      /*
       * Backend returns:
       *
       * {
       *   risk: {...},
       *   approval_request: {...}
       * }
       *
       * We only need the risk object
       * for this section.
       */

      setRisk(
        result.risk
      );

      await loadQuotation();

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setEvaluating(false);

    }
  }


  function openFulfillment() {

    navigate(
      `/sales/fulfillment/${quotationId}`
    );

  }


  useEffect(() => {

    loadQuotation();

  }, [quotationId]);


  if (loading) {

    return (
      <div className="loading-screen">

        <p>
          Loading quotation...
        </p>

      </div>
    );

  }


  if (!quotation) {

    return (
      <div className="dashboard-container">

        <div className="error-message">

          {error ||
            "Quotation not found."}

        </div>

      </div>
    );

  }


  return (
    <div className="app-shell">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="topbar">

        <div>

          <strong>
            DealFlow360
          </strong>

          <span className="topbar-subtitle">
            Quotation Detail
          </span>

        </div>


        <Link
          to="/sales/quotations"
          className="secondary-button"
        >
          ← Quotations
        </Link>

      </header>


      <main className="dashboard-container">

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (

          <div className="error-message">

            {error}

          </div>

        )}


        {/* ===================================================
            QUOTATION HEADER
        =================================================== */}

        <div className="page-heading">

          <div>

            <h1>
              {quotation.quotation_number}
            </h1>

            <p>
              Customer ID:{" "}
              {quotation.customer_id}
            </p>

            <p>
              Status:{" "}
              <strong>
                {quotation.status}
              </strong>
            </p>

          </div>


          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >

            <button
              className="primary-small-button"
              onClick={
                runRiskEvaluation
              }
              disabled={evaluating}
            >
              {evaluating
                ? "Evaluating..."
                : "Evaluate Risk"}
            </button>


            <button
              className="secondary-button"
              onClick={
                openFulfillment
              }
            >
              Fulfillment
            </button>

          </div>

        </div>


        {/* ===================================================
            QUOTATION LINES
        =================================================== */}

        <section className="content-card">

          <div className="section-header">

            <h2>
              Quotation Lines
            </h2>

            <span className="badge">
              {quotation.status}
            </span>

          </div>


          {lines.length === 0 ? (

            <div className="empty-state">

              <p>
                This quotation has no lines.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Product
                    </th>

                    <th>
                      Qty
                    </th>

                    <th>
                      Unit Price
                    </th>

                    <th>
                      Discount
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {lines.map(
                    (line) => (

                      <tr
                        key={line.id}
                      >

                        <td>
                          Product #
                          {
                            line.product_id
                          }
                        </td>

                        <td>
                          {
                            line.quantity
                          }
                        </td>

                        <td>
                          $
                          {Number(
                            line.unit_price
                          ).toFixed(2)}
                        </td>

                        <td>
                          {
                            line.discount_percent
                          }%
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ===================================================
            RISK EVALUATION
        =================================================== */}

        <section className="content-card">

          <div className="section-header">

            <h2>
              Risk Evaluation
            </h2>


            {risk && (

              <span
                className={`risk-badge ${String(
                  risk.risk_level
                ).toLowerCase()}`}
              >
                {
                  risk.risk_level
                }
              </span>

            )}

          </div>


          {!risk ? (

            <div className="empty-state">

              <p>
                This quotation has not
                been evaluated yet.
              </p>

              <p>
                Click{" "}
                <strong>
                  Evaluate Risk
                </strong>{" "}
                to run the backend
                discount governance
                engine.
              </p>

            </div>

          ) : (

            <>

              <div className="risk-summary">

                <div>

                  <span>
                    Risk Level
                  </span>

                  <strong>
                    {
                      risk.risk_level
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Worst Deviation
                  </span>

                  <strong>
                    {
                      risk.worst_deviation
                    }{" "}
                    pts
                  </strong>

                </div>


                <div>

                  <span>
                    Reason
                  </span>

                  <strong>
                    {
                      risk.reason ||
                      "—"
                    }
                  </strong>

                </div>

              </div>


              {risk.risk_lines &&
                risk.risk_lines.length >
                  0 && (

                  <div
                    className="table-wrapper"
                    style={{
                      marginTop:
                        "20px",
                    }}
                  >

                    <table>

                      <thead>

                        <tr>

                          <th>
                            Line
                          </th>

                          <th>
                            Requested
                          </th>

                          <th>
                            Allowed
                          </th>

                          <th>
                            Deviation
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Reason
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {risk.risk_lines.map(
                          (
                            riskLine
                          ) => (

                            <tr
                              key={
                                riskLine.id
                              }
                            >

                              <td>
                                #
                                {
                                  riskLine.quotation_line_id
                                }
                              </td>

                              <td>
                                {
                                  riskLine.requested_discount
                                }%
                              </td>

                              <td>
                                {
                                  riskLine.allowed_discount
                                }%
                              </td>

                              <td>
                                {
                                  riskLine.deviation
                                }{" "}
                                pts
                              </td>

                              <td>
                                {
                                  riskLine.status
                                }
                              </td>

                              <td>
                                {
                                  riskLine.reason
                                }
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

            </>

          )}

        </section>


      </main>

    </div>
  );
}