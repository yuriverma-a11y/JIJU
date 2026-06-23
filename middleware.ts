import { NextResponse, type NextRequest } from "next/server";

// Lightweight access gate (defense-in-depth alongside Vercel Deployment
// Protection). If JIJU_ACCESS_TOKEN is unset (local dev), everything is open.
// Otherwise a matching `jiju_auth` cookie is required; page requests redirect
// to /login, API requests get 401.

const PUBLIC_PATHS = ["/login", "/api/login"];

export function middleware(req: NextRequest) {
  const token = process.env.JIJU_ACCESS_TOKEN ?? "";
  if (!token) return NextResponse.next(); // dev: no gate

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("jiju_auth")?.value;
  if (cookie === token) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
