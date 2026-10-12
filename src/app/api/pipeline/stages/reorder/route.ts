/* =============================================================
   src/app/api/pipeline/stages/reorder/route.ts
   PUT { order: string[] } -> ubah urutan stage di board Kanban.
   `order` harus memuat SEMUA id stage yang ada, tepat sekali masing-masing
   (permutasi) — supaya tidak ada stage yang hilang/ganda karena request keliru.
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';
import type { PipelineStage } from '@/server/types';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  ensureDataLoaded();
  try {
    const { order } = await readJson<{ order?: unknown }>(req);
    if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
      return fail('order harus berupa array id stage', 400);
    }

    const ids = order as string[];
    const current = state.pipelineStages;
    const sameSet =
      ids.length === current.length &&
      new Set(ids).size === ids.length &&
      current.every((s) => ids.includes(s.id));
    if (!sameSet) return fail('order harus memuat semua stage tepat satu kali', 400);

    const byId = new Map(current.map((s) => [s.id, s] as const));
    state.pipelineStages = ids.map((id) => byId.get(id) as PipelineStage);
    pipelineSave();

    return ok({ stages: state.pipelineStages });
  } catch (err) {
    console.error('[Pipeline] Gagal mengurutkan stage:', errMsg(err));
    return fail(errMsg(err));
  }
}
