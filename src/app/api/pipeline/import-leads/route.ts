/* =============================================================
   src/app/api/pipeline/import-leads/route.ts
   POST -> impor / sinkron deal dari lead Google Sheet (Kontak / Leads).
   - Lead baru → deal baru (stage dari nilai kolom Sheet; stage yang belum ada bisa dibuat otomatis).
   - Lead yang sudah punya deal (leadId sama) → dilewati, atau dipindah stage bila updateExisting.
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, pipelineSave } from '@/server/store';
import type { PipelineDeal } from '@/server/types';

export const dynamic = 'force-dynamic';

interface LeadDealBody {
  leadId?: number;
  sheetRow?: number;
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

const lc = (s: string) => s.trim().toLowerCase();

function slug(label: string) {
  return lc(label).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stage';
}

export async function POST(req: Request) {
  ensureDataLoaded();
  try {
    const body = await readJson<{ deals?: LeadDealBody[]; createMissingStages?: boolean; updateExisting?: boolean }>(req);
    const { deals, createMissingStages = false, updateExisting = false } = body;
    if (!Array.isArray(deals) || deals.length === 0) return fail('Tidak ada lead yang dipilih', 400);
    if (state.pipelineStages.length === 0) return fail('Belum ada stage pipeline', 400);

    const stagesAdded: string[] = [];
    const wonStage = () => (state.pipelineStages.some((s) => s.id === 'won') ? 'won' : state.pipelineStages[state.pipelineStages.length - 1].id);
    const findStage = (hint: string) => state.pipelineStages.find((s) => lc(s.id) === lc(hint) || lc(s.label) === lc(hint));

    /** Stage dari nilai kolom Sheet; kosong/tidak cocok → stage pertama (atau buat baru bila diizinkan). */
    const resolveStage = (d: LeadDealBody): string => {
      const hint = (d.stageHint || '').trim();
      if (!hint) return d.closed ? wonStage() : state.pipelineStages[0].id;

      const found = findStage(hint);
      if (found) return found.id;
      if (!createMissingStages) return d.closed ? wonStage() : state.pipelineStages[0].id;

      const label = hint.slice(0, 30);
      let id = slug(label);
      while (state.pipelineStages.some((s) => s.id === id)) id += '-x';
      const stage = { id, label };
      const wonIdx = state.pipelineStages.findIndex((s) => s.id === 'won');
      if (wonIdx === -1) state.pipelineStages.push(stage);
      else state.pipelineStages.splice(wonIdx, 0, stage); // stage baru selalu sebelum "Won"
      stagesAdded.push(label);
      return id;
    };

    const byLead = new Map<number, PipelineDeal>();
    for (const d of state.pipelineDeals) if (d.leadId != null) byLead.set(Number(d.leadId), d);

    const created: PipelineDeal[] = [];
    let updated = 0;
    let skipped = 0;

    for (const d of deals) {
      const leadId = Number(d.leadId);
      const company = String(d.company || '').trim();
      if (!Number.isFinite(leadId) || !company) {
        skipped++;
        continue;
      }

      const existing = byLead.get(leadId);
      if (existing) {
        if (d.sheetRow) existing.sheetRow = d.sheetRow;
        if (updateExisting && (d.stageHint || '').trim()) {
          const target = resolveStage(d);
          if (target !== existing.stage) {
            const label = state.pipelineStages.find((s) => s.id === target)?.label ?? target;
            existing.stage = target;
            existing.activity.unshift({ text: `Stage disinkronkan dari Google Sheet: "${label}"`, time: new Date().toISOString() });
            updated++;
            continue;
          }
        }
        skipped++;
        continue;
      }

      const deal: PipelineDeal = {
        id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        leadId,
        sheetRow: d.sheetRow ?? null,
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
      };
      byLead.set(leadId, deal);
      created.push(deal);
    }

    if (created.length > 0) state.pipelineDeals.unshift(...created);
    if (created.length > 0 || updated > 0 || stagesAdded.length > 0 || deals.some((d) => d.sheetRow)) pipelineSave();

    return ok({ created: created.length, updated, skipped, stagesAdded }, created.length > 0 ? 201 : 200);
  } catch (err) {
    console.error('[Pipeline] Gagal impor lead:', errMsg(err));
    return fail(errMsg(err));
  }
}
