import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { getPool, sql } from "@/server/db";
import { getSession } from "@/server/session";

/* =============================================================
   Manajemen user per perusahaan.
   ATURAN KEAMANAN:
   - OrganizationId SELALU berasal dari sesi (token terverifikasi), tidak pernah dari body/query.
   - Setiap query yang menyentuh user lain memakai `WHERE OrganizationId = @org`.
   - Hak admin dicek ulang ke database (bukan hanya dari token), supaya admin yang sudah
     diturunkan/dinonaktifkan langsung kehilangan akses kelola user.
   ============================================================= */

export const ASSIGNABLE_ROLES = ["admin", "agent", "viewer"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isSelf: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

/** Password sementara: 12 karakter, huruf besar + kecil + angka, tanpa karakter yang mudah tertukar. */
export function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digit = "23456789";
  const all = upper + lower + digit;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digit)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Pastikan pemanggil login, aktif, satu perusahaan dengan token-nya, dan berperan admin. */
export async function requireOrgAdmin(): Promise<{ userId: string; organizationId: string; role: string }> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Belum login.");

  const pool = await getPool();
  const res = await pool
    .request()
    .input("id", sql.UniqueIdentifier, s.userId)
    .query(`SELECT Role, IsActive, OrganizationId FROM dbo.Users WHERE Id = @id`);
  const row = res.recordset[0];
  if (!row || !row.IsActive || String(row.OrganizationId).toLowerCase() !== s.organizationId.toLowerCase()) {
    throw new HttpError(401, "Sesi tidak valid. Silakan login ulang.");
  }
  if (row.Role !== "admin" && row.Role !== "super_admin") {
    throw new HttpError(403, "Hanya admin yang boleh mengelola user.");
  }
  return { userId: s.userId, organizationId: s.organizationId, role: row.Role as string };
}

export async function listUsers(orgId: string, selfId: string): Promise<TeamUser[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .query(
      `SELECT Id, Name, Email, Role, IsActive, LastLoginAt, CreatedAt
       FROM dbo.Users WHERE OrganizationId = @org ORDER BY CreatedAt, Email`
    );
  return res.recordset.map((r: any) => ({
    id: String(r.Id).toLowerCase(),
    name: r.Name,
    email: r.Email,
    role: r.Role,
    isActive: !!r.IsActive,
    lastLoginAt: iso(r.LastLoginAt),
    createdAt: iso(r.CreatedAt) ?? "",
    isSelf: String(r.Id).toLowerCase() === selfId.toLowerCase(),
  }));
}

export interface CreateInput {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  password?: unknown;
}

export async function createUser(
  orgId: string,
  input: CreateInput
): Promise<{ user: TeamUser; tempPassword: string | null }> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input.role;
  const given = typeof input.password === "string" ? input.password : "";

  if (name.length < 2 || name.length > 100) throw new HttpError(400, "Nama harus 2–100 karakter.");
  if (!email || email.length > 255 || !EMAIL_RE.test(email)) throw new HttpError(400, "Format email tidak valid.");
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) throw new HttpError(400, "Peran tidak valid.");
  if (given && (given.length < 8 || given.length > 72)) throw new HttpError(400, "Password harus 8–72 karakter.");

  // Jika admin tidak mengisi password, buatkan yang sementara dan kembalikan SEKALI saja.
  const password = given || generatePassword();
  const hash = await bcrypt.hash(password, 12);

  const pool = await getPool();
  try {
    const res = await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("email", sql.NVarChar(255), email)
      .input("hash", sql.NVarChar(255), hash)
      .input("role", sql.NVarChar(20), role as string)
      .input("org", sql.UniqueIdentifier, orgId)
      .query(
        `INSERT INTO dbo.Users (Name, Email, PasswordHash, Role, OrganizationId)
         OUTPUT INSERTED.Id, INSERTED.CreatedAt
         VALUES (@name, @email, @hash, @role, @org)`
      );
    const row = res.recordset[0];
    return {
      user: {
        id: String(row.Id).toLowerCase(),
        name,
        email,
        role: role as string,
        isActive: true,
        lastLoginAt: null,
        createdAt: iso(row.CreatedAt) ?? new Date().toISOString(),
        isSelf: false,
      },
      tempPassword: given ? null : password,
    };
  } catch (err) {
    const n = (err as { number?: number }).number;
    if (n === 2601 || n === 2627) throw new HttpError(409, "Email ini sudah terdaftar.");
    throw err;
  }
}

export interface UpdateInput {
  isActive?: unknown;
  role?: unknown;
  resetPassword?: unknown;
}

export async function updateUser(
  orgId: string,
  actor: { userId: string; role: string },
  targetId: string,
  patch: UpdateInput
): Promise<{ user: TeamUser; tempPassword: string | null }> {
  if (!UUID_RE.test(targetId)) throw new HttpError(404, "User tidak ditemukan.");

  const pool = await getPool();
  const found = await pool
    .request()
    .input("id", sql.UniqueIdentifier, targetId)
    .input("org", sql.UniqueIdentifier, orgId)
    .query(
      `SELECT Id, Name, Email, Role, IsActive, LastLoginAt, CreatedAt
       FROM dbo.Users WHERE Id = @id AND OrganizationId = @org`
    );
  const target = found.recordset[0];
  // User dari perusahaan lain diperlakukan sama seperti tidak ada (tidak membocorkan keberadaannya).
  if (!target) throw new HttpError(404, "User tidak ditemukan.");

  const isSelf = String(target.Id).toLowerCase() === actor.userId.toLowerCase();
  if (target.Role === "super_admin" && actor.role !== "super_admin") {
    throw new HttpError(403, "Akun Super Admin tidak bisa diubah dari sini.");
  }

  let isActive: boolean = !!target.IsActive;
  let role: string = target.Role;
  let tempPassword: string | null = null;

  if (patch.isActive !== undefined) {
    if (typeof patch.isActive !== "boolean") throw new HttpError(400, "isActive harus true/false.");
    if (isSelf && patch.isActive === false) throw new HttpError(400, "Anda tidak bisa menonaktifkan akun sendiri.");
    isActive = patch.isActive;
  }
  if (patch.role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(patch.role as AssignableRole)) throw new HttpError(400, "Peran tidak valid.");
    if (isSelf && patch.role !== target.Role) throw new HttpError(400, "Anda tidak bisa mengubah peran akun sendiri.");
    role = patch.role as string;
  }

  if (patch.isActive !== undefined || patch.role !== undefined) {
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, targetId)
      .input("org", sql.UniqueIdentifier, orgId)
      .input("active", sql.Bit, isActive)
      .input("role", sql.NVarChar(20), role)
      .query(`UPDATE dbo.Users SET IsActive = @active, Role = @role WHERE Id = @id AND OrganizationId = @org`);
  }

  if (patch.resetPassword === true) {
    tempPassword = generatePassword();
    const hash = await bcrypt.hash(tempPassword, 12);
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, targetId)
      .input("org", sql.UniqueIdentifier, orgId)
      .input("hash", sql.NVarChar(255), hash)
      .query(`UPDATE dbo.Users SET PasswordHash = @hash WHERE Id = @id AND OrganizationId = @org`);
  }

  return {
    user: {
      id: String(target.Id).toLowerCase(),
      name: target.Name,
      email: target.Email,
      role,
      isActive,
      lastLoginAt: iso(target.LastLoginAt),
      createdAt: iso(target.CreatedAt) ?? "",
      isSelf,
    },
    tempPassword,
  };
}

/** Ubah error menjadi respons JSON seragam dengan route lain ({ ok:false, error }). */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ ok: false, error: err.message }, { status: err.status });
  }
  console.error("[users]", err);
  return Response.json({ ok: false, error: "Terjadi kesalahan di server." }, { status: 500 });
}
