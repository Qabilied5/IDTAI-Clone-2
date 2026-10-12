/* =============================================================
   src/app/api/pipeline/stages/route.ts
   POST -> tambah stage baru ke board Kanban
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';
import type { PipelineStage } from '@/server/types';

export const dynamic = 'force-dynamic';

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(req: Request) {
  ensureDataLoaded();
  try {
    const { label } = await readJson<{ label?: string }>(req);
    if (!label || !label.trim()) return fail('Nama stage wajib diisi', 400);

    let id = slugify(label);
    if (!id) id = `stage-${Date.now()}`;
    if (state.pipelineStages.some((s) => s.id === id)) {
      id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const stage: PipelineStage = { id, label: label.trim() };
    state.pipelineStages.push(stage);
    pipelineSave();

    return ok({ stage }, 201);
  } catch (err) {
    console.error('[Pipeline] Gagal menambah stage:', errMsg(err));
    return fail(errMsg(err));
  }
}
