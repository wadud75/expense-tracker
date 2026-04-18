import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-config";

const PUBLIC_PATHS = new Set(["/admin/login"]);

function encodeBase64Url(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifySessionToken(token, secret, adminEmail) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signPayload(payload, secret);
  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload));
    return Boolean(
      parsed?.email &&
      parsed.email === adminEmail &&
      parsed?.exp &&
      parsed.exp >= Math.floor(Date.now() / 1000),
    );
  } catch {
    return false;
  }
}

function isProtectedPath(pathname) {
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return false;
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return false;
  }

  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return false;
  }

  return (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/purchase") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/sellers") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/stock") ||
    pathname.startsWith("/due") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/warranty") ||
    pathname.startsWith("/api/")
  );
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminEmail || !sessionSecret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Admin authentication is not configured." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token, sessionSecret, adminEmail);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search || ""}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
