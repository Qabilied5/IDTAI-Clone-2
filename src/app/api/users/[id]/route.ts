import { NextResponse } from "next/server";

import { errorResponse, requireOrgAdmin, updateUser } from "@/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/users/:id — ubah status aktif / peran, atau reset password.
    Body: { isActive?, role?, resetPassword? }. Hanya user di perusahaan yang sama. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireOrgAdmin();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const { user, tempPassword } = await updateUser(me.organizationId, me, params.id, (body ?? {}) as Record<string, unknown>);
    return NextResponse.json({ ok: true, user, tempPassword });
  } catch (err) {
    return errorResponse(err);
  }
}
