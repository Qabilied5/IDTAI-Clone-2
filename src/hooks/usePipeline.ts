"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addStage as apiAddStage,
  createDeal as apiCreateDeal,
  deleteDeal as apiDeleteDeal,
  deleteStage as apiDeleteStage,
  fetchPipeline,
  fetchPipelineInsights,
  importLeadDeals,
  reorderStages as apiReorderStages,
  updateDeal as apiUpdateDeal,
} from "@/lib/pipeline-api";
import { syncLeadStageToSheet, SheetNotConnectedError } from "@/lib/pipeline-sheet";
import { wonStageId } from "@/components/pipeline/pipeline-ui";
import type {
  LeadDealInput,
  NewPipelineDeal,
  PipelineDeal,
  PipelineInsights,
  PipelineStage,
} from "@/types/pipeline";

export function usePipeline() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Hasil sync ke Google Sheet (non-fatal): perpindahan stage tetap tersimpan walau Sheet gagal. */
  const [sheetNotice, setSheetNotice] = useState<{ msg: string; type: "ok" | "error"; n: number } | null>(null);

  const [insights, setInsights] = useState<PipelineInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPipeline();
      setDeals(data.deals);
      setStages(data.stages);
      setError(null);
    } catch {
      setError("Gagal memuat data pipeline.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createDeal(input: NewPipelineDeal) {
    const deal = await apiCreateDeal(input);
    setDeals((prev) => [deal, ...prev]);
    return deal;
  }

  /* Deal yang berasal dari lead: stage baru ditulis balik ke kolom "Pipeline Stage" di Sheet;
     pindah ke Won juga mengubah status lead jadi "Closed". */
  async function syncToSheet(deal: PipelineDeal) {
    if (deal.leadId == null) return;
    const label = stages.find((s) => s.id === deal.stage)?.label ?? deal.stage;
    const isWon = deal.stage === wonStageId(stages);
    try {
      await syncLeadStageToSheet(deal.leadId, label, isWon);
      setSheetNotice({ msg: isWon ? "Lead di Google Sheet ditandai Closed." : "Stage lead di Google Sheet diperbarui.", type: "ok", n: Date.now() });
    } catch (err) {
      const msg = err instanceof SheetNotConnectedError ? err.message : "Stage tersimpan, tapi gagal sync ke Google Sheet.";
      setSheetNotice({ msg, type: "error", n: Date.now() });
    }
  }

  async function updateDeal(id: string, patch: Partial<PipelineDeal>) {
    const before = deals.find((d) => d.id === id);
    const deal = await apiUpdateDeal(id, patch);
    setDeals((prev) => prev.map((d) => (d.id === id ? deal : d)));
    if (before && patch.stage && patch.stage !== before.stage) void syncToSheet(deal);
    return deal;
  }

  /* Impor lead dari Google Sheet jadi deal (lead yang sudah punya deal dilewati server). */
  async function importLeads(inputs: LeadDealInput[]) {
    const { created, skipped } = await importLeadDeals(inputs);
    if (created.length > 0) setDeals((prev) => [...created, ...prev]);
    return { created: created.length, skipped };
  }

  async function moveDeal(id: string, stage: string) {
    return updateDeal(id, { stage });
  }

  async function deleteDeal(id: string) {
    await apiDeleteDeal(id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  async function addStage(label: string) {
    const stage = await apiAddStage(label);
    setStages((prev) => [...prev, stage]);
    return stage;
  }

  async function deleteStage(id: string) {
    await apiDeleteStage(id);
    setStages((prev) => prev.filter((s) => s.id !== id));
  }

  /* Urutan stage berubah di layar seketika (optimistic), lalu disimpan ke server.
     Jika server menolak, urutan lama dikembalikan dan error dilempar ke pemanggil. */
  async function reorderStages(order: string[]) {
    const previous = stages;
    const next = order
      .map((id) => previous.find((s) => s.id === id))
      .filter((s): s is PipelineStage => Boolean(s));
    if (next.length !== previous.length) return;
    setStages(next);
    try {
      await apiReorderStages(order);
    } catch (err) {
      setStages(previous);
      throw err;
    }
  }

  const loadInsights = useCallback(async () => {
    if (deals.length === 0) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const result = await fetchPipelineInsights(deals, stages);
      setInsights(result);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Gagal memuat AI Insights.");
    } finally {
      setInsightsLoading(false);
    }
  }, [deals, stages]);

  return {
    deals,
    stages,
    isLoading,
    error,
    createDeal,
    updateDeal,
    moveDeal,
    deleteDeal,
    addStage,
    deleteStage,
    reorderStages,
    insights,
    insightsLoading,
    insightsError,
    loadInsights,
    importLeads,
    sheetNotice,
    refresh: load,
  };
}
