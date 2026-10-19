import { NextResponse } from "next/server";

import { createUser, errorResponse, listUsers, requireOrgAdmin } from "@/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/users — daftar user milik perusahaan yang sedang login. */
export async function GET() {
  try {
    const me = await requireOrgAdmin();
    const users = await listUsers(me.organizationId, me.userId);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/users — tambah user ke perusahaan yang sedang login.
    Body: { name, email, role: admin|agent|viewer, password? }. Perusahaan TIDAK diambil dari body. */
export async function POST(req: Request) {
  try {
    const me = await requireOrgAdmin();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const { user, tempPassword } = await createUser(me.organizationId, (body ?? {}) as Record<string, unknown>);
    return NextResponse.json({ ok: true, user, tempPassword }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
