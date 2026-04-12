import { NextResponse } from "next/server";
import { adjustStock, getStockSnapshot } from "@/lib/inventory";
import { requireAdminRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const snapshot = await getStockSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load stock." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    await adjustStock(payload);
    const snapshot = await getStockSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to adjust stock." },
      { status: 400 },
    );
  }
}
