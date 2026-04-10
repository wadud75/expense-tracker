"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InvoicePreviewModal from "@/components/invoices/InvoicePreviewModal";
import { downloadInvoicePdf } from "@/lib/invoicePrint";
import BoxIcon from "@/components/svgs/BoxIcon";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import TakaIcon from "@/components/svgs/TakaIcon";

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function parseDateInput(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSaleDue(sale) {
  return Math.max((Number(sale.invoiceTotal) || 0) - (Number(sale.paidAmount) || 0), 0);
}

function buildSalesInvoice(group) {
  const lines = group.sales || [];
  const firstSale = lines[0] || {};

  return {
    title: "Sales Invoice",
    heading: "Customer sales invoice",
    subheading: "Checkout invoice with sold items and payment summary.",
    invoiceNo: group.invoiceNo,
    issuedAt: firstSale.createdAt,
    totalAmount: Number(firstSale.invoiceTotal) || 0,
    paidAmount: Number(firstSale.paidAmount) || 0,
    dueAmount: getSaleDue(firstSale),
    note: firstSale.note || "",
    meta: [
      { label: "Customer", value: firstSale.customerName || "Walk-in customer" },
      { label: "Address", value: firstSale.customerAddress || "-" },
      { label: "Seller", value: firstSale.sellerName || "-" },
      { label: "Payment Method", value: firstSale.paymentMethod || "Cash" },
      {
        label: "Warranty",
        value: `${Number(firstSale.warrantyMonths || 0)} month${Number(firstSale.warrantyMonths || 0) === 1 ? "" : "s"}`,
      },
      { label: "Date", value: formatDate(firstSale.createdAt) },
    ],
    items: lines.map((sale) => ({
      name: sale.productName || "-",
      description: sale.note || "POS sale item",
      quantity: Number(sale.quantity) || 0,
      unitPrice: Number(sale.unitPrice) || 0,
      lineTotal: Number(sale.lineTotal) || 0,
    })),
  };
}

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSales() {
      try {
        const response = await fetch("/api/sales", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load sales.");
        }

        if (isMounted) {
          setSales(result.sales || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load sales.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSales();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate, true);

    return sales.filter((sale) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          sale.invoiceNo,
          sale.customerName,
          sale.customerAddress,
          sale.sellerName,
          sale.productName,
          sale.paymentMethod,
          sale.note,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) {
        return false;
      }

      const createdAt = new Date(sale.createdAt);
      const timestamp = createdAt.getTime();
      if (Number.isNaN(timestamp)) {
        return false;
      }

      if (start && timestamp < start.getTime()) {
        return false;
      }

      if (end && timestamp > end.getTime()) {
        return false;
      }

      return true;
    });
  }, [endDate, sales, searchTerm, startDate]);

  const salesInvoiceMap = useMemo(() => {
    return sales.reduce((summary, sale) => {
      const key = sale.invoiceNo || sale.id;
      if (!summary[key]) {
        summary[key] = { invoiceNo: key, sales: [] };
      }

      summary[key].sales.push(sale);
      return summary;
    }, {});
  }, [sales]);

  const summary = useMemo(() => {
    const invoices = new Set(filteredSales.map((sale) => sale.invoiceNo).filter(Boolean));

    return filteredSales.reduce(
      (result, sale) => {
        result.invoices = invoices.size;
        result.units += Number(sale.quantity || 0);
        result.amount += Number(sale.lineTotal || 0);
        return result;
      },
      { invoices: invoices.size, units: 0, amount: 0 },
    );
  }, [filteredSales]);

  return (
    <section className="content-area sales-list-page">
      <div className="sales-hero sales-hero-list">
        <div className="sales-hero-copy">
          <span className="sales-eyebrow">Sales Register</span>
          <h2>Sales list</h2>
          <p>
            Review the full sales register including checkout details like seller, customer address,
            paid amount, due amount, and notes.
          </p>
        </div>

        <div className="sales-hero-actions">
          <Link href="/sales" className="pill-button sales-list-button">
            <span className="sales-inline-icon">
              <ShoppingBagIcon />
            </span>
            <span>Open POS</span>
          </Link>
        </div>
      </div>

      <div className="sales-summary-grid">
        <article className="sales-summary-card sales-summary-card-blue">
          <span className="sales-summary-icon">
            <ReceiptIcon />
          </span>
          <div>
            <span>Invoices</span>
            <strong>{summary.invoices}</strong>
            <p>Distinct invoice numbers in the filtered result</p>
          </div>
        </article>
        <article className="sales-summary-card sales-summary-card-mint">
          <span className="sales-summary-icon">
            <BoxIcon />
          </span>
          <div>
            <span>Units sold</span>
            <strong>{summary.units}</strong>
            <p>Total quantities sold across matched rows</p>
          </div>
        </article>
        <article className="sales-summary-card sales-summary-card-amber">
          <span className="sales-summary-icon">
            <TakaIcon />
          </span>
          <div>
            <span>Revenue</span>
            <strong>{formatCurrency(summary.amount)}</strong>
            <p>Gross line total from the current filtered register</p>
          </div>
        </article>
      </div>

      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="sales-list-panel">
        <div className="sales-list-toolbar">
          <label className="search-field sales-search-field">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search invoice, customer, seller, product, payment, or note"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="date-row sales-date-row">
            <label className="date-input">
              <CalendarIcon />
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="date-input">
              <CalendarIcon />
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="sales-register-card sales-register-card-horizontal">
          <div className="sales-register-head sales-register-head-split">
            <span>Date</span>
            <span>Invoice</span>
            <span>Customer</span>
            <span>Address</span>
            <span>Seller</span>
            <span>Product</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Line Total</span>
            <span>Paid</span>
            <span>Due</span>
            <span>Payment</span>
            <span>Note</span>
            <span>Action</span>
          </div>

          {isLoading ? (
            <div className="table-empty">Loading sales...</div>
          ) : filteredSales.length ? (
            filteredSales.map((sale) => (
              <div key={sale.id} className="sales-register-row sales-register-row-split">
                <span>{formatDate(sale.createdAt)}</span>
                <span>{sale.invoiceNo || "-"}</span>
                <span>{sale.customerName || "Walk-in customer"}</span>
                <span className="sales-register-text">{sale.customerAddress || "No address provided"}</span>
                <span>{sale.sellerName || "No seller assigned"}</span>
                <span className="sales-register-text sales-register-product">{sale.productName}</span>
                <span>{sale.quantity}</span>
                <span>{formatCurrency(sale.unitPrice)}</span>
                <span>{formatCurrency(sale.lineTotal)}</span>
                <span>{formatCurrency(sale.paidAmount)}</span>
                <span>{formatCurrency(getSaleDue(sale))}</span>
                <span>{sale.paymentMethod || "Cash"}</span>
                <span className="sales-register-text">{sale.note || "No note added"}</span>
                <span className="sales-action-group">
                  <button
                    type="button"
                    className="sales-action-button sales-action-button-preview"
                    onClick={() =>
                      setSelectedInvoice(buildSalesInvoice(salesInvoiceMap[sale.invoiceNo || sale.id]))
                    }
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="sales-action-button sales-action-button-download"
                    onClick={() => {
                      try {
                        downloadInvoicePdf(buildSalesInvoice(salesInvoiceMap[sale.invoiceNo || sale.id]));
                      } catch (error) {
                        setErrorMessage(error.message || "Failed to download the invoice PDF.");
                      }
                    }}
                  >
                    Download
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="table-empty">No sales found for the current filters.</div>
          )}
        </div>

        {!isLoading && filteredSales.length ? (
          <div className="sales-register-mobile">
            {filteredSales.map((sale) => (
              <article key={sale.id} className="sales-mobile-card">
                <div className="sales-mobile-head">
                  <div>
                    <strong>{sale.productName}</strong>
                    <p>{sale.customerName || "Walk-in customer"}</p>
                  </div>
                  <span className="sales-mobile-amount">{formatCurrency(sale.lineTotal)}</span>
                </div>

                <div className="sales-mobile-grid">
                  <div>
                    <span>Date</span>
                    <strong>{formatDate(sale.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Invoice</span>
                    <strong>{sale.invoiceNo || "-"}</strong>
                  </div>
                  <div>
                    <span>Seller</span>
                    <strong>{sale.sellerName || "-"}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>{sale.customerAddress || "-"}</strong>
                  </div>
                  <div>
                    <span>Qty</span>
                    <strong>{sale.quantity}</strong>
                  </div>
                  <div>
                    <span>Unit price</span>
                    <strong>{formatCurrency(sale.unitPrice)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong>{formatCurrency(sale.paidAmount)}</strong>
                  </div>
                  <div>
                    <span>Due</span>
                    <strong>{formatCurrency(getSaleDue(sale))}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>{sale.paymentMethod || "Cash"}</strong>
                  </div>
                  <div>
                    <span>Note</span>
                    <strong>{sale.note || "-"}</strong>
                  </div>
                </div>
                <div className="sales-action-group sales-mobile-action-row">
                  <button
                    type="button"
                    className="sales-action-button sales-action-button-preview sales-mobile-action"
                    onClick={() =>
                      setSelectedInvoice(buildSalesInvoice(salesInvoiceMap[sale.invoiceNo || sale.id]))
                    }
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="sales-action-button sales-action-button-download sales-mobile-action-secondary"
                    onClick={() => {
                      try {
                        downloadInvoicePdf(buildSalesInvoice(salesInvoiceMap[sale.invoiceNo || sale.id]));
                      } catch (error) {
                        setErrorMessage(error.message || "Failed to download the invoice PDF.");
                      }
                    }}
                  >
                    Download
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

      <InvoicePreviewModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onError={setErrorMessage}
      />
      </div>
    </section>
  );
}
