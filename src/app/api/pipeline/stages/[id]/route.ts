/* =============================================================
   src/app/api/pipeline/stages/[id]/route.ts
   DELETE -> hapus stage (ditolak kalau masih ada deal di stage itu)
   ============================================================= */
import { fail, ok } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  ensureDataLoaded();

  const dealsInStage = state.pipelineDeals.filter((d) => d.stage === params.id).length;
  if (dealsInStage > 0) {
    return fail(`Stage masih punya ${dealsInStage} deal — pindahkan dulu sebelum dihapus`, 409);
  }

  const before = state.pipelineStages.length;
  state.pipelineStages = state.pipelineStages.filter((s) => s.id !== params.id);
  if (state.pipelineStages.length === before) return fail('Stage tidak ditemukan', 404);

  pipelineSave();
  return ok({});
}
