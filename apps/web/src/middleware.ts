import { NextRequest, NextResponse } from "next/server";

/**
 * Protects dashboard routes — redirects to login if no session cookie.
 */
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("cf_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

/**
 * Skip all of `/_next/*` (RSC Flight, HMR, webpack, chunks, image optimizer, etc.).
 * Matching only `_next/static` + `_next/image` lets other internal `/_next/...` requests
 * hit middleware and can surface as 500s or broken navigation in dev/production.
 */
export const config = {
  matcher: [
    "/((?!_next/|favicon\\.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|woff2?)).*)",
  ],
};
