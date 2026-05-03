"use client";

import { useEffect, useMemo, useState } from "react";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";
import { formatListDateTime } from "@/lib/dateFormat";
import BoxIcon from "@/components/svgs/BoxIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";

const STOCK_CARD_TONES = ["stat-card stat-lavender", "stat-card stat-sky", "stat-card stat-green"];

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function formatWholeNumber(value) {
  return Math.round(Number(value) || 0).toString();
}

function getStockTone(stock) {
  if (stock <= 0) {
    return "out";
  }

  if (stock <= 5) {
    return "low";
  }

  return "healthy";
}

function getStockLabel(stock) {
  if (stock <= 0) {
    return "Out";
  }

  if (stock <= 5) {
    return "Low";
  }

  return "In Stock";
}

function getMovementLabel(type) {
  switch (type) {
    case "purchase":
      return "Purchase";
    case "sale":
      return "Sale";
    case "manual_in":
      return "Manual In";
    case "manual_out":
      return "Manual Out";
    default:
      return type || "Update";
  }
}

function getMovementTone(type) {
  if (type === "sale" || type === "manual_out") {
    return "out";
  }

  return "in";
}

export default function StockPage() {
  usePurchaseLanguage();
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [adjustment, setAdjustment] = useState({
    productId: "",
    direction: "in",
    quantity: "1",
    note: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadStock() {
      try {
        const response = await fetch("/api/stock", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load stock.");
        }

        if (isMounted) {
          setSnapshot(result);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load stock.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStock();
    return () => {
      isMounted = false;
    };
  }, []);

  const overviewCards = useMemo(() => {
    const overview = snapshot?.overview || {};

    return [
      { label: "Total Products", value: overview.totalProducts || 0, tone: "slate" },
      { label: "In Stock", value: overview.inStock || 0, tone: "green" },
      { label: "Low Stock", value: overview.lowStock || 0, tone: "amber" },
      { label: "Out of Stock", value: overview.outOfStock || 0, tone: "rose" },
      { label: "Stock Units", value: overview.totalUnits || 0, tone: "blue" },
      { label: "Stock Value", value: formatWholeNumber(overview.totalValue || 0), tone: "teal" },
    ];
  }, [snapshot]);
  const stockCards = useMemo(() => {
    const products = snapshot?.products || [];
    const brandNames = Array.from(
      new Set(
        products
          .map((product) => String(product.brandName || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));

    const totals = { total: 0 };
    brandNames.forEach((brandName) => {
      totals[brandName.toLowerCase()] = 0;
    });

    products.forEach((product) => {
      const quantity = Number(product.currentStock || 0);
      totals.total += quantity;
      const brandKey = String(product.brandName || "").trim().toLowerCase();
      if (brandKey && Object.prototype.hasOwnProperty.call(totals, brandKey)) {
        totals[brandKey] += quantity;
      }
    });

    return [
      { key: "total", label: "Total Stock", value: totals.total, tone: STOCK_CARD_TONES[0], icon: BoxIcon },
      ...brandNames.map((brandName, index) => ({
        key: brandName.toLowerCase(),
        label: brandName,
        value: totals[brandName.toLowerCase()] || 0,
        tone: STOCK_CARD_TONES[(index + 1) % STOCK_CARD_TONES.length],
        icon: GlobeIcon,
      })),
    ];
  }, [snapshot]);

  async function handleAdjustStock(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustment.productId,
          direction: adjustment.direction,
          quantity: Number(adjustment.quantity),
          note: adjustment.note,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to adjust stock.");
      }

      setSnapshot(result);
      setAdjustment({ productId: "", direction: "in", quantity: "1", note: "" });
      setMessage("Stock updated.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to adjust stock.");
    }
  }

  const products = snapshot?.products || [];
  const movements = snapshot?.recentMovements || [];

  return (
    <section className="content-area stock-page">
      <div className="section-heading">
        <div>
          <h2>Stock Management</h2>
          <p>Review stock levels and adjust stock manually</p>
        </div>
      </div>

      {message ? <p className="admin-feedback admin-feedback-success">{message}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="stock-overview-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className={`stock-overview-card stock-overview-card-${card.tone}`}>
            <span className="stock-overview-label">{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="stats-grid purchase-header-stock-grid">
        <div className="purchase-stock-summary-head">
          <div>
            <h3>Stock Summary</h3>
          </div>
        </div>
        {stockCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.key} className={card.tone}>
              <span className="stat-icon">
                <Icon />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="stock-layout">
        <section className="stock-panel stock-adjust-panel">
          <div className="stock-panel-head">
            <div>
              <h3>Manual Stock Adjustment</h3>
              <p className="stock-panel-copy">Select a product, choose the adjustment type, and save the quantity change.</p>
            </div>
          </div>

          <form className="stock-adjust-form" onSubmit={handleAdjustStock}>
            <label className="purchase-field-stack stock-field-stack">
              <span>Product</span>
              <div className="purchase-select-wrap stock-select-wrap">
                <select
                  className="purchase-input purchase-select purchase-select-input"
                  value={adjustment.productId}
                  onChange={(event) => setAdjustment((current) => ({ ...current, productId: event.target.value }))}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.displayName}
                    </option>
                  ))}
                </select>
                <span className="purchase-select-arrow" aria-hidden="true">
                  <ChevronDownIcon />
                </span>
              </div>
            </label>

            <div className="stock-adjust-grid">
              <label className="purchase-field-stack stock-field-stack">
                <span>Type</span>
                <div className="purchase-select-wrap stock-select-wrap">
                  <select
                    className="purchase-input purchase-select purchase-select-input"
                    value={adjustment.direction}
                    onChange={(event) => setAdjustment((current) => ({ ...current, direction: event.target.value }))}
                  >
                    <option value="in">Increase stock</option>
                    <option value="out">Decrease stock</option>
                  </select>
                  <span className="purchase-select-arrow" aria-hidden="true">
                    <ChevronDownIcon />
                  </span>
                </div>
              </label>

              <label className="purchase-field-stack stock-field-stack">
                <span>Quantity</span>
                <input
                  className="purchase-input"
                  type="number"
                  min="1"
                  step="1"
                  value={adjustment.quantity}
                  onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="purchase-field-stack stock-field-stack">
              <span>Note</span>
              <input
                className="purchase-input"
                type="text"
                placeholder="Write a note"
                value={adjustment.note}
                onChange={(event) => setAdjustment((current) => ({ ...current, note: event.target.value }))}
              />
            </label>

            <button type="submit" className="primary-button stock-submit-button">
              Update Stock
            </button>
          </form>
        </section>

        <section className="stock-panel stock-panel-wide">
          <div className="stock-panel-head">
            <div>
              <h3>Stock Overview</h3>
              <p className="stock-panel-copy">Review category, brand, variant, and current stock in one view.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-card"><div className="table-empty">Loading...</div></div>
          ) : (
            <div className="table-card clean-table-card">
              <div className="clean-table-scroll">
                <table className="clean-data-table stock-overview-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Brand</th>
                      <th>Variant</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const stockTone = getStockTone(product.currentStock || 0);
                      const stockLabel = getStockLabel(product.currentStock || 0);

                      return (
                        <tr key={product.id}>
                          <td>{product.categoryName || "-"}</td>
                          <td>{product.brandName || "-"}</td>
                          <td>{product.variantName || "-"}</td>
                          <td className="clean-stack-cell clean-center-cell">
                            <strong>{product.currentStock}</strong>
                            <span className={`stock-level-badge stock-level-${stockTone}`}>{stockLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="stock-panel">
        <div className="stock-panel-head">
          <div>
            <h3>Recent Stock Movements</h3>
            <p className="stock-panel-copy">Track purchase, sale, and manual adjustment activity in one place.</p>
          </div>
        </div>
        <div className="table-card clean-table-card">
          <div className="clean-table-scroll">
            <table className="clean-data-table stock-movement-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const movementTone = getMovementTone(movement.type);
                  const movementLabel = getMovementLabel(movement.type);
                  const quantityPrefix = movementTone === "out" ? "-" : "+";

                  return (
                    <tr key={movement.id}>
                      <td className="clean-stack-cell clean-text-cell">
                        <strong>{movement.productName}</strong>
                        <span>{movement.referenceType || "Stock movement"}</span>
                      </td>
                      <td className="clean-center-cell">
                        <span className={`stock-movement-badge stock-movement-${movementTone}`}>{movementLabel}</span>
                      </td>
                      <td className="clean-center-cell">
                        <strong className={`stock-movement-qty stock-movement-qty-${movementTone}`}>
                          {quantityPrefix}{Math.abs(Number(movement.quantity) || 0)}
                        </strong>
                      </td>
                      <td>{movement.note || "-"}</td>
                      <td>{formatListDateTime(movement.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}
