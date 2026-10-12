import { fail, ok, readJson } from '@/server/http';
import { kbNextId, kbPublicDoc, kbTrimContent } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { kbSave } from '@/server/store';
import type { KbDoc } from '@/server/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { title, content, category } = await readJson(req);
  if (!title || !String(title).trim()) return fail('Judul dokumen wajib diisi', 400);
  if (!content || !String(content).trim()) return fail('Konten dokumen wajib diisi', 400);
  const doc: KbDoc = {
    id: kbNextId(),
    title: String(title).trim(),
    category: String(category || '').trim() || 'umum',
    status: 'aktif',
    sourceType: 'teks',
    content: kbTrimContent(content),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.knowledgeBase.push(doc);
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}
