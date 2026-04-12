import { NextResponse } from "next/server";
import { updateSalesWarrantyRecords } from "@/lib/inventory";
import { requireAdminRequest } from "@/lib/server-auth";

export async function PUT(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

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
