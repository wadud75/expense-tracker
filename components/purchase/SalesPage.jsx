"use client";

import { useEffect, useMemo, useState } from "react";
import SearchIcon from "@/components/svgs/SearchIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const salesCopy = {
  en: {
    searchPlaceholder: "Search product...",
    cartTitle: "Cart",
    cartEmpty: "Cart is empty",
    stock: "Stock",
    subtotal: "Subtotal",
    total: "Total",
    sellNow: "Sell Now",
    noProducts: "No products available",
  },
  bn: {
    searchPlaceholder: "???? ??????...",
    cartTitle: "?????",
    cartEmpty: "????? ????",
    stock: "????",
    subtotal: "????????",
    total: "???",
    sellNow: "??? ?????? ????",
    noProducts: "???? ???? ????? ?????",
  },
};

export default function SalesPage() {
  const { language } = usePurchaseLanguage();
  const copy = salesCopy[language] || salesCopy.en;
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load products.");
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter((product) =>
      [product.displayName, product.categoryName, product.brandName, product.variantName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [products, searchTerm]);

  const selectedQty = Math.max(Number(quantity) || 1, 1);
  const subtotal = (selectedProduct?.unitPrice || 0) * selectedQty;

  async function handleSell() {
    if (!selectedProduct) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: selectedQty,
          unitPrice: selectedProduct.unitPrice,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save sale.");
      }

      const remainingStock = result.sale.remainingStock;
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id ? { ...product, currentStock: remainingStock } : product,
        ),
      );
      setSelectedProduct((current) => (current ? { ...current, currentStock: remainingStock } : current));
      setQuantity(1);
      setMessage("Sale completed.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save sale.");
    }
  }

  return (
    <section className="content-area sales-layout">
      <div className="sales-catalog-panel">
        {message ? <p className="admin-feedback admin-feedback-success">{message}</p> : null}
        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

        <div className="sales-toolbar">
          <label className="sales-search-field">
            <SearchIcon />
            <input type="text" placeholder={copy.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
        </div>

        <div className="sales-product-stage">
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`sales-product-card ${selectedProduct?.id === product.id ? "sales-product-card-active" : ""}`}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="sales-product-image">{product.productName?.slice(0, 2) || "P"}</div>
                <div className="sales-product-copy">
                  <strong>{product.displayName}</strong>
                  <span>?{Number(product.unitPrice || 0).toFixed(2)}</span>
                </div>
                <small>{copy.stock}: {product.currentStock || 0}</small>
              </button>
            ))
          ) : (
            <div className="sales-cart-empty-state">
              <span className="sales-cart-empty-icon">
                <ShoppingBagIcon />
              </span>
              <p>{copy.noProducts}</p>
            </div>
          )}
        </div>
      </div>

      <aside className="sales-cart-panel">
        <div className="sales-cart-header">
          <div className="sales-cart-title-row">
            <span className="sales-cart-icon">
              <ShoppingBagIcon />
            </span>
            <h2>{copy.cartTitle}</h2>
          </div>
        </div>

        <div className="sales-cart-body">
          {selectedProduct ? (
            <div className="sales-cart-item">
              <div>
                <strong>{selectedProduct.displayName}</strong>
                <div className="sales-cart-price-row">
                  <span>?</span>
                  <input type="text" value={Number(selectedProduct.unitPrice || 0).toFixed(2)} readOnly />
                  <small>x {selectedQty}</small>
                </div>
              </div>
              <div className="sales-cart-controls">
                <button type="button" onClick={() => setQuantity((current) => Math.max(current - 1, 1))}>-</button>
                <span>{selectedQty}</span>
                <button type="button" onClick={() => setQuantity((current) => current + 1)} disabled={selectedQty >= (selectedProduct.currentStock || 0)}>+</button>
                <button type="button" onClick={() => setSelectedProduct(null)}>x</button>
              </div>
              <strong className="sales-cart-line-total">?{subtotal.toFixed(2)}</strong>
            </div>
          ) : (
            <div className="sales-cart-empty-state">
              <span className="sales-cart-empty-icon">
                <ShoppingBagIcon />
              </span>
              <p>{copy.cartEmpty}</p>
            </div>
          )}
        </div>

        <div className="sales-cart-summary">
          <div className="sales-summary-row">
            <span>{copy.subtotal}</span>
            <strong>?{subtotal.toFixed(2)}</strong>
          </div>
          <div className="sales-summary-total">
            <span>{copy.total}</span>
            <strong>?{subtotal.toFixed(2)}</strong>
          </div>
        </div>

        <button type="button" className={`sales-submit-button ${!selectedProduct ? "sales-submit-disabled" : ""}`} onClick={handleSell} disabled={!selectedProduct}>
          <ShoppingBagIcon />
          <span>{copy.sellNow}</span>
        </button>
      </aside>
    </section>
  );
}

