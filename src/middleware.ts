import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "idt-ai-session";

// Endpoint yang HARUS tetap publik (dipanggil pihak luar / sebelum login).
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/waba/webhook", // dipanggil Meta
  "/api/calendly/webhook", // dipanggil Calendly (hanya route utama, bukan /register)
];

function isPublicApi(pathname: string) {
  return PUBLIC_API.some((p) => pathname === p);
}

async function hasValidSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return NextResponse.next();
    if (await hasValidSession(req)) return NextResponse.next();
    return NextResponse.json({ message: "Belum login." }, { status: 401 });
  }

  const loggedIn = await hasValidSession(req);

  if (pathname === "/login") {
    // Sudah login -> tidak perlu halaman login lagi.
    return loggedIn
      ? NextResponse.redirect(new URL("/overview", req.url))
      : NextResponse.next();
  }

  if (!loggedIn) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua route kecuali aset statis Next.js dan file ber-ekstensi (gambar, ikon, dll.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
