/* =============================================================
   src/server/pipeline.ts
   Insight pipeline via Ollama — AI hanya menyiapkan insight,
   keputusan tetap di tangan sales/PIC.
   ============================================================= */
import { PIPELINE_OLLAMA_MODEL } from './config';
import { ollamaGenerate, extractJson } from './ollama';
import { buildPipelinePrompt } from './prompts';

export interface PipelineInsightResult {
  summary: string;
  insights: any[];
  forecast: { likely_close_value: number; at_risk_value: number };
}

export async function generatePipelineInsights({ deals, stages }: { deals: any[]; stages: string[] }): Promise<PipelineInsightResult> {
  const today = new Date().toISOString().slice(0, 10);

  const slimDeals = deals.map((d) => ({
    id: d.id,
    company: d.company,
    product: d.product,
    value: d.value,
    stage: d.stage,
    type: d.type,
    pic: d.pic,
    recurring: !!d.recurring,
    interval: d.interval || null,
    endDate: d.endDate || null,
    date: d.date,
    lastActivity: d.activity && d.activity[0] ? d.activity[0].text : null,
    lastActivityTime: d.activity && d.activity[0] ? d.activity[0].time : null,
  }));

  const prompt = buildPipelinePrompt({ today, stages, deals: slimDeals });
  const raw = await ollamaGenerate(prompt, { model: PIPELINE_OLLAMA_MODEL, temperature: 0.2, num_ctx: 8192, format: 'json' });

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    console.error('Gagal parse JSON dari Ollama:', raw);
    throw new Error('Respons AI tidak valid (bukan JSON), coba lagi');
  }

  return {
    summary: parsed.summary || '',
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    forecast: parsed.forecast || { likely_close_value: 0, at_risk_value: 0 },
  };
}
