import { NextResponse } from "next/server";
import {
  createManualDueEntry,
  getDueManagementSnapshot,
  recordDuePayment,
} from "@/lib/dueManagement";
import { requireAdminRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const snapshot = await getDueManagementSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load due records." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const entry = await createManualDueEntry(payload);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create due entry." },
      { status: 400 },
    );
  }
}

export async function PATCH(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const result = await recordDuePayment(payload);

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to record payment." },
      { status: 400 },
    );
  }
}
