import { fail, ok, readJson } from '@/server/http';
import { kbFind, kbPublicDoc } from '@/server/knowledge-base';
import { ensureDataLoaded, kbSave } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['aktif', 'nonaktif', 'draft'] as const;

/* PATCH /api/knowledge-base/:id/status — body { status } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  ensureDataLoaded();
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);

  const b = await readJson<{ status?: string }>(req);
  const status = STATUSES.find((s) => s === b.status);
  if (!status) return fail('Status tidak valid', 400);

  doc.status = status;
  doc.updatedAt = Date.now();
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}
