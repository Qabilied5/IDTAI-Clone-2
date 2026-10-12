/* =============================================================
   src/app/api/pipeline/ai-insights/route.ts
   POST -> insight AI (Ollama) untuk seluruh deal. Dipanggil panel "AI Pipeline Insights".
   Route statis ini harus ada: tanpanya, POST /api/pipeline/ai-insights jatuh ke
   /api/pipeline/[id] dan menghasilkan 405.
   ============================================================= */
import { errMsg, fail, ok, readJson } from '@/server/http';
import { generatePipelineInsights } from '@/server/pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { deals, stages } = await readJson(req);
    if (!Array.isArray(deals)) return fail('deals harus berupa array', 400);
    const insight = await generatePipelineInsights({ deals, stages: Array.isArray(stages) ? stages : [] });
    return ok({ summary: insight.summary, insights: insight.insights, forecast: insight.forecast });
  } catch (err) {
    console.error('[Pipeline] Gagal membuat insight:', errMsg(err));
    return fail(errMsg(err));
  }
}
