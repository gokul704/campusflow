/**
 * Gets the tenant public key (random UUID) for the current context.
 *
 * In production the subdomain identifies the tenant server-side,
 * so the key is only needed for dev / non-subdomain API calls.
 */
function getTenantKey(): string {
  return process.env.NEXT_PUBLIC_TENANT_KEY ?? "";
}

/**
 * Fetch wrapper that automatically adds the tenant key header.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const key = getTenantKey();

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-tenant-key": key } : {}),
      ...(options.headers ?? {}),
    },
  });
}

/**
 * Fetch wrapper for authenticated requests (adds JWT from cookie).
 */
export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getCookie("cf_token");

  return apiFetch(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Turns JSON error bodies into a safe string for UI (avoids rendering objects / React child errors).
 * Prefer `error`; use `message` when the API adds it (e.g. Prisma details in development).
 */
export function formatApiError(body: unknown): string {
  if (!body || typeof body !== "object") return "Something went wrong";
  const o = body as Record<string, unknown>;
  const errStr = typeof o.error === "string" ? o.error : "";
  const msgStr = typeof o.message === "string" ? o.message : "";
  // API often returns { error: "Internal server error", message: "<Prisma details>" } in development
  if (msgStr && /internal server error/i.test(errStr)) return msgStr;
  if (errStr) return errStr;
  if (msgStr) return msgStr;
  if (o.error !== undefined && typeof o.error !== "string") return "Invalid request";
  return "Something went wrong";
}
