import { NextResponse } from "next/server";
import { updateSalesWarrantyRecords } from "@/lib/inventory";

export async function PUT(request) {
  try {
    const payload = await request.json();
    const result = await updateSalesWarrantyRecords(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update warranty record." },
      { status: 400 },
    );
  }
}
