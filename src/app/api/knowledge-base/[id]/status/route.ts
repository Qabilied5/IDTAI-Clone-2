import { fail, ok, readJson } from '@/server/http';
import { kbFind, kbPublicDoc } from '@/server/knowledge-base';
import { kbSave } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);
  const { status } = await readJson(req);
  if (!['aktif', 'nonaktif', 'draft'].includes(status)) return fail('Status tidak valid', 400);
  doc.status = status;
  doc.updatedAt = Date.now();
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}
