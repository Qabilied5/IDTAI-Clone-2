import { fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST /api/knowledge-base/bulk-delete — body { ids: number[] } */
export async function POST(req: Request) {
  ensureDataLoaded();
  const b = await readJson<{ ids?: unknown }>(req);
  const ids = new Set(Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite) : []);
  if (!ids.size) return fail('Tidak ada dokumen yang dipilih', 400);

  const before = state.knowledgeBase.length;
  state.knowledgeBase = state.knowledgeBase.filter((d) => !ids.has(d.id));
  const deletedCount = before - state.knowledgeBase.length;
  if (deletedCount) kbSave();
  return ok({ deletedCount });
}
