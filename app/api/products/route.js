import { NextResponse } from "next/server";
import { getStockSnapshot } from "@/lib/inventory";
import { requireAdminRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { products } = await getStockSnapshot();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load products." },
      { status: 500 },
    );
  }
}
