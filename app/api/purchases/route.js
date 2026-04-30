import { NextResponse } from "next/server";
import { upsertProductFromPurchase } from "@/lib/inventory";
import { calculatePurchaseTotal, createInvoiceNumber } from "@/lib/invoiceUtils";
import clientPromise from "@/lib/mongodb";
import { requireAdminRequest } from "@/lib/server-auth";

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPurchaseDocument(payload) {
  const quantity = normalizeNumber(payload.quantity, 1);
  const unitPrice = normalizeNumber(payload.unitPrice);
  const paymentAmount = normalizeNumber(payload.paymentAmount);
  const invoiceTotal = calculatePurchaseTotal(quantity, unitPrice);

  return {
    invoiceNo: createInvoiceNumber("PU"),
    supplierName: (payload.supplierName || "").trim(),
    productName: (payload.productName || "").trim(),
    brandName: (payload.brandName || "").trim(),
    modelName: (payload.modelName || "").trim(),
    variantName: (payload.variantName || "").trim(),
    categoryName: (payload.categoryName || "").trim(),
    quantity,
    unitPrice,
    paymentMethod: (payload.paymentMethod || "").trim() || "Cash",
    paymentAmount,
    invoiceTotal,
    notes: (payload.notes || "").trim(),
    createdAt: new Date(),
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db("expense_tracker").collection("purchases");
}

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const collection = await getCollection();
    const purchases = await collection.find({}).sort({ createdAt: -1 }).limit(100).toArray();

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        id: purchase._id?.toString?.() || purchase.id || "",
        invoiceNo: purchase.invoiceNo || "",
        supplierName: purchase.supplierName || "",
        productName: purchase.productName || "",
        brandName: purchase.brandName || "",
        modelName: purchase.modelName || "",
        variantName: purchase.variantName || "",
        categoryName: purchase.categoryName || "",
        quantity: purchase.quantity ?? 0,
        unitPrice: purchase.unitPrice ?? purchase.costPerUnit ?? 0,
        paymentMethod: purchase.paymentMethod || "Cash",
        paymentAmount: purchase.paymentAmount ?? purchase.paidAmount ?? 0,
        invoiceTotal:
          purchase.invoiceTotal ??
          calculatePurchaseTotal(purchase.quantity, purchase.unitPrice ?? purchase.costPerUnit),
        createdAt: purchase.createdAt,
        notes: purchase.notes || "",
      })),
    });
  } catch (error) {
    console.error("[GET /api/purchases] failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load purchases." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const purchase = buildPurchaseDocument(payload);

    if (!purchase.supplierName || !purchase.productName || !purchase.categoryName) {
      return NextResponse.json(
        { error: "Supplier, category, and product name are required." },
        { status: 400 },
      );
    }

    const collection = await getCollection();
    const result = await collection.insertOne(purchase);
    await upsertProductFromPurchase(purchase, result.insertedId);

    return NextResponse.json({
      id: result.insertedId.toString(),
      invoiceNo: purchase.invoiceNo,
      purchase: {
        ...purchase,
        id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/purchases] failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save purchase." },
      { status: 500 },
    );
  }
}
