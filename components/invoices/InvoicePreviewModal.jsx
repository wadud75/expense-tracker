"use client";

import { downloadInvoicePdf, printInvoice } from "@/lib/invoicePrint";

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(0)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

export default function InvoicePreviewModal({ invoice, onClose, onError }) {
  if (!invoice) {
    return null;
  }

  function handleDownload() {
    try {
      downloadInvoicePdf(invoice);
    } catch (error) {
      onError?.(error.message || "Failed to download the invoice PDF.");
    }
  }

  function handlePrint() {
    try {
      printInvoice(invoice);
    } catch (error) {
      onError?.(error.message || "Failed to open the print dialog.");
    }
  }

  return (
    <div className="invoice-modal-overlay" role="dialog" aria-modal="true" aria-label="Invoice preview">
      <div className="invoice-modal-card">
        <div className="invoice-modal-toolbar">
          <div>
            <span className="invoice-kicker">{invoice.title || "Invoice"}</span>
            <h3>{invoice.heading || "Transaction invoice"}</h3>
            <p>{invoice.invoiceNo || "-"}</p>
          </div>
          <div className="invoice-toolbar-actions">
            <button type="button" className="outline-button invoice-toolbar-button" onClick={handleDownload}>
              Download PDF
            </button>
            <button type="button" className="outline-button invoice-toolbar-button" onClick={handlePrint}>
              Print
            </button>
            <button type="button" className="outline-button invoice-toolbar-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="invoice-sheet">
          <div className="invoice-sheet-head">
            <div>
              <span className="invoice-kicker">{invoice.title || "Invoice"}</span>
              <h2>{invoice.heading || "Transaction invoice"}</h2>
              <p>{invoice.subheading || "Printable invoice preview"}</p>
            </div>
            <div className="invoice-sheet-number">
              <span>Invoice No</span>
              <strong>{invoice.invoiceNo || "-"}</strong>
              <p>{formatDate(invoice.issuedAt)}</p>
            </div>
          </div>

          <div className="invoice-meta-grid">
            {(invoice.meta || [])
              .filter((item) => item?.value)
              .map((item) => (
                <article key={`${item.label}-${item.value}`} className="invoice-meta-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
          </div>

          <div className="invoice-line-items">
            <div className="invoice-line-head">
              <span>#</span>
              <span>Item</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
            </div>

            {(invoice.items || []).map((item, index) => (
              <div key={`${item.name}-${index}`} className="invoice-line-row">
                <span>{index + 1}</span>
                <div>
                  <strong>{item.name || "-"}</strong>
                  <p>{item.description || "No extra description"}</p>
                </div>
                <span>{item.quantity}</span>
                <span>{formatCurrency(item.unitPrice)}</span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="invoice-summary-grid">
            <article className="invoice-summary-card">
              <span>Total Amount</span>
              <strong>{formatCurrency(invoice.totalAmount)}</strong>
            </article>
            <article className="invoice-summary-card">
              <span>Paid Amount</span>
              <strong>{formatCurrency(invoice.paidAmount)}</strong>
            </article>
            <article className="invoice-summary-card">
              <span>Due Amount</span>
              <strong>{formatCurrency(invoice.dueAmount)}</strong>
            </article>
          </div>

          {invoice.note ? (
            <section className="invoice-note-card">
              <span className="invoice-kicker">Note</span>
              <p>{invoice.note}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
