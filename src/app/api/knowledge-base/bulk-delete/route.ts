import fs from 'fs';
import { fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, kbSave } from '@/server/store';
import type { KbDoc } from '@/server/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  ensureDataLoaded();
  const { ids } = await readJson(req);
  if (!Array.isArray(ids) || ids.length === 0) return fail('Tidak ada dokumen yang dipilih', 400);
  const idSet = new Set(ids.map(Number));
  const removed: KbDoc[] = [];
  for (let i = state.knowledgeBase.length - 1; i >= 0; i--) {
    if (idSet.has(state.knowledgeBase[i].id)) removed.push(...state.knowledgeBase.splice(i, 1));
  }
  removed.forEach((d) => { if (d.storedPath) fs.unlink(d.storedPath, () => {}); });
  if (removed.length > 0) kbSave();
  return ok({ deletedCount: removed.length, deletedIds: removed.map((d) => d.id) });
}
