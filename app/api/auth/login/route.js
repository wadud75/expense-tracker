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
import {
  clearLoginFailures,
  getRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/auth-rate-limit";

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
    const rateLimitKey = getRateLimitKey(request, normalizedEmail);
    const rateLimit = isLoginRateLimited(rateLimitKey);

    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Try again later." },
        { status: 429 },
      );
    }

    if (!verifyAdminEmail(normalizedEmail) || !verifyAdminPassword(password)) {
      recordLoginFailure(rateLimitKey);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    clearLoginFailures(rateLimitKey);

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
