import { NextResponse } from "next/server";
import { adjustStock, getStockSnapshot } from "@/lib/inventory";

export async function GET() {
  try {
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
