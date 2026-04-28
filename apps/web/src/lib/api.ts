/**
 * Optional `x-tenant-key` (tenant `publicKey`) when you have multiple institutes
 * in one database and need to force one from the browser. Standalone setups
 * use `SINGLE_TENANT_SLUG` on the API instead — no web env required.
 */
function getTenantKey(): string {
  return process.env.NEXT_PUBLIC_TENANT_KEY ?? "";
}

export function resolveApiUrl(path: string): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. In apps/web/.env.local add e.g. NEXT_PUBLIC_API_URL=http://localhost:4000 and restart the dev server."
    );
  }
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must start with http:// or https:// (current value is not a full URL).`
    );
  }
  const base = raw.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Fetch wrapper for the API. Adds optional `x-tenant-key` when set.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const key = getTenantKey();
  const url = resolveApiUrl(path);

  return fetch(url, {
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

/** Same-origin `<a href>` / window.open: append JWT because cross-origin requests may not send `cf_token` cookie. */
export function authenticatedDownloadUrl(apiPath: string): string {
  const token = getCookie("cf_token");
  const base = resolveApiUrl(apiPath);
  const sep = apiPath.includes("?") ? "&" : "?";
  return token ? `${base}${sep}token=${encodeURIComponent(token)}` : base;
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
