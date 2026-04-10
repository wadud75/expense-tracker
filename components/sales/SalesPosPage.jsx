"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import TakaIcon from "@/components/svgs/TakaIcon";

const EMPTY_MASTER_DATA = {
  seller: [],
};

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`;
}

function formatUnits(value) {
  return `${Number(value || 0)} pcs`;
}

function getProductMeta(product) {
  return [product.categoryName, product.brandName, product.variantName].filter(Boolean).join(" | ");
}

function getCartItemMeta(product) {
  return product.categoryName || "General product";
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function buildCheckoutLines(cart, profitAmount) {
  const normalizedProfitAmount = profitAmount.trim();

  if (!normalizedProfitAmount) {
    return cart.map((item) => ({
      ...item,
      saleLineTotal: item.lineTotal,
      saleUnitPrice: item.quantity > 0 ? item.lineTotal / item.quantity : item.unitPrice,
    }));
  }

  const baseSubtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const targetProfit = Math.max(Number(normalizedProfitAmount) || 0, 0);
  const targetTotal = baseSubtotal + targetProfit;
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  let remainingTotal = roundCurrency(targetTotal);

  return cart.map((item, index) => {
    const isLastItem = index === cart.length - 1;
    let saleLineTotal = 0;

    if (isLastItem) {
      saleLineTotal = remainingTotal;
    } else if (baseSubtotal > 0) {
      saleLineTotal = roundCurrency((targetTotal * item.lineTotal) / baseSubtotal);
      remainingTotal = roundCurrency(remainingTotal - saleLineTotal);
    } else if (totalUnits > 0) {
      saleLineTotal = roundCurrency((targetTotal * item.quantity) / totalUnits);
      remainingTotal = roundCurrency(remainingTotal - saleLineTotal);
    }

    return {
      ...item,
      saleLineTotal,
      saleUnitPrice: item.quantity > 0 ? saleLineTotal / item.quantity : 0,
    };
  });
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function SalesPosPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [masterData, setMasterData] = useState(EMPTY_MASTER_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [profitAmount, setProfitAmount] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("0");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadProducts() {
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load products.");
      }

      setProducts(result.products || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load products.");
    }
  }

  async function loadMasterData() {
    try {
      const response = await fetch("/api/master-data", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load checkout data.");
      }

      setMasterData({ ...EMPTY_MASTER_DATA, ...(result.items || {}) });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load checkout data.");
    }
  }

  async function loadCustomers() {
    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load customers.");
      }

      setCustomers(result.customers || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load customers.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setErrorMessage("");
      setIsLoading(true);

      try {
        await Promise.all([loadProducts(), loadMasterData(), loadCustomers()]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(products.map((product) => product.categoryName).filter(Boolean)),
    );
    return ["all", ...values];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "all" || product.categoryName === activeCategory;
      const matchesSearch =
        !normalizedSearch ||
        [product.displayName, product.productName, product.brandName, product.variantName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, searchTerm]);

  const stockByProduct = useMemo(() => {
    return cart.reduce((summary, item) => {
      summary[item.id] = item.quantity;
      return summary;
    }, {});
  }, [cart]);

  const cartSummary = useMemo(() => {
    const checkoutLines = buildCheckoutLines(cart, profitAmount);

    return checkoutLines.reduce(
      (summary, item) => {
        summary.lines += 1;
        summary.units += item.quantity;
        summary.subtotal += item.saleLineTotal;
        return summary;
      },
      { lines: 0, units: 0, subtotal: 0, checkoutLines },
    );
  }, [cart, profitAmount]);

  const paidValue = Math.max(Number(paidAmount) || 0, 0);
  const payableAmount = Math.min(paidValue, cartSummary.subtotal);
  const balance = Math.max(cartSummary.subtotal - payableAmount, 0);
  const paidDisplayValue = payableAmount.toFixed(2);

  function addToCart(product) {
    setErrorMessage("");
    setSuccessMessage("");

    if ((product.currentStock || 0) <= 0) {
      setErrorMessage("This product is out of stock.");
      return;
    }

    setCart((current) => {
      const existingItem = current.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= (product.currentStock || 0)) {
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * item.unitPrice,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          displayName: product.displayName,
          productName: product.productName,
          categoryName: product.categoryName,
          brandName: product.brandName,
          variantName: product.variantName,
          unitPrice: Number(product.unitPrice || 0),
          currentStock: Number(product.currentStock || 0),
          quantity: 1,
          lineTotal: Number(product.unitPrice || 0),
        },
      ];
    });
  }

  function updateCartQuantity(productId, nextQuantity) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const safeQuantity = Math.max(0, Math.min(nextQuantity, item.currentStock));
          if (!safeQuantity) {
            return null;
          }

          return {
            ...item,
            quantity: safeQuantity,
            lineTotal: safeQuantity * item.unitPrice,
          };
        })
        .filter(Boolean),
    );
  }

  function removeCartItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  async function handleCheckout() {
    if (!cart.length || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const subtotal = Number(cartSummary.subtotal.toFixed(2));
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerAddress,
          sellerName,
          paymentMethod,
          paidAmount: payableAmount,
          invoiceTotal: subtotal,
          warrantyMonths: Number(warrantyMonths) || 0,
          note,
          items: cartSummary.checkoutLines.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.saleUnitPrice,
            lineTotal: Number(item.saleLineTotal.toFixed(2)),
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete sale.");
      }

      const remainingStockMap = result.sales.reduce((summary, sale) => {
        summary[sale.productId] = sale.remainingStock;
        return summary;
      }, {});

      setProducts((current) =>
        current.map((product) =>
          remainingStockMap[product.id] === undefined
            ? product
            : { ...product, currentStock: remainingStockMap[product.id] }
        ),
      );
      setCart([]);
      setCustomerName("");
      setCustomerAddress("");
      setSellerName("");
      setPaymentMethod("Cash");
      setPaidAmount("");
      setProfitAmount("");
      setWarrantyMonths("0");
      setNote("");
      setSuccessMessage(`Sale completed. Invoice ${result.invoiceNo} created.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to complete sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="content-area sales-pos-page">
      <div className="sales-hero">
        <div className="sales-hero-copy">
          <span className="sales-eyebrow">POS Terminal</span>
          <h2>Sales / POS Now</h2>
          <p>
            Build the cart, keep stock visible, and complete a clean checkout without leaving
            the counter screen.
          </p>
        </div>

        <div className="sales-hero-actions">
          <button
            type="button"
            className="pill-button sales-refresh-button"
            onClick={() => {
              loadProducts();
              loadMasterData();
              loadCustomers();
            }}
          >
            <span className="sales-inline-icon">
              <RefreshIcon />
            </span>
            <span>Refresh catalog</span>
          </button>
          <Link href="/sales/list" className="pill-button sales-list-button">
            <span className="sales-inline-icon">
              <ReceiptIcon />
            </span>
            <span>Sales list</span>
          </Link>
        </div>
      </div>

      <div className="sales-summary-grid">
        <article className="sales-summary-card sales-summary-card-blue">
          <span className="sales-summary-icon">
            <BoxIcon />
          </span>
          <div>
            <span>Visible products</span>
            <strong>{filteredProducts.length}</strong>
            <p>Filtered catalog items ready to sell</p>
          </div>
        </article>
        <article className="sales-summary-card sales-summary-card-mint">
          <span className="sales-summary-icon">
            <ShoppingBagIcon />
          </span>
          <div>
            <span>Cart units</span>
            <strong>{cartSummary.units}</strong>
            <p>{cartSummary.lines} active line items in the bill</p>
          </div>
        </article>
        <article className="sales-summary-card sales-summary-card-amber">
          <span className="sales-summary-icon">
            <TakaIcon />
          </span>
          <div>
            <span>Current subtotal</span>
            <strong>{formatCurrency(cartSummary.subtotal)}</strong>
            <p>Live checkout amount before final payment</p>
          </div>
        </article>
      </div>

      {successMessage ? <p className="admin-feedback admin-feedback-success">{successMessage}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="sales-pos-layout">
        <div className="sales-catalog-shell">
          <div className="sales-catalog-toolbar">
            <label className="search-field sales-search-field">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search product, brand, or variant"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <div className="sales-chip-group">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`filter-chip${activeCategory === category ? " active" : ""}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === "all" ? "All categories" : category}
                </button>
              ))}
            </div>
          </div>

          <div className="sales-catalog-grid">
            {isLoading ? (
              <div className="sales-empty-state sales-catalog-empty-state">
                <div className="sales-empty-icon">
                  <RefreshIcon />
                </div>
                <h3>Loading catalog</h3>
                <p>Fetching the latest products and stock levels.</p>
              </div>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => {
                const cartQty = stockByProduct[product.id] || 0;
                const availableStock = Math.max((product.currentStock || 0) - cartQty, 0);

                return (
                  <article key={product.id} className="sales-product-card">
                    <div className="sales-product-top">
                      <div className="sales-product-copy">
                        <strong>{product.displayName}</strong>
                        <p>{getProductMeta(product) || "General product"}</p>
                      </div>
                      <span
                        className={`sales-stock-badge ${
                          availableStock <= 0
                            ? "sales-stock-badge-out"
                            : availableStock <= 5
                              ? "sales-stock-badge-low"
                              : "sales-stock-badge-good"
                        }`}
                      >
                        {availableStock > 0 ? `${availableStock} in stock` : "Out of stock"}
                      </span>
                    </div>

                    <div className="sales-product-bottom">
                      <div className="sales-product-pricing">
                        <span className="sales-product-price">{formatCurrency(product.unitPrice)}</span>
                        <small>{formatUnits(product.currentStock)}</small>
                      </div>
                      <button
                        type="button"
                        className="primary-button sales-add-button"
                        onClick={() => addToCart(product)}
                        disabled={!availableStock}
                      >
                        <ShoppingBagIcon />
                        <span>{cartQty ? "Add more" : "Add to cart"}</span>
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="sales-empty-state sales-catalog-empty-state">
                <div className="sales-empty-icon">
                  <SearchIcon />
                </div>
                <h3>No matching products</h3>
                <p>Try a different search or switch the selected category filter.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="sales-cart-shell">
          <div className="sales-cart-head">
            <div>
              <span className="sales-side-label">Checkout</span>
              <h3>Current bill</h3>
            </div>
            <span className="sales-cart-pill">{cartSummary.lines} lines</span>
          </div>

          <div className="sales-cart-form">
            <label className="purchase-field-stack">
              <span>Customer name</span>
              <div className="purchase-select-wrap">
                <select
                  className="purchase-input purchase-select purchase-select-input sales-select-input"
                  value={customerName}
                  onChange={(event) => {
                    const selectedName = event.target.value;
                    const selectedCustomer = customers.find((customer) => customer.name === selectedName);

                    setCustomerName(selectedName);
                    setCustomerAddress(selectedCustomer?.address || "");
                  }}
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                <span className="purchase-select-arrow" aria-hidden="true">
                  <ChevronDownIcon />
                </span>
              </div>
            </label>

            <label className="purchase-field-stack">
              <span>Customer address</span>
              <textarea
                className="purchase-textarea sales-textarea-compact"
                placeholder="Area, road, city"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
              />
            </label>

            <div className="sales-checkout-card-grid">
              <section className="sales-checkout-card">
                <div className="sales-checkout-grid sales-checkout-grid-two">
                  <label className="purchase-field-stack sales-field-stack">
                    <span>Seller name</span>
                    <div className="purchase-select-wrap">
                      <select
                        className="purchase-input purchase-select purchase-select-input sales-select-input sales-input-strong"
                        value={sellerName}
                        onChange={(event) => setSellerName(event.target.value)}
                      >
                        <option value="">Select seller</option>
                        {masterData.seller.map((option) => (
                          <option key={option.id} value={option.name}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <span className="purchase-select-arrow" aria-hidden="true">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </label>

                  <label className="purchase-field-stack sales-field-stack">
                    <span>Payment method</span>
                    <div className="purchase-select-wrap">
                      <select
                        className="purchase-input purchase-select purchase-select-input sales-select-input sales-input-strong"
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bkash">Bkash</option>
                        <option value="Card">Card</option>
                        <option value="Bank">Bank</option>
                      </select>
                      <span className="purchase-select-arrow" aria-hidden="true">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </label>

                  <label className="purchase-field-stack sales-field-stack">
                    <span>Paid amount</span>
                    <input
                      className="purchase-input sales-input-strong"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={cart.length ? cartSummary.subtotal.toFixed(2) : "0.00"}
                      value={paidAmount}
                      onChange={(event) => setPaidAmount(event.target.value)}
                    />
                  </label>

                  <label className="purchase-field-stack sales-field-stack">
                    <span>Warranty months</span>
                    <input
                      className="purchase-input sales-input-strong"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={warrantyMonths}
                      onChange={(event) => setWarrantyMonths(event.target.value)}
                    />
                  </label>

                  <label className="purchase-field-stack sales-field-stack">
                    <span>Profit</span>
                    <input
                      className="purchase-input sales-input-strong"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={profitAmount}
                      onChange={(event) => setProfitAmount(event.target.value)}
                    />
                  </label>
                </div>

                <div className="sales-checkout-metrics">
                  <div className="sales-checkout-metric">
                    <span>Sale total</span>
                    <strong>{formatCurrency(cartSummary.subtotal)}</strong>
                  </div>
                  <div className="sales-checkout-metric">
                    <span>Due</span>
                    <strong>{formatCurrency(balance)}</strong>
                  </div>
                </div>
              </section>
            </div>

            <label className="purchase-field-stack">
              <span>Sale note</span>
              <textarea
                className="purchase-textarea"
                placeholder="Optional note for the invoice"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>

          <div className="sales-cart-list">
            {cart.length ? (
              cartSummary.checkoutLines.map((item) => (
                <article key={item.id} className="sales-cart-item-card">
                  <div className="sales-cart-item-top">
                    <div className="sales-cart-item-copy">
                      <strong>{item.displayName}</strong>
                      <p>{getCartItemMeta(item)}</p>
                    </div>
                    <button
                      type="button"
                      className="sales-remove-button"
                      onClick={() => removeCartItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="sales-cart-item-meta">
                    <span>{formatCurrency(item.saleUnitPrice)} each</span>
                    <span>{item.currentStock} available</span>
                  </div>

                  <div className="sales-cart-item-bottom">
                    <div className="sales-stepper">
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>
                        +
                      </button>
                    </div>

                    <div className="sales-cart-line-total">
                      <span>Line total</span>
                      <strong>{formatCurrency(item.saleLineTotal)}</strong>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="sales-empty-state sales-empty-state-cart">
                <div className="sales-empty-icon">
                  <ShoppingBagIcon />
                </div>
                <h3>Cart is empty</h3>
                <p>Select products from the catalog to start the bill.</p>
              </div>
            )}
          </div>

          <div className="sales-cart-summary">
            <div className="sales-summary-line">
              <span>Subtotal</span>
              <strong>{formatCurrency(cartSummary.subtotal)}</strong>
            </div>
            <div className="sales-summary-line">
              <span>Paid</span>
              <strong>{formatCurrency(paidDisplayValue)}</strong>
            </div>
            <div className="sales-summary-line">
              <span>Remaining due</span>
              <strong>{formatCurrency(balance)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="primary-button sales-checkout-button"
            onClick={handleCheckout}
            disabled={!cart.length || isSubmitting}
          >
            <ReceiptIcon />
            <span>{isSubmitting ? "Processing sale..." : "Complete checkout"}</span>
          </button>
        </aside>
      </div>
    </section>
  );
}















