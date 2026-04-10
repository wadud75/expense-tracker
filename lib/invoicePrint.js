import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function getFileName(invoice) {
  return `${invoice.invoiceNo || "invoice"}.pdf`;
}

export function buildInvoicePrintHtml(invoice) {
  const rows = (invoice.items || [])
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.name || "-")}</strong>
            <div class="line-meta">${escapeHtml(item.description || "")}</div>
          </td>
          <td>${escapeHtml(item.quantity ?? "-")}</td>
          <td>${escapeHtml(formatCurrency(item.unitPrice))}</td>
          <td>${escapeHtml(formatCurrency(item.lineTotal))}</td>
        </tr>`,
    )
    .join("");

  const metaRows = (invoice.meta || [])
    .filter((item) => item?.value)
    .map(
      (item) => `
        <div class="meta-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceNo || "Invoice")}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        color: #172033;
        background: #eef4fb;
        font-family: "Segoe UI", sans-serif;
      }
      .sheet {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px;
        background: #fff;
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 24px;
      }
      .eyebrow {
        display: inline-block;
        padding: 6px 10px;
        color: #0f766e;
        background: #dff7f2;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      h1 {
        margin: 14px 0 8px;
        font-size: 32px;
      }
      p {
        margin: 0;
        color: #51627f;
        line-height: 1.6;
      }
      .invoice-no {
        text-align: right;
      }
      .invoice-no strong {
        display: block;
        font-size: 18px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin: 28px 0;
      }
      .meta-card, .summary-card {
        padding: 16px;
        background: #f8fbff;
        border: 1px solid #d9e5f3;
        border-radius: 18px;
      }
      .meta-card span, .summary-card span {
        display: block;
        color: #64748b;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .meta-card strong, .summary-card strong {
        display: block;
        margin-top: 8px;
        font-size: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      th, td {
        padding: 14px 12px;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #475569;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .line-meta {
        margin-top: 6px;
        color: #64748b;
        font-size: 13px;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 24px;
      }
      .note {
        margin-top: 24px;
        padding: 18px;
        background: #f8fbff;
        border: 1px solid #d9e5f3;
        border-radius: 18px;
      }
      @media print {
        body {
          padding: 0;
          background: #fff;
        }
        .sheet {
          box-shadow: none;
          border-radius: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="topbar">
        <div>
          <span class="eyebrow">${escapeHtml(invoice.title || "Invoice")}</span>
          <h1>${escapeHtml(invoice.heading || "Transaction Invoice")}</h1>
          <p>${escapeHtml(invoice.subheading || "Transaction record")}</p>
        </div>
        <div class="invoice-no">
          <span class="eyebrow">Invoice No</span>
          <strong>${escapeHtml(invoice.invoiceNo || "-")}</strong>
          <p>${escapeHtml(formatDate(invoice.issuedAt))}</p>
        </div>
      </section>
      <section class="meta-grid">${metaRows}</section>
      <section>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
      <section class="summary">
        <div class="summary-card"><span>Total Amount</span><strong>${escapeHtml(formatCurrency(invoice.totalAmount))}</strong></div>
        <div class="summary-card"><span>Paid Amount</span><strong>${escapeHtml(formatCurrency(invoice.paidAmount))}</strong></div>
        <div class="summary-card"><span>Due Amount</span><strong>${escapeHtml(formatCurrency(invoice.dueAmount))}</strong></div>
      </section>
      ${invoice.note ? `<section class="note"><span class="eyebrow">Note</span><p style="margin-top:12px">${escapeHtml(invoice.note)}</p></section>` : ""}
    </main>
  </body>
</html>`;
}

function buildPdf(invoice) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let cursorY = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 118, 110);
  doc.text((invoice.title || "Invoice").toUpperCase(), marginX, cursorY);

  cursorY += 24;
  doc.setFontSize(24);
  doc.setTextColor(23, 32, 51);
  doc.text(invoice.heading || "Transaction Invoice", marginX, cursorY);

  cursorY += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(81, 98, 127);
  doc.text(invoice.subheading || "Transaction record", marginX, cursorY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(23, 32, 51);
  doc.text(`Invoice No: ${invoice.invoiceNo || "-"}`, 420, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(formatDate(invoice.issuedAt), 420, 66);

  cursorY += 30;
  const meta = (invoice.meta || []).filter((item) => item?.value);
  const metaColumns = 2;
  const cardWidth = 250;
  const cardHeight = 44;
  const gap = 14;

  meta.forEach((item, index) => {
    const column = index % metaColumns;
    const row = Math.floor(index / metaColumns);
    const x = marginX + column * (cardWidth + gap);
    const y = cursorY + row * (cardHeight + gap);

    doc.setDrawColor(217, 229, 243);
    doc.setFillColor(248, 251, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(item.label || "").toUpperCase(), x + 12, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(23, 32, 51);
    doc.text(String(item.value || "-"), x + 12, y + 30, { maxWidth: cardWidth - 24 });
  });

  cursorY += Math.max(Math.ceil(meta.length / metaColumns), 1) * (cardHeight + gap) + 8;

  autoTable(doc, {
    startY: cursorY,
    head: [["#", "Item", "Qty", "Unit Price", "Total"]],
    body: (invoice.items || []).map((item, index) => [
      index + 1,
      `${item.name || "-"}${item.description ? `\n${item.description}` : ""}`,
      item.quantity ?? "-",
      formatCurrency(item.unitPrice),
      formatCurrency(item.lineTotal),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 10,
      lineColor: [226, 232, 240],
      lineWidth: 1,
      textColor: [23, 32, 51],
    },
    headStyles: {
      fillColor: [248, 251, 255],
      textColor: [71, 85, 105],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 34, halign: "center" },
      1: { cellWidth: 258 },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 94, halign: "right" },
      4: { cellWidth: 94, halign: "right" },
    },
  });

  cursorY = doc.lastAutoTable.finalY + 24;

  const summaryX = marginX;
  const summaryWidth = 160;
  const summaryGap = 14;
  const summary = [
    ["Total Amount", formatCurrency(invoice.totalAmount)],
    ["Paid Amount", formatCurrency(invoice.paidAmount)],
    ["Due Amount", formatCurrency(invoice.dueAmount)],
  ];

  summary.forEach(([label, value], index) => {
    const x = summaryX + index * (summaryWidth + summaryGap);
    doc.setDrawColor(217, 229, 243);
    doc.setFillColor(248, 251, 255);
    doc.roundedRect(x, cursorY, summaryWidth, 52, 10, 10, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(label).toUpperCase(), x + 12, cursorY + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 51);
    doc.text(value, x + 12, cursorY + 36);
  });

  if (invoice.note) {
    cursorY += 72;
    doc.setDrawColor(217, 229, 243);
    doc.setFillColor(248, 251, 255);
    doc.roundedRect(marginX, cursorY, 515, 72, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text("NOTE", marginX + 12, cursorY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(81, 98, 127);
    doc.text(String(invoice.note), marginX + 12, cursorY + 38, { maxWidth: 491 });
  }

  return doc;
}

export function downloadInvoicePdf(invoice) {
  if (typeof window === "undefined") {
    return;
  }

  const doc = buildPdf(invoice);
  doc.save(getFileName(invoice));
}

export function printInvoice(invoice) {
  if (typeof window === "undefined") {
    return;
  }

  const iframe = window.document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      throw new Error("Failed to prepare the print frame.");
    }

    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  window.document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDocument) {
    cleanup();
    throw new Error("Failed to prepare the print document.");
  }

  frameDocument.open();
  frameDocument.write(buildInvoicePrintHtml(invoice));
  frameDocument.close();
}
