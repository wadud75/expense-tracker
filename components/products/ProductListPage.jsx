"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import StackIcon from "@/components/svgs/StackIcon";
import StoreIcon from "@/components/svgs/StoreIcon";
import TakaIcon from "@/components/svgs/TakaIcon";
import WarningIcon from "@/components/svgs/WarningIcon";
import { formatListDateTime } from "@/lib/dateFormat";

const STOCK_FILTERS = [
  { key: "all", label: "All Products" },
  { key: "healthy", label: "In Stock" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
];

const EMPTY_FORM = {
  productName: "",
  categoryName: "",
  brandName: "",
  variantName: "",
  supplierName: "",
  unitPrice: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
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
    return "Out of Stock";
  }

  if (stock <= 5) {
    return "Low Stock";
  }

  return "Available";
}

function buildVariantText(product) {
  return [product.brandName, product.variantName].filter(Boolean).join(" / ") || "No variant details";
}

function buildEditForm(product) {
  return {
    productName: product.productName || "",
    categoryName: product.categoryName || "",
    brandName: product.brandName || "",
    variantName: product.variantName || "",
    supplierName: product.supplierName || "",
    unitPrice: String(product.unitPrice ?? ""),
  };
}

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load products.");
        }

        if (isMounted) {
          setProducts(result.products || []);
          setErrorMessage("");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load products.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load products.");
      }

      setProducts(result.products || []);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to load products.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function openEditModal(product) {
    setSuccessMessage("");
    setErrorMessage("");
    setEditingProductId(product.id);
    setEditForm(buildEditForm(product));
  }

  function closeEditModal() {
    if (isSaving) {
      return;
    }

    setEditingProductId("");
    setEditForm(EMPTY_FORM);
  }

  async function handleSaveProduct(event) {
    event.preventDefault();

    if (!editingProductId) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/products/${editingProductId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editForm,
          unitPrice: Number(editForm.unitPrice),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update product.");
      }

      await handleRefresh();
      setSuccessMessage("Product updated.");
      setEditingProductId("");
      setEditForm(EMPTY_FORM);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Delete ${product.displayName || product.productName}? This also removes its linked stock movement and sales history.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingProductId(product.id);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete product.");
      }

      setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
      setSuccessMessage("Product deleted.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete product.");
    } finally {
      setDeletingProductId("");
    }
  }

  const stockFilteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stockTone = getStockTone(Number(product.currentStock) || 0);
      return stockFilter === "all" || stockTone === stockFilter;
    });
  }, [products, stockFilter]);

  const filteredProducts = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();

    return stockFilteredProducts.filter((product) => {
      if (!query) {
        return true;
      }

      const haystack = [
        product.displayName,
        product.productName,
        product.categoryName,
        product.brandName,
        product.variantName,
        product.supplierName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [deferredSearchValue, stockFilteredProducts]);

  const overview = useMemo(() => {
    return stockFilteredProducts.reduce(
      (summary, product) => {
        const stock = Number(product.currentStock) || 0;
        const unitPrice = Number(product.unitPrice) || 0;
        const stockTone = getStockTone(stock);

        summary.totalProducts += 1;
        summary.totalUnits += stock;
        summary.totalValue += stock * unitPrice;

        if (stockTone === "healthy") {
          summary.inStock += 1;
        } else if (stockTone === "low") {
          summary.lowStock += 1;
        } else {
          summary.outOfStock += 1;
        }

        return summary;
      },
      { totalProducts: 0, totalUnits: 0, totalValue: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
    );
  }, [stockFilteredProducts]);

  const topCategory = useMemo(() => {
    const categoryMap = stockFilteredProducts.reduce((accumulator, product) => {
      const key = product.categoryName || "Uncategorized";
      accumulator.set(key, (accumulator.get(key) || 0) + 1);
      return accumulator;
    }, new Map());

    const entries = [...categoryMap.entries()].sort((left, right) => right[1] - left[1]);
    return entries[0]?.[0] || "No category";
  }, [stockFilteredProducts]);

  const summaryCards = [
    {
      label: "Products",
      value: formatNumber(overview.totalProducts),
      tone: "product-summary-card-blue",
      icon: BoxIcon,
      meta: `${formatNumber(overview.inStock)} ready to sell`,
    },
    {
      label: "Inventory Units",
      value: formatNumber(overview.totalUnits),
      tone: "product-summary-card-mint",
      icon: StackIcon,
      meta: `${formatNumber(overview.lowStock)} low stock alerts`,
    },
    {
      label: "Inventory Value",
      value: formatCurrency(overview.totalValue),
      tone: "product-summary-card-amber",
      icon: TakaIcon,
      meta: topCategory,
    },
    {
      label: "Risk Items",
      value: formatNumber(overview.outOfStock + overview.lowStock),
      tone: "product-summary-card-rose",
      icon: WarningIcon,
      meta: `${formatNumber(overview.outOfStock)} out of stock`,
    },
  ];

  return (
    <>
      <section className="content-area product-page">
        <div className="product-hero">
          <div className="product-hero-copy">
            <span className="product-eyebrow">Catalog Management</span>
            <h2>Product List</h2>
            <p>
              Review your full inventory catalog with live stock visibility, supplier context, and
              pricing in one professional workspace.
            </p>
          </div>

          <div className="product-hero-actions">
            <button type="button" className="outline-button product-refresh-button" onClick={handleRefresh} disabled={isRefreshing}>
              <span className={`product-refresh-icon ${isRefreshing ? "product-refresh-icon-spinning" : ""}`}>
                <RefreshIcon />
              </span>
              <span>{isRefreshing ? "Refreshing..." : "Refresh List"}</span>
            </button>
          </div>
        </div>

        {successMessage ? <p className="admin-feedback admin-feedback-success">{successMessage}</p> : null}
        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

        <div className="product-summary-grid">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.label} className={`product-summary-card ${card.tone}`}>
                <div className="product-summary-icon">
                  <Icon />
                </div>
                <div className="product-summary-copy">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.meta}</p>
                </div>
              </article>
            );
          })}
        </div>

        <section className="product-catalog-panel">
          <div className="product-toolbar">
            <label className="search-field product-search-field">
              <SearchIcon />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search product, brand, category, or supplier"
                aria-label="Search products"
              />
            </label>

            <div className="chip-group product-chip-group" role="tablist" aria-label="Stock filters">
              {STOCK_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`filter-chip ${stockFilter === filter.key ? "active" : ""}`}
                  onClick={() => setStockFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="product-list-meta">
            <div className="product-list-stat">
              <BoxIcon />
              <span>{formatNumber(filteredProducts.length)} search results</span>
            </div>
            <div className="product-list-stat">
              <GlobeIcon />
              <span>Top category: {topCategory}</span>
            </div>
            <div className="product-list-stat">
              <StoreIcon />
              <span>{formatCurrency(overview.totalValue)} selected stock value</span>
            </div>
          </div>

          {isLoading ? (
            <div className="table-card">
              <div className="table-empty">Loading products...</div>
            </div>
          ) : filteredProducts.length ? (
            <>
              <div className="table-card product-table-card">
                <div className="product-table-head">
                  <span>Product</span>
                  <span>Category</span>
                  <span>Supplier</span>
                  <span>Price</span>
                  <span>Stock</span>
                  <span>Updated</span>
                  <span>Actions</span>
                </div>

                {filteredProducts.map((product) => {
                  const stock = Number(product.currentStock) || 0;
                  const stockTone = getStockTone(stock);
                  const isDeleting = deletingProductId === product.id;

                  return (
                    <div key={product.id} className="product-table-row">
                      <div className="product-primary-cell">
                        <strong>{product.displayName || product.productName || "Unnamed product"}</strong>
                        <p>{buildVariantText(product)}</p>
                      </div>
                      <span>{product.categoryName || "-"}</span>
                      <span>{product.supplierName || "-"}</span>
                      <strong>{formatCurrency(product.unitPrice)}</strong>
                      <div className="product-stock-cell">
                        <strong>{formatNumber(stock)} units</strong>
                        <span className={`stock-level-badge stock-level-${stockTone}`}>{getStockLabel(stock)}</span>
                      </div>
                      <span>{formatListDateTime(product.updatedAt)}</span>
                      <div className="product-actions-cell">
                        <button type="button" className="product-action-button product-action-edit" onClick={() => openEditModal(product)}>
                          Edit
                        </button>
                        <button type="button" className="product-action-button product-action-delete" onClick={() => handleDeleteProduct(product)} disabled={isDeleting}>
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="product-mobile-grid">
                {filteredProducts.map((product) => {
                  const stock = Number(product.currentStock) || 0;
                  const stockTone = getStockTone(stock);
                  const isDeleting = deletingProductId === product.id;

                  return (
                    <article key={product.id} className="product-mobile-card">
                      <div className="product-mobile-head">
                        <div>
                          <strong>{product.displayName || product.productName || "Unnamed product"}</strong>
                          <p>{product.categoryName || "Uncategorized"}</p>
                        </div>
                        <span className={`stock-level-badge stock-level-${stockTone}`}>{getStockLabel(stock)}</span>
                      </div>

                      <div className="product-mobile-metrics">
                        <div>
                          <span>Supplier</span>
                          <strong>{product.supplierName || "-"}</strong>
                        </div>
                        <div>
                          <span>Unit Price</span>
                          <strong>{formatCurrency(product.unitPrice)}</strong>
                        </div>
                        <div>
                          <span>Stock</span>
                          <strong>{formatNumber(stock)} units</strong>
                        </div>
                        <div>
                          <span>Updated</span>
                          <strong>{formatListDateTime(product.updatedAt)}</strong>
                        </div>
                      </div>

                      <div className="product-mobile-actions">
                        <button type="button" className="product-action-button product-action-edit" onClick={() => openEditModal(product)}>
                          Edit
                        </button>
                        <button type="button" className="product-action-button product-action-delete" onClick={() => handleDeleteProduct(product)} disabled={isDeleting}>
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="product-empty-state">
              <div className="product-empty-icon">
                <BoxIcon />
              </div>
              <h3>No products match this view</h3>
              <p>Try adjusting the search or stock filter to widen the catalog results.</p>
            </div>
          )}
        </section>
      </section>

      {editingProductId ? (
        <div className="product-modal-overlay" onClick={closeEditModal}>
          <div className="product-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="product-modal-head">
              <div>
                <h3>Edit Product</h3>
                <p>Update product details and pricing for the selected catalog item.</p>
              </div>
              <button type="button" className="product-modal-close" onClick={closeEditModal} aria-label="Close edit product dialog">
                <CloseIcon />
              </button>
            </div>

            <form className="product-edit-form" onSubmit={handleSaveProduct}>
              <div className="product-edit-grid">
                <label className="purchase-field-stack">
                  <span>Product Name</span>
                  <input className="purchase-input" type="text" value={editForm.productName} onChange={(event) => setEditForm((current) => ({ ...current, productName: event.target.value }))} required />
                </label>
                <label className="purchase-field-stack">
                  <span>Category</span>
                  <input className="purchase-input" type="text" value={editForm.categoryName} onChange={(event) => setEditForm((current) => ({ ...current, categoryName: event.target.value }))} />
                </label>
                <label className="purchase-field-stack">
                  <span>Brand</span>
                  <input className="purchase-input" type="text" value={editForm.brandName} onChange={(event) => setEditForm((current) => ({ ...current, brandName: event.target.value }))} />
                </label>
                <label className="purchase-field-stack">
                  <span>Variant</span>
                  <input className="purchase-input" type="text" value={editForm.variantName} onChange={(event) => setEditForm((current) => ({ ...current, variantName: event.target.value }))} />
                </label>
                <label className="purchase-field-stack">
                  <span>Supplier</span>
                  <input className="purchase-input" type="text" value={editForm.supplierName} onChange={(event) => setEditForm((current) => ({ ...current, supplierName: event.target.value }))} />
                </label>
                <label className="purchase-field-stack">
                  <span>Unit Price</span>
                  <input className="purchase-input" type="number" min="0" step="1" value={editForm.unitPrice} onChange={(event) => setEditForm((current) => ({ ...current, unitPrice: event.target.value }))} required />
                </label>
              </div>

              <div className="product-modal-actions">
                <button type="button" className="product-secondary-button" onClick={closeEditModal} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
