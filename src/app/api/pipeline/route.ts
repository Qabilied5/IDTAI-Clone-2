/* =============================================================
   src/app/api/pipeline/route.ts
   GET  -> daftar deal + stage (board Kanban)
   POST -> buat deal baru
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { ensureDataLoaded } from '@/server/store';
import { state } from '@/server/state';
import { pipelineSave } from '@/server/store';
import type { PipelineDeal } from '@/server/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDataLoaded();
  return ok({ deals: state.pipelineDeals, stages: state.pipelineStages });
}

export async function POST(req: Request) {
  ensureDataLoaded();
  try {
    const body = await readJson<Partial<PipelineDeal>>(req);

    if (!body.company || !String(body.company).trim()) {
      return fail('Nama perusahaan wajib diisi', 400);
    }
    if (!body.stage || !state.pipelineStages.some((s) => s.id === body.stage)) {
      return fail('Stage tidak valid', 400);
    }

    const deal: PipelineDeal = {
      id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      company: String(body.company).trim(),
      contactName: body.contactName || '',
      product: body.product || '',
      value: Number(body.value) || 0,
      stage: body.stage,
      type: (body.type as PipelineDeal['type']) || 'baru',
      pic: body.pic || '',
      recurring: !!body.recurring,
      interval: body.recurring ? body.interval || null : null,
      endDate: body.recurring ? body.endDate || null : null,
      date: body.date || new Date().toISOString().slice(0, 10),
      notes: body.notes || '',
      activity: [{ text: 'Deal dibuat', time: new Date().toISOString() }],
    };

    state.pipelineDeals.unshift(deal);
    pipelineSave();

    return ok({ deal }, 201);
  } catch (err) {
    console.error('[Pipeline] Gagal membuat deal:', errMsg(err));
    return fail(errMsg(err));
  }
}
