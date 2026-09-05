import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  consolidateBackorder,
  fulfillQuotation,
  getFulfillment,
  getFulfillmentRecommendation,
  shipQuotation,
} from "../api/operations";


export default function Fulfillment() {
  const params = useParams();

  const quotationId =
    params.quotationId || "1";

  const [data, setData] =
    useState(null);

  const [recommendation, setRecommendation] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [working, setWorking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function load() {
    try {
      setLoading(true);
      setError("");

      const details =
        await getFulfillment(
          quotationId
        );

      setData(details);

      try {
        const recommendationData =
          await getFulfillmentRecommendation(
            quotationId
          );

        setRecommendation(
          recommendationData
        );
      } catch {
        setRecommendation(null);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    load();
  }, [quotationId]);


  async function createAllocation() {
    try {
      setWorking(true);
      setError("");
      setSuccess("");

      await fulfillQuotation(
        quotationId
      );

      setSuccess(
        "Fulfillment allocation created successfully."
      );

      await load();

    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }


  async function ship() {
    try {
      setWorking(true);
      setError("");
      setSuccess("");

      await shipQuotation(
        quotationId
      );

      setSuccess(
        "Shipment marked as shipped."
      );

      await load();

    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }


  async function consolidate(
    backorderId
  ) {
    try {
      setWorking(true);
      setError("");
      setSuccess("");

      const result =
        await consolidateBackorder(
          backorderId
        );

      if (
        result.remaining_quantity ===
        0
      ) {
        setSuccess(
          "Backorder fully consolidated."
        );
      } else {
        setSuccess(
          `Backorder partially consolidated. ${result.remaining_quantity} units remain.`
        );
      }

      await load();

    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }


  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="spinner" />
          <p>
            Loading fulfillment...
          </p>
        </div>
      </div>
    );
  }


  if (!data) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          Fulfillment data could not be loaded.
        </div>
      </div>
    );
  }


  const quotation =
    data.quotation;

  const fulfillments =
    data.fulfillments || [];

  const shipments =
    data.shipments || [];

  const backorders =
    data.backorders || [];

  const lineSummary =
    data.line_summary || [];

  const hasAllocations =
    fulfillments.length > 0;

  const hasReadyShipments =
    shipments.some(
      (shipment) =>
        shipment.status ===
        "READY"
    );

  return (
    <div className="app-shell">

      <header className="topbar">

        <div>
          <strong>
            DealFlow360
          </strong>

          <span className="topbar-subtitle">
            Sales / Fulfillment
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}


        <div className="page-heading">

          <div>

            <h1>
              Fulfillment
            </h1>

            <p>
              {quotation?.quotation_number ||
                `Quotation #${quotationId}`}
              {" · "}
              Multi-warehouse allocation
            </p>

          </div>

          <span className="badge">
            {quotation?.status}
          </span>

        </div>


        <section className="content-card">

          <div className="section-header">

            <div>
              <h2>
                Fulfillment Workflow
              </h2>

              <p>
                Allocate stock across
                warehouses, create shipments,
                and track backorders.
              </p>
            </div>

          </div>


          <div className="workflow-grid">

            <div>
              <span>1</span>

              <strong>
                Check stock
              </strong>

              <p>
                Read live inventory from
                PostgreSQL.
              </p>
            </div>


            <div>
              <span>2</span>

              <strong>
                Allocate
              </strong>

              <p>
                Split required quantities
                across warehouses.
              </p>
            </div>


            <div>
              <span>3</span>

              <strong>
                Ship
              </strong>

              <p>
                Move READY shipments into
                the SHIPPED lifecycle.
              </p>
            </div>


            <div>
              <span>4</span>

              <strong>
                Backorder
              </strong>

              <p>
                Keep unavailable quantity
                outstanding until stock arrives.
              </p>
            </div>

          </div>

        </section>


        {recommendation && (
          <section className="content-card">

            <div className="section-header">

              <div>
                <h2>
                  Recommended Warehouse Split
                </h2>

                <p>
                  Generated by the backend
                  fulfillment engine.
                </p>
              </div>

            </div>


            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>
                      Product
                    </th>

                    <th>
                      Required
                    </th>

                    <th>
                      Recommended Allocation
                    </th>

                    <th>
                      Allocated
                    </th>

                    <th>
                      Backorder
                    </th>
                  </tr>

                </thead>


                <tbody>

                  {(
                    recommendation.recommendations ||
                    []
                  ).map(
                    (item) => (
                      <tr
                        key={
                          item.quotation_line_id
                        }
                      >

                        <td>
                          {item.product_name}
                        </td>

                        <td>
                          {
                            item.required_quantity
                          }
                        </td>

                        <td>
                          {item.allocations
                            .length === 0
                            ? "No stock"
                            : item.allocations
                                .map(
                                  (
                                    allocation
                                  ) =>
                                    `${allocation.warehouse_name}: ${allocation.quantity}`
                                )
                                .join(
                                  " · "
                                )}
                        </td>

                        <td>
                          {
                            item.allocated_quantity
                          }
                        </td>

                        <td>
                          {
                            item.backorder_quantity
                          }
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>


            {!hasAllocations &&
              quotation?.status &&
              [
                "APPROVED",
                "CONFIRMED",
              ].includes(
                quotation.status.toUpperCase()
              ) && (
                <div
                  style={{
                    marginTop: 20,
                  }}
                >

                  <button
                    className="primary-small-button"
                    onClick={
                      createAllocation
                    }
                    disabled={working}
                  >
                    {working
                      ? "Allocating..."
                      : "Accept Recommended Allocation"}
                  </button>

                </div>
              )}

          </section>
        )}


        <section className="content-card">

          <div className="section-header">

            <h2>
              Allocation Details
            </h2>

            <span className="badge">
              {fulfillments.length} allocation
              {fulfillments.length === 1
                ? ""
                : "s"}
            </span>

          </div>


          {fulfillments.length === 0 ? (
            <div className="empty-state">

              <p>
                No inventory has been allocated
                yet.
              </p>

            </div>
          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Line
                    </th>

                    <th>
                      Warehouse
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Shipment
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {fulfillments.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >

                        <td>
                          #
                          {
                            item.quotation_line_id
                          }
                        </td>

                        <td>
                          Warehouse #
                          {
                            item.warehouse_id
                          }
                        </td>

                        <td>
                          {item.quantity}
                        </td>

                        <td>
                          {item.shipment_id
                            ? `Shipment #${item.shipment_id}`
                            : "—"}
                        </td>

                        <td>
                          <span className="badge">
                            {item.status}
                          </span>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>


        <section className="content-card">

          <div className="section-header">

            <h2>
              Shipments
            </h2>

            <span className="badge">
              {shipments.length}
            </span>

          </div>


          {shipments.length === 0 ? (
            <div className="empty-state">
              <p>
                No shipments created yet.
              </p>
            </div>
          ) : (

            <>
              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>
                      <th>
                        Shipment
                      </th>

                      <th>
                        Warehouse
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Cost
                      </th>

                      <th>
                        Created
                      </th>
                    </tr>

                  </thead>


                  <tbody>

                    {shipments.map(
                      (shipment) => (
                        <tr
                          key={
                            shipment.id
                          }
                        >

                          <td>
                            {
                              shipment.shipment_number
                            }
                          </td>

                          <td>
                            Warehouse #
                            {
                              shipment.warehouse_id
                            }
                          </td>

                          <td>
                            <span className="badge">
                              {
                                shipment.status
                              }
                            </span>
                          </td>

                          <td>
                            $
                            {Number(
                              shipment.shipment_cost
                            ).toFixed(2)}
                          </td>

                          <td>
                            {shipment.created_at
                              ? new Date(
                                  shipment.created_at
                                ).toLocaleString()
                              : "—"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>


              {hasReadyShipments && (
                <div
                  style={{
                    marginTop: 20,
                  }}
                >

                  <button
                    className="primary-small-button"
                    onClick={ship}
                    disabled={working}
                  >
                    {working
                      ? "Shipping..."
                      : "Mark Shipment(s) Shipped"}
                  </button>

                </div>
              )}

            </>
          )}

        </section>


        <section className="content-card">

          <div className="section-header">

            <h2>
              Backorders
            </h2>

            <span className="badge">
              {backorders.filter(
                (item) =>
                  item.status ===
                  "OPEN"
              ).length}{" "}
              open
            </span>

          </div>


          {backorders.length === 0 ? (
            <div className="success-message">
              No backorders. All physical
              products have sufficient stock.
            </div>
          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Backorder
                    </th>

                    <th>
                      Line
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {backorders.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >

                        <td>
                          BO-{item.id}
                        </td>

                        <td>
                          #
                          {
                            item.quotation_line_id
                          }
                        </td>

                        <td>
                          {item.quantity}
                        </td>

                        <td>
                          <span className="badge">
                            {
                              item.status
                            }
                          </span>
                        </td>

                        <td>

                          {item.status ===
                            "OPEN" && (
                            <button
                              className="secondary-button"
                              onClick={() =>
                                consolidate(
                                  item.id
                                )
                              }
                              disabled={
                                working
                              }
                            >
                              Consolidate
                            </button>
                          )}

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>


        <section className="content-card">

          <h2>
            Line Fulfillment Summary
          </h2>


          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    Required
                  </th>

                  <th>
                    Allocated
                  </th>

                  <th>
                    Remaining
                  </th>

                </tr>

              </thead>


              <tbody>

                {lineSummary.map(
                  (line) => {

                    const remaining =
                      Math.max(
                        0,
                        line.required_quantity -
                          line.allocated_quantity
                      );

                    return (
                      <tr
                        key={
                          line.quotation_line_id
                        }
                      >

                        <td>
                          {
                            line.product_name
                          }
                        </td>

                        <td>
                          {
                            line.required_quantity
                          }
                        </td>

                        <td>
                          {
                            line.allocated_quantity
                          }
                        </td>

                        <td>
                          {remaining}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}