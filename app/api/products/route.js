import { NextResponse } from "next/server";
import { getStockSnapshot } from "@/lib/inventory";

export async function GET() {
  try {
    const { products } = await getStockSnapshot();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load products." },
      { status: 500 },
    );
  }
}
