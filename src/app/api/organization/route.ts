import { NextResponse } from "next/server";

import { getOrganization, renameOrganization } from "@/server/organization";
import { getSession } from "@/server/session";
import { errorResponse, HttpError, requireOrgAdmin } from "@/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/organization — perusahaan milik user yang sedang login (semua peran). */
export async function GET() {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Belum login.");
    const organization = await getOrganization(s.organizationId);
    if (!organization) throw new HttpError(404, "Perusahaan tidak ditemukan.");
    return NextResponse.json({ ok: true, organization });
  } catch (err) {
    return errorResponse(err);
  }
}

/** PATCH /api/organization — ganti NAMA perusahaan (Organizations.Name). Hanya admin.
    Body: { name }. Perusahaan selalu dari sesi, bukan dari body. Slug tidak berubah. */
export async function PATCH(req: Request) {
  try {
    const me = await requireOrgAdmin();
    let body: { name?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const organization = await renameOrganization(me.organizationId, body?.name);
    return NextResponse.json({ ok: true, organization });
  } catch (err) {
    return errorResponse(err);
  }
}
