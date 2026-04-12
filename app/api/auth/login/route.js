import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getAdminEmail,
  getAuthCookieOptions,
  isAdminConfigured,
  verifyAdminEmail,
  verifyAdminPassword,
} from "@/lib/auth";

export async function POST(request) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: "Admin login is not configured. Add admin credentials to the environment first." },
        { status: 500 },
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!verifyAdminEmail(normalizedEmail) || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      email: getAdminEmail(),
    });

    response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(normalizedEmail), getAuthCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Login failed." },
      { status: 500 },
    );
  }
}
