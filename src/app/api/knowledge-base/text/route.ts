import { KB_MAX_CONTENT_CHARS } from '@/server/config';
import { fail, ok, readJson } from '@/server/http';
import { kbNextId, kbPublicDoc } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';
import type { KbDoc } from '@/server/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST /api/knowledge-base/text — body { title, content, category } */
export async function POST(req: Request) {
  ensureDataLoaded();
  const b = await readJson<{ title?: string; content?: string; category?: string }>(req);
  const title = String(b.title ?? '').trim();
  const content = String(b.content ?? '').trim();
  if (!title || !content) return fail('Judul & konten wajib diisi', 400);
  if (content.length > KB_MAX_CONTENT_CHARS) {
    return fail(`Konten terlalu panjang (maks ${KB_MAX_CONTENT_CHARS.toLocaleString('id-ID')} karakter)`, 400);
  }

  const now = Date.now();
  const doc: KbDoc = {
    id: kbNextId(),
    title,
    category: String(b.category ?? '').trim() || 'umum',
    status: 'aktif',
    sourceType: 'teks',
    content,
    createdAt: now,
    updatedAt: now,
  };
  state.knowledgeBase.push(doc);
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}
