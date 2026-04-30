"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import TakaIcon from "@/components/svgs/TakaIcon";

const EMPTY_MASTER_DATA = {
  seller: [],
  bank: [],
};

const DEFAULT_PAYMENT_ACCOUNT = "Cash";
const EMPTY_SELLER_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  role: "sales executive",
  salary: "",
  status: "active",
  notes: "",
};
const EMPTY_CUSTOMER_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  segment: "retail",
  status: "active",
  notes: "",
};

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(0)}`;
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

function getSellerOptionLabel(seller) {
  if (!seller) {
    return "";
  }

  return seller.role ? `${seller.name} - ${seller.role}` : seller.name;
}

function roundCurrency(value) {
  return Math.round(Number(value) || 0);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function hasExactNameMatch(options, value) {
  const normalizedValue = normalizeText(value);
  return options.some((option) => normalizeText(option.name) === normalizedValue);
}

function getProductOptionLabel(product) {
  return product?.displayName || product?.productName || "";
}

function findByName(options, value, getLabel = (option) => option.name) {
  const normalizedValue = normalizeText(value);
  return options.find((option) => normalizeText(getLabel(option)) === normalizedValue) || null;
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

function SearchableDropdownField({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  actionLabel,
  onAction,
  actionDisabled = false,
  hint = "",
  getOptionLabel = (option) => option.name,
  onSelect,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = normalizeText(value);
  const filteredOptions = options.filter((option) => getOptionLabel(option).toLowerCase().includes(normalizedValue));
  const shouldShowOptions = isOpen && filteredOptions.length > 0;
  const canShowAction = Boolean(actionLabel && onAction);

  return (
    <label className="purchase-field-stack sales-field-stack">
      <span>{label}</span>
      <div className="sales-inline-field-row">
        <div className="purchase-master-field">
          <input
            className="purchase-input purchase-select-input sales-input-strong"
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 120);
            }}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Enter" && canShowAction && !actionDisabled) {
                event.preventDefault();
                onAction?.();
              }
            }}
          />
          <span className="purchase-select-arrow" aria-hidden="true">
            <ChevronDownIcon />
          </span>
          {shouldShowOptions ? (
            <div className="purchase-master-options">
              {filteredOptions.slice(0, 20).map((option) => (
                <button
                  key={option.id || getOptionLabel(option)}
                  type="button"
                  className="purchase-master-option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const nextValue = getOptionLabel(option);
                    onValueChange(nextValue);
                    onSelect?.(option);
                    setIsOpen(false);
                  }}
                >
                  {getOptionLabel(option)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {canShowAction ? (
          <button type="button" className="purchase-ghost-button sales-inline-action" onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {hint ? <small className="sales-field-hint">{hint}</small> : null}
    </label>
  );
}

export default function SalesPosPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [masterData, setMasterData] = useState(EMPTY_MASTER_DATA);
  const [cart, setCart] = useState([]);
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [paymentAccount, setPaymentAccount] = useState(DEFAULT_PAYMENT_ACCOUNT);
  const [paidAmount, setPaidAmount] = useState("");
  const [profitAmount, setProfitAmount] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("0");
  const [note, setNote] = useState("");
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [sellerForm, setSellerForm] = useState(EMPTY_SELLER_FORM);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingSeller, setIsSavingSeller] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
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
  const paidDisplayValue = payableAmount.toFixed(0);
  const hasSellers = masterData.seller.length > 0;
  const selectedProduct = useMemo(() => findByName(products, productName, getProductOptionLabel), [productName, products]);
  const customerExists = useMemo(
    () => customers.some((customer) => normalizeText(customer.name) === normalizeText(customerName)),
    [customerName, customers],
  );
  const sellerExists = useMemo(
    () => masterData.seller.some((seller) => normalizeText(seller.name) === normalizeText(sellerName)),
    [masterData.seller, sellerName],
  );
  const paymentAccounts = useMemo(() => {
    const accounts = [{ id: DEFAULT_PAYMENT_ACCOUNT, name: DEFAULT_PAYMENT_ACCOUNT }];
    const banks = Array.isArray(masterData.bank) ? masterData.bank : [];

    banks.forEach((bank) => {
      if (!accounts.some((entry) => normalizeText(entry.name) === normalizeText(bank.name))) {
        accounts.push({ id: bank.id, name: bank.name });
      }
    });

    return accounts;
  }, [masterData.bank]);

  function applyCustomerSelection(nextName) {
    const selectedCustomer = findByName(customers, nextName);
    setCustomerName(nextName);

    if (selectedCustomer) {
      return;
    }
  }

  function handleProductSelection(option) {
    const quantity = Math.max(Number(productQuantity) || 0, 0);

    if (!option) {
      return;
    }

    setProductName(getProductOptionLabel(option));

    if (quantity <= 0) {
      setErrorMessage("Product quantity must be greater than zero.");
      return;
    }

    for (let index = 0; index < quantity; index += 1) {
      addToCart(option);
    }

    setProductName("");
    setProductQuantity("1");
  }

  async function handleAddCustomer() {
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setCustomerForm({
      ...EMPTY_CUSTOMER_FORM,
      name: trimmedName,
    });
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    if (isSavingCustomer) {
      return;
    }

    setIsCustomerModalOpen(false);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
  }

  async function handleCustomerFormSubmit(event) {
    event.preventDefault();

    if (isSavingCustomer) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingCustomer(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add customer.");
      }

      setCustomers((current) => [...current, result.customer].sort((left, right) => left.name.localeCompare(right.name)));
      applyCustomerSelection(result.customer.name);
      setIsCustomerModalOpen(false);
      setCustomerForm(EMPTY_CUSTOMER_FORM);
      setSuccessMessage(`${result.customer.name} added to customers.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to add customer.");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleAddSeller() {
    const trimmedName = sellerName.trim();
    if (!trimmedName) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSellerForm((current) => ({
      ...EMPTY_SELLER_FORM,
      ...current,
      name: trimmedName,
    }));
    setIsSellerModalOpen(true);
  }

  function closeSellerModal() {
    if (isSavingSeller) {
      return;
    }

    setIsSellerModalOpen(false);
    setSellerForm(EMPTY_SELLER_FORM);
  }

  async function handleSellerFormSubmit(event) {
    event.preventDefault();

    if (isSavingSeller) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingSeller(true);

    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "seller", ...sellerForm }),
      });
      const result = await response.json();

      let savedSeller = null;
      if (!response.ok) {
        if (response.status === 409 && result.item) {
          savedSeller = result.item;
        } else {
          throw new Error(result.error || "Failed to add seller.");
        }
      } else {
        savedSeller = result.item;
      }

      if (!savedSeller) {
        throw new Error("Failed to add seller.");
      }

      setMasterData((current) => {
        const nextSellers = [...(current.seller || [])];
        if (!nextSellers.some((seller) => seller.id === savedSeller.id)) {
          nextSellers.push(savedSeller);
        }

        return {
          ...current,
          seller: nextSellers.sort((left, right) => left.name.localeCompare(right.name)),
        };
      });
      setSellerName(savedSeller.name);
      setIsSellerModalOpen(false);
      setSellerForm(EMPTY_SELLER_FORM);
      setSuccessMessage(`${savedSeller.name} added to sellers.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to add seller.");
    } finally {
      setIsSavingSeller(false);
    }
  }

  async function handleAddBank() {
    const trimmedName = paymentAccount.trim();
    if (!trimmedName || isSavingBank) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingBank(true);

    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bank",
          name: trimmedName,
        }),
      });
      const result = await response.json();

      let savedBank = null;
      if (!response.ok) {
        if (response.status === 409 && result.item) {
          savedBank = result.item;
        } else {
          throw new Error(result.error || "Failed to add bank.");
        }
      } else {
        savedBank = result.item;
      }

      if (!savedBank) {
        throw new Error("Failed to add bank.");
      }

      setMasterData((current) => {
        const nextBanks = [...(current.bank || [])];
        if (!nextBanks.some((bank) => bank.id === savedBank.id)) {
          nextBanks.push(savedBank);
        }

        return {
          ...current,
          bank: nextBanks.sort((left, right) => left.name.localeCompare(right.name)),
        };
      });
      setPaymentAccount(savedBank.name);
      setSuccessMessage(`${savedBank.name} added to banks.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to add bank.");
    } finally {
      setIsSavingBank(false);
    }
  }

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
      const subtotal = Math.round(cartSummary.subtotal);
      const trimmedPaymentAccount = paymentAccount.trim() || DEFAULT_PAYMENT_ACCOUNT;

      if (payableAmount > 0 && !trimmedPaymentAccount) {
        throw new Error("Select where the payment should be received.");
      }

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          sellerName,
          paymentMethod: "Cash",
          paymentAccount: trimmedPaymentAccount,
          paidAmount: payableAmount,
          invoiceTotal: subtotal,
          warrantyMonths: Number(warrantyMonths) || 0,
          note,
          items: cartSummary.checkoutLines.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.saleUnitPrice,
            lineTotal: Math.round(item.saleLineTotal),
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
      setSellerName("");
      setPaymentAccount(DEFAULT_PAYMENT_ACCOUNT);
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
            <span>Available products</span>
            <strong>{products.length}</strong>
            <p>Products ready to add from checkout</p>
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
        <section className="sales-cart-shell sales-cart-shell-wide">
          <div className="sales-cart-head">
            <div>
              <span className="sales-side-label">Checkout</span>
            </div>
            <span className="sales-cart-pill">{cartSummary.lines} lines</span>
          </div>

          <div className="sales-checkout-content">
            <div className="sales-cart-form">
              <div className="sales-checkout-card-grid">
                <section className="sales-checkout-card">
                  <div className="sales-product-picker-row">
                    <SearchableDropdownField
                      label="Product"
                      value={productName}
                      onValueChange={setProductName}
                      options={products}
                      placeholder={isLoading ? "Loading products..." : "Type to search product"}
                      getOptionLabel={getProductOptionLabel}
                      onSelect={handleProductSelection}
                    />
                    <label className="purchase-field-stack sales-field-stack sales-product-qty-field">
                      <span>Qty</span>
                      <input
                        className="purchase-input sales-input-strong"
                        type="number"
                        min="1"
                        step="1"
                        value={productQuantity}
                        onChange={(event) => setProductQuantity(event.target.value)}
                      />
                    </label>
                  </div>

                  {selectedProduct ? (
                    <div className="sales-product-selected-meta">
                      <span>{getProductMeta(selectedProduct) || "General product"}</span>
                      <strong>
                        {formatCurrency(selectedProduct.unitPrice)} | {formatUnits(Math.max((selectedProduct.currentStock || 0) - (stockByProduct[selectedProduct.id] || 0), 0))}
                      </strong>
                    </div>
                  ) : null}

                  <div className="sales-checkout-grid sales-checkout-grid-two">
                    <SearchableDropdownField
                      label="Customer name"
                      value={customerName}
                      onValueChange={applyCustomerSelection}
                      options={customers}
                      placeholder="Walk-in customer or select saved customer"
                      actionLabel={!customerExists && customerName.trim() ? (isSavingCustomer ? "Saving..." : "Add customer") : ""}
                      onAction={handleAddCustomer}
                      actionDisabled={isSavingCustomer}
                      onSelect={(option) => applyCustomerSelection(option.name)}
                    />

                    <SearchableDropdownField
                      label="Seller name"
                      value={sellerName}
                      onValueChange={setSellerName}
                      options={masterData.seller}
                      getOptionLabel={(option) => option.name}
                      placeholder={hasSellers ? "Type or select seller" : "Type seller name"}
                      actionLabel={!sellerExists && sellerName.trim() ? (isSavingSeller ? "Saving..." : "Add seller") : ""}
                      onAction={handleAddSeller}
                      actionDisabled={isSavingSeller}
                      onSelect={(option) => setSellerName(option.name)}
                    />

                    <SearchableDropdownField
                      label="Receive to"
                      value={paymentAccount}
                      onValueChange={setPaymentAccount}
                      options={paymentAccounts}
                      placeholder="Cash or select bank"
                      actionLabel={
                        !paymentAccounts.some((account) => normalizeText(account.name) === normalizeText(paymentAccount)) &&
                        paymentAccount.trim()
                          ? isSavingBank
                            ? "Saving..."
                            : "Add bank"
                          : ""
                      }
                      onAction={handleAddBank}
                      actionDisabled={isSavingBank}
                      getOptionLabel={(option) => option.name}
                      onSelect={(option) => setPaymentAccount(option.name)}
                    />

                    <label className="purchase-field-stack sales-field-stack">
                      <span>Paid amount</span>
                      <input
                        className="purchase-input sales-input-strong"
                        type="number"
                        min="0"
                        step="1"
                        placeholder={cart.length ? cartSummary.subtotal.toFixed(0) : "0"}
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
                        step="1"
                        placeholder="0"
                        value={profitAmount}
                        onChange={(event) => setProfitAmount(event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="purchase-field-stack sales-field-stack">
                    <span>Sale note</span>
                    <textarea
                      className="purchase-textarea"
                      placeholder="Optional note for the invoice"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                  <div className="sales-cart-list sales-cart-list-inline">
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
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
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
        </section>
      </div>

      {isSellerModalOpen ? (
        <div className="route-modal-overlay" onClick={closeSellerModal}>
          <div className="route-modal-shell seller-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header seller-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="seller-pro-panel-label">Seller profile</span>
                    <h1>Add seller</h1>
                    <p>Create a seller here and use it immediately in checkout.</p>
                  </div>
                </div>
                <button type="button" className="outline-button seller-modal-close" onClick={closeSellerModal} disabled={isSavingSeller}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <form className="seller-pro-form" onSubmit={handleSellerFormSubmit}>
                    <div className="seller-pro-form-grid">
                      <label className="purchase-field-stack">
                        <span>Seller name</span>
                        <input className="purchase-input" type="text" value={sellerForm.name} onChange={(event) => setSellerForm((current) => ({ ...current, name: event.target.value }))} required />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Email</span>
                        <input className="purchase-input" type="email" value={sellerForm.email} onChange={(event) => setSellerForm((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Phone</span>
                        <input className="purchase-input" type="text" value={sellerForm.phone} onChange={(event) => setSellerForm((current) => ({ ...current, phone: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Role</span>
                        <select className="purchase-input" value={sellerForm.role} onChange={(event) => setSellerForm((current) => ({ ...current, role: event.target.value }))}>
                          <option value="sales executive">Sales Executive</option>
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                          <option value="support">Support</option>
                          <option value="owner">Owner</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack">
                        <span>Salary</span>
                        <input className="purchase-input" type="number" min="0" step="1" value={sellerForm.salary} onChange={(event) => setSellerForm((current) => ({ ...current, salary: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Status</span>
                        <select className="purchase-input" value={sellerForm.status} onChange={(event) => setSellerForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on-leave">On leave</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack seller-pro-form-span-two">
                        <span>Address</span>
                        <input className="purchase-input" type="text" value={sellerForm.address} onChange={(event) => setSellerForm((current) => ({ ...current, address: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack seller-pro-form-span-two">
                        <span>Notes</span>
                        <textarea className="purchase-textarea" value={sellerForm.notes} onChange={(event) => setSellerForm((current) => ({ ...current, notes: event.target.value }))} />
                      </label>
                    </div>

                    <div className="seller-pro-action-row">
                      <button type="button" className="outline-button" onClick={closeSellerModal} disabled={isSavingSeller}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-button" disabled={isSavingSeller}>
                        {isSavingSeller ? "Saving..." : "Save seller"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomerModalOpen ? (
        <div className="route-modal-overlay" onClick={closeCustomerModal}>
          <div className="route-modal-shell customer-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header customer-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="customer-pro-panel-label">Customer profile</span>
                    <h1>Add customer</h1>
                    <p>Create a customer here and use it immediately in checkout.</p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closeCustomerModal} disabled={isSavingCustomer}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <form className="customer-pro-form" onSubmit={handleCustomerFormSubmit}>
                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Customer name</span>
                        <input className="purchase-input" type="text" placeholder="Full customer name" value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} required />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Phone number</span>
                        <input className="purchase-input" type="text" placeholder="+8801XXXXXXXXX" value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} required />
                      </label>
                    </div>

                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Email address</span>
                        <input className="purchase-input" type="email" placeholder="customer@example.com" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Address</span>
                        <input className="purchase-input" type="text" placeholder="House, road, area, city" value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} />
                      </label>
                    </div>

                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Segment</span>
                        <select className="purchase-input" value={customerForm.segment} onChange={(event) => setCustomerForm((current) => ({ ...current, segment: event.target.value }))}>
                          <option value="retail">Retail</option>
                          <option value="wholesale">Wholesale</option>
                          <option value="corporate">Corporate</option>
                          <option value="service">Service</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack">
                        <span>Status</span>
                        <select className="purchase-input" value={customerForm.status} onChange={(event) => setCustomerForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="active">Active</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>

                    <label className="purchase-field-stack">
                      <span>Internal note</span>
                      <textarea className="purchase-textarea" placeholder="Preferred products, relationship notes, payment behavior, or follow-up context" value={customerForm.notes} onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))} />
                    </label>

                    <div className="customer-pro-action-row">
                      <button type="submit" className="primary-button" disabled={isSavingCustomer}>
                        <span>{isSavingCustomer ? "Saving..." : "Save customer"}</span>
                      </button>
                      <button type="button" className="outline-button" onClick={closeCustomerModal} disabled={isSavingCustomer}>Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}















