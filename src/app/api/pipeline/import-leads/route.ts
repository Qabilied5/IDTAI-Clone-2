/* =============================================================
   src/app/api/pipeline/import-leads/route.ts
   POST -> buat deal dari lead Google Sheet (Kontak / Leads).
   Lead yang sudah punya deal (leadId sama) dilewati, jadi aman diklik berulang.
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';
import type { PipelineDeal } from '@/server/types';

export const dynamic = 'force-dynamic';

interface LeadDealBody {
  leadId?: number;
  company?: string;
  contactName?: string;
  product?: string;
  value?: number;
  type?: PipelineDeal['type'];
  date?: string;
  notes?: string;
  stageHint?: string;
  closed?: boolean;
}

export async function POST(req: Request) {
  ensureDataLoaded();
  try {
    const { deals } = await readJson<{ deals?: LeadDealBody[] }>(req);
    if (!Array.isArray(deals) || deals.length === 0) return fail('Tidak ada lead yang dipilih', 400);

    const stages = state.pipelineStages;
    if (stages.length === 0) return fail('Belum ada stage pipeline', 400);
    const firstStage = stages[0].id;
    const wonStage = stages.some((s) => s.id === 'won') ? 'won' : stages[stages.length - 1].id;

    const resolveStage = (d: LeadDealBody): string => {
      if (d.closed) return wonStage;
      const hint = (d.stageHint || '').trim().toLowerCase();
      if (!hint) return firstStage;
      return stages.find((s) => s.id.toLowerCase() === hint || s.label.toLowerCase() === hint)?.id ?? firstStage;
    };

    const linked = new Set(state.pipelineDeals.map((d) => d.leadId).filter((v) => v != null));
    const created: PipelineDeal[] = [];
    let skipped = 0;

    for (const d of deals) {
      const leadId = Number(d.leadId);
      const company = String(d.company || '').trim();
      if (!Number.isFinite(leadId) || !company || linked.has(leadId)) {
        skipped++;
        continue;
      }
      linked.add(leadId);
      created.push({
        id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        leadId,
        company,
        contactName: d.contactName || '',
        product: d.product || '',
        value: Number(d.value) || 0,
        stage: resolveStage(d),
        type: d.type || 'baru',
        pic: '',
        recurring: false,
        interval: null,
        endDate: null,
        date: d.date || new Date().toISOString().slice(0, 10),
        notes: d.notes || '',
        activity: [{ text: 'Diimpor dari Kontak / Leads (Google Sheet)', time: new Date().toISOString() }],
      });
    }

    if (created.length > 0) {
      state.pipelineDeals.unshift(...created);
      pipelineSave();
    }
    return ok({ created, skipped }, created.length > 0 ? 201 : 200);
  } catch (err) {
    console.error('[Pipeline] Gagal impor lead:', errMsg(err));
    return fail(errMsg(err));
  }
}
