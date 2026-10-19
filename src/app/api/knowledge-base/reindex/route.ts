import { buildIndex } from '@/server/knowledge-base/index-cache';
import { ok, fail, errMsg, readJson } from '@/server/knowledge-base/http';

export const runtime = 'nodejs';

/** POST { scope: 'semua' | 'baru' } — bangun ulang indeks yang dipakai Auto Reply */
export async function POST(req: Request) {
  const { scope } = await readJson<{ scope: string }>(req);
  try {
    const r = await buildIndex({ force: scope !== 'baru' });
    return ok({ docs: r.docs, chunks: r.chunkCount, rebuilt: r.rebuilt });
  } catch (e) {
    return fail(errMsg(e, 'Gagal membangun indeks'), 500);
  }
}
