import fs from 'fs';
import { fail, ok, readJson } from '@/server/http';
import { kbFind, kbPublicDoc, kbTrimContent } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { kbSave } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);
  return ok({ doc: { ...kbPublicDoc(doc), content: doc.content || '' } });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);
  const { title, content, category } = await readJson(req);
  if (title !== undefined) doc.title = String(title).trim() || doc.title;
  if (category !== undefined) doc.category = String(category).trim() || 'umum';
  if (content !== undefined) doc.content = kbTrimContent(content);
  doc.updatedAt = Date.now();
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const idx = state.knowledgeBase.findIndex((d) => d.id === Number(params.id));
  if (idx === -1) return fail('Dokumen tidak ditemukan', 404);
  const [removed] = state.knowledgeBase.splice(idx, 1);
  if (removed.storedPath) fs.unlink(removed.storedPath, () => {});
  kbSave();
  return ok();
}
