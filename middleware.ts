import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const PROTECTED = ["/dashboard", "/saved-jobs", "/applications", "/resume", "/resume-analyzer", "/ats-checker", "/skill-analysis", "/interview", "/profile", "/settings"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!req.auth && isProtected) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
