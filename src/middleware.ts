import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "idt-ai-session";
const ORG_HEADER = "x-org-id";

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

/** ID perusahaan dari token yang VALID; null jika belum login / token lama tanpa perusahaan. */
async function sessionOrg(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const org = payload.org;
    return typeof org === "string" && org ? org : null;
  } catch {
    return null;
  }
}

/** Teruskan request dengan header x-org-id yang dikendalikan server (header dari klien dibuang). */
function pass(req: NextRequest, org: string | null) {
  const headers = new Headers(req.headers);
  headers.delete(ORG_HEADER);
  if (org) headers.set(ORG_HEADER, org);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return pass(req, null);
    const org = await sessionOrg(req);
    if (org) return pass(req, org);
    return NextResponse.json({ message: "Belum login." }, { status: 401 });
  }

  const org = await sessionOrg(req);

  if (pathname === "/login") {
    // Sudah login -> tidak perlu halaman login lagi.
    return org ? NextResponse.redirect(new URL("/overview", req.url)) : pass(req, null);
  }

  if (!org) return NextResponse.redirect(new URL("/login", req.url));
  return pass(req, org);
}

export const config = {
  // Semua route kecuali aset statis Next.js dan file ber-ekstensi (gambar, ikon, dll.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
