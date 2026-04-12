const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = globalThis.__adminLoginAttempts ?? new Map();

if (!globalThis.__adminLoginAttempts) {
  globalThis.__adminLoginAttempts = attempts;
}

function currentTime() {
  return Date.now();
}

function getActiveEntry(key) {
  const entry = attempts.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= currentTime()) {
    attempts.delete(key);
    return null;
  }

  return entry;
}

export function getRateLimitKey(request, email) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0].trim() || "local";
  return `${ip}:${String(email || "").trim().toLowerCase()}`;
}

export function isLoginRateLimited(key) {
  const entry = getActiveEntry(key);

  if (!entry || entry.count < MAX_ATTEMPTS) {
    return { limited: false, remainingMs: 0 };
  }

  return {
    limited: true,
    remainingMs: Math.max(entry.expiresAt - currentTime(), 0),
  };
}

export function recordLoginFailure(key) {
  const entry = getActiveEntry(key);

  if (!entry) {
    attempts.set(key, {
      count: 1,
      expiresAt: currentTime() + WINDOW_MS,
    });
    return;
  }

  attempts.set(key, {
    count: entry.count + 1,
    expiresAt: entry.expiresAt,
  });
}

export function clearLoginFailures(key) {
  attempts.delete(key);
}
