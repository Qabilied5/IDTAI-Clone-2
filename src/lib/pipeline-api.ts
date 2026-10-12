import { apiFetch } from "@/lib/api";
import type {
  NewPipelineDeal,
  PipelineDeal,
  PipelineInsights,
  PipelineStage,
} from "@/types/pipeline";

interface PipelineListResponse {
  ok: boolean;
  deals: PipelineDeal[];
  stages: PipelineStage[];
}

export async function fetchPipeline(): Promise<{ deals: PipelineDeal[]; stages: PipelineStage[] }> {
  const res = await apiFetch<PipelineListResponse>("/pipeline");
  return { deals: res.deals, stages: res.stages };
}

export async function createDeal(input: NewPipelineDeal): Promise<PipelineDeal> {
  const res = await apiFetch<{ ok: boolean; deal: PipelineDeal }>("/pipeline", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.deal;
}

export async function updateDeal(id: string, patch: Partial<PipelineDeal>): Promise<PipelineDeal> {
  const res = await apiFetch<{ ok: boolean; deal: PipelineDeal }>(
    `/pipeline/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return res.deal;
}

export async function deleteDeal(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/pipeline/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addStage(label: string): Promise<PipelineStage> {
  const res = await apiFetch<{ ok: boolean; stage: PipelineStage }>("/pipeline/stages", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
  return res.stage;
}

export async function deleteStage(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/pipeline/stages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function reorderStages(order: string[]): Promise<PipelineStage[]> {
  const res = await apiFetch<{ ok: boolean; stages: PipelineStage[] }>("/pipeline/stages/reorder", {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
  return res.stages;
}

interface AiInsightResponse {
  ok: boolean;
  summary: string;
  insights: PipelineInsights["insights"];
  forecast: PipelineInsights["forecast"];
}

export async function fetchPipelineInsights(
  deals: PipelineDeal[],
  stages: PipelineStage[]
): Promise<PipelineInsights> {
  const res = await apiFetch<AiInsightResponse>("/pipeline/ai-insights", {
    method: "POST",
    body: JSON.stringify({ deals, stages: stages.map((s) => s.label) }),
  });
  return { summary: res.summary, insights: res.insights, forecast: res.forecast };
}
