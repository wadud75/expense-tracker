import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { AUTH_COOKIE_NAME, AUTH_SESSION_DURATION_SECONDS } from "@/lib/auth-config";

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return secret;
}

function safeCompare(left, right, encoding) {
  const leftBuffer = Buffer.from(left, encoding);
  const rightBuffer = Buffer.from(right, encoding);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getPasswordHashParts(hashValue) {
  const parts = String(hashValue || "").split(":");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    throw new Error("ADMIN_PASSWORD_HASH must use the format scrypt:salt:hash.");
  }

  return {
    salt: parts[1],
    hash: parts[2],
  };
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD));
}

export function getAdminEmail() {
  const email = process.env.ADMIN_EMAIL;

  if (!email) {
    throw new Error("ADMIN_EMAIL is not configured.");
  }

  return email.trim().toLowerCase();
}

export function verifyAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === getAdminEmail();
}

export function verifyAdminPassword(password) {
  const passwordValue = String(password || "");

  if (process.env.ADMIN_PASSWORD_HASH) {
    const { salt, hash } = getPasswordHashParts(process.env.ADMIN_PASSWORD_HASH);
    const derivedKey = scryptSync(passwordValue, salt, 64).toString("hex");
    return safeCompare(derivedKey, hash, "hex");
  }

  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!plainPassword) {
    throw new Error("ADMIN_PASSWORD_HASH or ADMIN_PASSWORD must be configured.");
  }

  return safeCompare(passwordValue, plainPassword);
}

export function createPasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function signPayload(payload) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(email) {
  const payload = encodeBase64Url(
    JSON.stringify({
      email,
      exp: Math.floor(Date.now() / 1000) + AUTH_SESSION_DURATION_SECONDS,
    }),
  );

  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || !String(token).includes(".")) {
    return null;
  }

  const [payload, signature] = String(token).split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload));

    if (!parsed?.email || !parsed?.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!verifyAdminEmail(parsed.email)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_DURATION_SECONDS,
  };
}

export { AUTH_COOKIE_NAME };
