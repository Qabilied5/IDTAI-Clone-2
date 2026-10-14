import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

import { getPool, sql } from "@/server/db";
import type { AuthUser, UserRole } from "@/types/auth";

export const runtime = "nodejs"; // mssql tidak jalan di Edge runtime
export const dynamic = "force-dynamic";

// Hash valid untuk menyamakan waktu respons saat email tidak ditemukan
// (mencegah user enumeration lewat perbedaan waktu).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-not-used", 12);

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string; rememberMe?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email dan password wajib diisi." },
      { status: 400 }
    );
  }

  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    console.error("AUTH_JWT_SECRET belum di-set");
    return NextResponse.json({ message: "Konfigurasi server belum lengkap." }, { status: 500 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query<{
        Id: string;
        Name: string;
        Email: string;
        PasswordHash: string;
        Role: UserRole;
        IsActive: boolean;
      }>(
        `SELECT TOP 1 Id, Name, Email, PasswordHash, Role, IsActive
         FROM dbo.Users WHERE Email = @email`
      );

    const row = result.recordset[0];
    const ok = await bcrypt.compare(password, row?.PasswordHash ?? DUMMY_HASH);

    if (!row || !ok) {
      return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
    }
    if (!row.IsActive) {
      return NextResponse.json({ message: "Akun dinonaktifkan. Hubungi admin." }, { status: 403 });
    }

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, row.Id)
      .query("UPDATE dbo.Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id");

    const user: AuthUser = {
      id: row.Id,
      name: row.Name,
      email: row.Email,
      role: row.Role,
      avatarInitials: initials(row.Name),
    };

    const maxAge = body.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
    const token = await new SignJWT({ role: user.role, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const res = NextResponse.json({ user, token });
    res.cookies.set("idt-ai-session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { message: "Tidak dapat terhubung ke server. Coba lagi." },
      { status: 500 }
    );
  }
}
