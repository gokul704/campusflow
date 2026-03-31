import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant slug from Host (e.g. mish.campusflow.io → mish).
 * Avoids treating IPv4 like 127.0.0.1 as a "subdomain" (four dot-separated parts).
 */
function tenantSlugFromHost(host: string): string | null {
  const hostname = (host.split(":")[0] ?? "").toLowerCase();
  if (!hostname || hostname === "localhost") return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;

  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  const slug = parts[0];
  return slug && slug !== "www" ? slug : null;
}

/**
 * Next.js Middleware
 *
 * Extracts tenant slug from subdomain and passes it via header.
 * Also protects dashboard routes — redirects to login if no token.
 *
 * Only forwards modified headers when a tenant slug exists; cloning every request
 * header into NextResponse.next() can cause 500s in some runtimes.
 */
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("cf_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  const host = req.headers.get("host") ?? "";
  const slug = tenantSlugFromHost(host);
  if (slug) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-slug", slug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

/**
 * Skip all `/_next/*` (RSC payloads, Flight, HMR, chunks), not only `static` + `image`.
 * Running middleware on those requests can interfere with prefetch / client navigations.
 */
export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
