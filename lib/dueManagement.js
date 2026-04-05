import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

function normalizeText(value) {
  return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDueStatus(dueAmount, dueDate) {
  if (dueAmount <= 0) {
    return "settled";
  }

  if (!dueDate) {
    return "open";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedDueDate = new Date(dueDate);
  normalizedDueDate.setHours(0, 0, 0, 0);

  return normalizedDueDate.getTime() < today.getTime() ? "overdue" : "open";
}

function formatSourceLabel(sourceType) {
  if (sourceType === "sale") {
    return "Sales invoice";
  }

  if (sourceType === "purchase") {
    return "Purchase bill";
  }

  return "Manual due";
}

function createDueRecord({
  id,
  sourceType,
  direction,
  partyName,
  reference,
  totalAmount,
  paidAmount,
  dueDate,
  createdAt,
  note = "",
  meta = {},
}) {
  const normalizedTotal = normalizeNumber(totalAmount);
  const normalizedPaid = normalizeNumber(paidAmount);
  const balance = Math.max(normalizedTotal - normalizedPaid, 0);
  const parsedDueDate = toDate(dueDate);
  const parsedCreatedAt = toDate(createdAt);

  return {
    id,
    sourceType,
    sourceLabel: formatSourceLabel(sourceType),
    direction,
    partyName: normalizeText(partyName) || (direction === "receivable" ? "Walk-in customer" : "Unassigned supplier"),
    reference: normalizeText(reference),
    totalAmount: normalizedTotal,
    paidAmount: normalizedPaid,
    dueAmount: balance,
    dueDate: parsedDueDate,
    createdAt: parsedCreatedAt,
    note: normalizeText(note),
    status: getDueStatus(balance, parsedDueDate || parsedCreatedAt),
    meta,
  };
}

async function getDb() {
  const client = await clientPromise;
  return client.db("expense_tracker");
}

async function getCollections() {
  const db = await getDb();
  return {
    sales: db.collection("sales"),
    purchases: db.collection("purchases"),
    dueEntries: db.collection("due_entries"),
  };
}

function buildSalesDueRecords(rows) {
  const invoices = rows.reduce((summary, sale) => {
    const invoiceNo = normalizeText(sale.invoiceNo) || sale._id.toString();

    if (!summary[invoiceNo]) {
      summary[invoiceNo] = {
        id: invoiceNo,
        sourceType: "sale",
        direction: "receivable",
        partyName: normalizeText(sale.customerName),
        reference: invoiceNo,
        totalAmount: normalizeNumber(sale.invoiceTotal ?? sale.lineTotal),
        paidAmount: normalizeNumber(sale.paidAmount),
        dueDate: sale.createdAt,
        createdAt: sale.createdAt,
        note: normalizeText(sale.note),
        products: [],
        customerAddress: normalizeText(sale.customerAddress),
        sellerName: normalizeText(sale.sellerName),
      };
    }

    if (sale.productName) {
      summary[invoiceNo].products.push(sale.productName);
    }

    return summary;
  }, {});

  return Object.values(invoices).map((invoice) =>
    createDueRecord({
      ...invoice,
      meta: {
        products: Array.from(new Set(invoice.products)).slice(0, 4),
        customerAddress: invoice.customerAddress,
        sellerName: invoice.sellerName,
      },
    }),
  );
}

function buildPurchaseDueRecords(rows) {
  return rows.map((purchase) => {
    const totalAmount = normalizeNumber(purchase.quantity) * normalizeNumber(purchase.unitPrice);

    return createDueRecord({
      id: purchase._id.toString(),
      sourceType: "purchase",
      direction: "payable",
      partyName: purchase.supplierName,
      reference: purchase.productName,
      totalAmount,
      paidAmount: purchase.paymentAmount,
      dueDate: purchase.createdAt,
      createdAt: purchase.createdAt,
      note: purchase.notes,
      meta: {
        brandName: normalizeText(purchase.brandName),
        variantName: normalizeText(purchase.variantName),
        categoryName: normalizeText(purchase.categoryName),
        quantity: normalizeNumber(purchase.quantity),
      },
    });
  });
}

function buildManualDueRecords(rows) {
  return rows.map((entry) =>
    createDueRecord({
      id: entry._id.toString(),
      sourceType: "manual",
      direction: entry.direction === "payable" ? "payable" : "receivable",
      partyName: entry.partyName,
      reference: entry.reference,
      totalAmount: entry.totalAmount,
      paidAmount: entry.paidAmount,
      dueDate: entry.dueDate,
      createdAt: entry.createdAt,
      note: entry.note,
      meta: {
        category: normalizeText(entry.category),
      },
    }),
  );
}

export async function getDueManagementSnapshot() {
  const { sales, purchases, dueEntries } = await getCollections();

  const [salesRows, purchaseRows, manualRows] = await Promise.all([
    sales.find({}).sort({ createdAt: -1 }).toArray(),
    purchases.find({}).sort({ createdAt: -1 }).toArray(),
    dueEntries.find({}).sort({ createdAt: -1 }).toArray(),
  ]);

  const records = [
    ...buildSalesDueRecords(salesRows),
    ...buildPurchaseDueRecords(purchaseRows),
    ...buildManualDueRecords(manualRows),
  ].sort((left, right) => {
    const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
    const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
    return rightTime - leftTime;
  });

  const summary = records.reduce(
    (result, record) => {
      if (record.direction === "receivable") {
        result.totalReceivable += record.dueAmount;
      } else {
        result.totalPayable += record.dueAmount;
      }

      if (record.status === "overdue") {
        result.overdueAmount += record.dueAmount;
        result.overdueCount += 1;
      }

      if (record.status === "settled") {
        result.settledCount += 1;
      } else {
        result.openCount += 1;
      }

      return result;
    },
    {
      totalReceivable: 0,
      totalPayable: 0,
      overdueAmount: 0,
      overdueCount: 0,
      openCount: 0,
      settledCount: 0,
    },
  );

  return { summary, records };
}

export async function createManualDueEntry(payload) {
  const { dueEntries } = await getCollections();
  const now = new Date();
  const totalAmount = normalizeNumber(payload.totalAmount);
  const paidAmount = normalizeNumber(payload.paidAmount);
  const dueDate = toDate(payload.dueDate) || now;

  if (!normalizeText(payload.partyName)) {
    throw new Error("Party name is required.");
  }

  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than zero.");
  }

  if (paidAmount < 0) {
    throw new Error("Paid amount cannot be negative.");
  }

  const document = {
    direction: payload.direction === "payable" ? "payable" : "receivable",
    partyName: normalizeText(payload.partyName),
    reference: normalizeText(payload.reference),
    category: normalizeText(payload.category),
    totalAmount,
    paidAmount: Math.min(paidAmount, totalAmount),
    dueDate,
    note: normalizeText(payload.note),
    createdAt: now,
    updatedAt: now,
  };

  const result = await dueEntries.insertOne(document);

  return createDueRecord({
    id: result.insertedId.toString(),
    sourceType: "manual",
    ...document,
    meta: { category: document.category },
  });
}

export async function recordDuePayment(payload) {
  const sourceType = normalizeText(payload.sourceType);
  const amount = normalizeNumber(payload.amount);

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (sourceType === "sale") {
    return recordSalesPayment(payload.referenceId, amount);
  }

  if (sourceType === "purchase") {
    return recordPurchasePayment(payload.referenceId, amount);
  }

  if (sourceType === "manual") {
    return recordManualPayment(payload.referenceId, amount);
  }

  throw new Error("Unsupported due source.");
}

async function recordSalesPayment(invoiceNo, amount) {
  const { sales } = await getCollections();
  const normalizedInvoiceNo = normalizeText(invoiceNo);

  if (!normalizedInvoiceNo) {
    throw new Error("Invoice reference is required.");
  }

  const invoiceRows = await sales.find({ invoiceNo: normalizedInvoiceNo }).toArray();
  if (!invoiceRows.length) {
    throw new Error("Sales invoice not found.");
  }

  const currentPaidAmount = normalizeNumber(invoiceRows[0].paidAmount);
  const invoiceTotal = normalizeNumber(invoiceRows[0].invoiceTotal ?? invoiceRows[0].lineTotal);
  const nextPaidAmount = Math.min(currentPaidAmount + amount, invoiceTotal);

  await sales.updateMany(
    { invoiceNo: normalizedInvoiceNo },
    {
      $set: {
        paidAmount: nextPaidAmount,
      },
    },
  );

  return {
    sourceType: "sale",
    referenceId: normalizedInvoiceNo,
    paidAmount: nextPaidAmount,
    dueAmount: Math.max(invoiceTotal - nextPaidAmount, 0),
  };
}

async function recordPurchasePayment(purchaseId, amount) {
  const { purchases } = await getCollections();

  if (!ObjectId.isValid(purchaseId)) {
    throw new Error("Invalid purchase reference.");
  }

  const objectId = new ObjectId(purchaseId);
  const purchase = await purchases.findOne({ _id: objectId });
  if (!purchase) {
    throw new Error("Purchase record not found.");
  }

  const totalAmount = normalizeNumber(purchase.quantity) * normalizeNumber(purchase.unitPrice);
  const currentPaidAmount = normalizeNumber(purchase.paymentAmount);
  const nextPaidAmount = Math.min(currentPaidAmount + amount, totalAmount);

  await purchases.updateOne(
    { _id: objectId },
    {
      $set: {
        paymentAmount: nextPaidAmount,
      },
    },
  );

  return {
    sourceType: "purchase",
    referenceId: purchaseId,
    paidAmount: nextPaidAmount,
    dueAmount: Math.max(totalAmount - nextPaidAmount, 0),
  };
}

async function recordManualPayment(entryId, amount) {
  const { dueEntries } = await getCollections();

  if (!ObjectId.isValid(entryId)) {
    throw new Error("Invalid due entry reference.");
  }

  const objectId = new ObjectId(entryId);
  const entry = await dueEntries.findOne({ _id: objectId });
  if (!entry) {
    throw new Error("Manual due entry not found.");
  }

  const totalAmount = normalizeNumber(entry.totalAmount);
  const currentPaidAmount = normalizeNumber(entry.paidAmount);
  const nextPaidAmount = Math.min(currentPaidAmount + amount, totalAmount);

  await dueEntries.updateOne(
    { _id: objectId },
    {
      $set: {
        paidAmount: nextPaidAmount,
        updatedAt: new Date(),
      },
    },
  );

  return {
    sourceType: "manual",
    referenceId: entryId,
    paidAmount: nextPaidAmount,
    dueAmount: Math.max(totalAmount - nextPaidAmount, 0),
  };
}
