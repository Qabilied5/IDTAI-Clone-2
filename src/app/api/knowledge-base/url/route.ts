import { errMsg, fail, ok, readJson } from '@/server/http';
import { kbAddFromUrl, kbPublicDoc } from '@/server/knowledge-base';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/* POST /api/knowledge-base/url — body { url, category, autoSync, aiFilter }
   Ambil 1 halaman web (tanpa crawl) dan simpan sebagai dokumen. */
export async function POST(req: Request) {
  const b = await readJson<{ url?: string; category?: string; autoSync?: boolean; aiFilter?: boolean }>(req);
  const url = String(b.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) return fail('URL harus diawali http:// atau https://', 400);
  try {
    new URL(url);
  } catch {
    return fail('URL tidak valid', 400);
  }
  try {
    const { doc, aiFilterNote } = await kbAddFromUrl({
      url,
      category: b.category,
      autoSync: b.autoSync,
      aiFilter: b.aiFilter,
    });
    return ok({ doc: kbPublicDoc(doc), aiFilterWarning: doc.aiFiltered ? null : aiFilterNote ?? null });
  } catch (e) {
    return fail(errMsg(e), 500);
  }
}
