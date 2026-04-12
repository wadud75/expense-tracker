import { NextResponse } from "next/server";
import { createSale, createSalesBatch, getSalesRecords } from "@/lib/inventory";
import { requireAdminRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const sales = await getSalesRecords();
    return NextResponse.json({ sales });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load sales." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();

    if (Array.isArray(payload.items) && payload.items.length) {
      const result = await createSalesBatch(payload);
      return NextResponse.json(result);
    }

    const sale = await createSale(payload);
    return NextResponse.json({ sale, invoiceNo: sale.invoiceNo, sales: [sale] });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save sale." },
      { status: 400 },
    );
  }
}
