import { KB_MAX_CONTENT_CHARS } from '@/server/config';
import { fail, ok, readJson } from '@/server/http';
import { kbFind, kbPublicDoc } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Next 14: params adalah objek biasa (bukan Promise seperti di Next 15).
type Ctx = { params: { id: string } };

const CATEGORY_IDS = ['produk', 'harga', 'faq', 'sop', 'pengiriman', 'umum'];
const isCategory = (v: unknown): v is string => typeof v === 'string' && CATEGORY_IDS.includes(v);

/* GET /api/knowledge-base/:id — dokumen lengkap (dengan isi) untuk pratinjau/edit. */
export async function GET(_req: Request, { params }: Ctx) {
  ensureDataLoaded();
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);
  return ok({ doc: { ...kbPublicDoc(doc), content: doc.content || '' } });
}

/* PUT /api/knowledge-base/:id — body { title, content, category }. */
export async function PUT(req: Request, { params }: Ctx) {
  ensureDataLoaded();
  const doc = kbFind(params.id);
  if (!doc) return fail('Dokumen tidak ditemukan', 404);

  const b = await readJson<{ title?: string; content?: string; category?: string }>(req);
  const title = String(b.title ?? '').trim();
  const content = String(b.content ?? '').trim();
  if (!title || !content) return fail('Judul & konten wajib diisi', 400);
  if (content.length > KB_MAX_CONTENT_CHARS) {
    return fail(`Konten terlalu panjang (maks ${KB_MAX_CONTENT_CHARS.toLocaleString('id-ID')} karakter)`, 400);
  }

  doc.title = title;
  doc.content = content;
  if (isCategory(b.category)) doc.category = b.category;
  doc.updatedAt = Date.now();
  kbSave();
  return ok({ doc: kbPublicDoc(doc) });
}

/* DELETE /api/knowledge-base/:id */
export async function DELETE(_req: Request, { params }: Ctx) {
  ensureDataLoaded();
  const idx = state.knowledgeBase.findIndex((d) => d.id === Number(params.id));
  if (idx === -1) return fail('Dokumen tidak ditemukan', 404);
  state.knowledgeBase.splice(idx, 1);
  kbSave();
  return ok();
}
