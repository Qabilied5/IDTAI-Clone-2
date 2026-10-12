/* =============================================================
   src/app/api/pipeline/[id]/route.ts
   PATCH  -> update field deal (termasuk pindah stage)
   DELETE -> hapus deal
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';
import type { PipelineDeal } from '@/server/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  ensureDataLoaded();
  try {
    const patch = await readJson<Partial<PipelineDeal>>(req);
    const idx = state.pipelineDeals.findIndex((d) => d.id === params.id);
    if (idx === -1) return fail('Deal tidak ditemukan', 404);

    const current = state.pipelineDeals[idx];

    if (patch.stage && patch.stage !== current.stage) {
      const targetStage = state.pipelineStages.find((s) => s.id === patch.stage);
      if (!targetStage) return fail('Stage tidak valid', 400);
      current.activity.unshift({
        text: `Dipindahkan ke stage "${targetStage.label}"`,
        time: new Date().toISOString(),
      });
    }

    const updated: PipelineDeal = {
      ...current,
      ...patch,
      id: current.id,
      activity: current.activity,
      interval: patch.recurring === false ? null : patch.interval ?? current.interval,
      endDate: patch.recurring === false ? null : patch.endDate ?? current.endDate,
    };

    state.pipelineDeals[idx] = updated;
    pipelineSave();

    return ok({ deal: updated });
  } catch (err) {
    console.error('[Pipeline] Gagal update deal:', errMsg(err));
    return fail(errMsg(err));
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  ensureDataLoaded();
  const before = state.pipelineDeals.length;
  state.pipelineDeals = state.pipelineDeals.filter((d) => d.id !== params.id);

  if (state.pipelineDeals.length === before) {
    return fail('Deal tidak ditemukan', 404);
  }

  pipelineSave();
  return ok({});
}
