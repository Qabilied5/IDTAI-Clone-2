"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Move, SquarePen, Trash2 } from "lucide-react";

import { useAgents } from "@/hooks/useAgents";
import { usePipeline } from "@/hooks/usePipeline";
import {
  countRenewalSoon,
  filterDeals,
  formatRupiah,
  picLabel,
  type PipelineFilters,
} from "@/lib/pipeline";
import type { NewPipelineDeal } from "@/types/pipeline";

import { AddStageModal } from "./AddStageModal";
import { DealDrawer } from "./DealDrawer";
import { DealFormModal } from "./DealFormModal";
import { FloatingMenu } from "./FloatingMenu";
import { ImportLeadsModal } from "./ImportLeadsModal";
import { KanbanBoard } from "./KanbanBoard";
import { PipelineAIPanel } from "./PipelineAIPanel";
import { PipelineFlowBar } from "./PipelineFlowBar";
import { PipelineTopbar } from "./PipelineTopbar";
import { PlIcon } from "./PlIcon";
import { PlPortal } from "./PlPortal";
import { wonStageId } from "./pipeline-ui";
import "./pipeline.css";

const AI_HIDDEN_KEY = "pl-ai-panel-hidden";

type Toast = { msg: string; type: "ok" | "error" } | null;

export function PipelineContent() {
  const {
    deals, stages, isLoading, error,
    createDeal, updateDeal, moveDeal, deleteDeal, addStage, deleteStage, reorderStages,
    importLeads, sheetNotice,
    insights, insightsLoading, insightsError, loadInsights, refresh,
  } = usePipeline();
  const { agents } = useAgents({ pollIntervalMs: 30000 });

  const [filters, setFilters] = useState<PipelineFilters>({ search: "", pic: "", type: "" });
  const [showAI, setShowAI] = useState(true);
  const [dealModal, setDealModal] = useState<{ dealId: string | null; stage?: string } | null>(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [stageMenu, setStageMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [aiUpdatedAt, setAiUpdatedAt] = useState<Date | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  /* Preferensi panel AI disimpan di browser (seperti versi asli); dibaca setelah mount. */
  useEffect(() => {
    try {
      setShowAI(localStorage.getItem(AI_HIDDEN_KEY) !== "1");
    } catch {
      /* localStorage tidak tersedia → default tampil */
    }
  }, []);

  const toggleAI = () => {
    setShowAI((prev) => {
      try {
        localStorage.setItem(AI_HIDDEN_KEY, prev ? "1" : "0");
      } catch {
        /* abaikan */
      }
      return !prev;
    });
  };

  /* Seperti versi asli: insight dimuat otomatis sekali saat halaman dibuka (jika ada deal
     dan panel terlihat); setelah itu lewat tombol refresh. */
  const aiRequested = useRef(false);
  useEffect(() => {
    if (!showAI || isLoading || error || deals.length === 0 || aiRequested.current) return;
    aiRequested.current = true;
    void loadInsights();
  }, [showAI, isLoading, error, deals.length, loadInsights]);

  useEffect(() => {
    if (insights) setAiUpdatedAt(new Date());
  }, [insights]);

  const showToast = useCallback((msg: string, type: "ok" | "error" = "ok") => {
    setToast({ msg, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  /* Hasil sync stage → Google Sheet (dari usePipeline) tampil sebagai toast. */
  useEffect(() => {
    if (sheetNotice) showToast(sheetNotice.msg, sheetNotice.type);
  }, [sheetNotice, showToast]);

  /** Jalankan aksi async; error apa pun jadi toast (bukan unhandled rejection). */
  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg?: string) => {
      try {
        await fn();
        if (okMsg) showToast(okMsg);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
      }
    },
    [showToast]
  );

  const filteredDeals = useMemo(() => filterDeals(deals, filters), [deals, filters]);

  const wonId = wonStageId(stages);
  const pipelineValue = useMemo(() => deals.filter((d) => d.stage !== wonId).reduce((s, d) => s + d.value, 0), [deals, wonId]);

  /* Pilihan PIC = human agent terdaftar (Pengaturan Agent) + PIC yang sudah dipakai deal
     (agar deal lama tetap bisa difilter walau agent-nya sudah dihapus). Tanpa daftar tetap. */
  const picValues = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.nama && set.add(a.nama));
    deals.forEach((d) => d.pic && set.add(d.pic));
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [agents, deals]);

  const editingDeal = dealModal?.dealId ? deals.find((d) => d.id === dealModal.dealId) ?? null : null;
  const drawerDeal = drawerId ? deals.find((d) => d.id === drawerId) ?? null : null;

  const submitDeal = async (values: NewPipelineDeal) => {
    if (editingDeal) {
      await updateDeal(editingDeal.id, values);
      showToast("Deal diperbarui.");
    } else {
      await createDeal(values);
      showToast("Deal ditambahkan.");
    }
  };

  const nextStage = () => {
    if (!drawerDeal) return;
    const next = stages[stages.findIndex((s) => s.id === drawerDeal.stage) + 1];
    if (!next) return;
    setDrawerId(null);
    void run(() => moveDeal(drawerDeal.id, next.id));
  };

  const duplicate = (id: string) => {
    const src = deals.find((d) => d.id === id);
    if (!src) return;
    const { id: _id, activity: _activity, leadId: _leadId, ...fields } = src;
    void _id;
    void _activity;
    void _leadId; // salinan = deal manual, tidak terhubung ke baris Sheet yang sama
    void run(() => createDeal({ ...fields, company: `${src.company} (Salinan)`, date: new Date().toISOString().slice(0, 10) }), "Deal diduplikat.");
  };

  const removeDeal = (id: string) => {
    if (!window.confirm("Hapus deal ini?")) return;
    void run(() => deleteDeal(id), "Deal dihapus.");
  };

  const removeStage = (id: string) => {
    const target = stages.find((s) => s.id === id);
    if (!target) return;
    if (!window.confirm(`Hapus stage "${target.label}"?`)) return;
    // Backend menolak (409) bila stage masih punya deal → pesannya tampil sebagai toast.
    void run(() => deleteStage(id), "Stage dihapus.");
  };

  const closeCardMenu = useCallback(() => setCardMenu(null), []);
  const closeStageMenu = useCallback(() => setStageMenu(null), []);
  const closeDealModal = useCallback(() => setDealModal(null), []);
  const closeStageModal = useCallback(() => setStageModalOpen(false), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const linkedLeadIds = useMemo(() => new Set(deals.map((d) => d.leadId).filter((v): v is number => v != null)), [deals]);
  const closeDrawer = useCallback(() => setDrawerId(null), []);

  if (isLoading) {
    return (
      <div className="pl-root pl-page">
        <div className="pl-col-empty" style={{ margin: 24 }}>Memuat pipeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pl-root pl-page">
        <div className="pl-ai-error" style={{ margin: 24 }}>
          <span>{error}</span>
          <button type="button" className="pl-ai-retry-btn" onClick={() => void refresh()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-root pl-page">
      <PipelineTopbar
        totalDeals={deals.length}
        totalValueLabel={formatRupiah(pipelineValue)}
        renewalCount={countRenewalSoon(deals, 45)}
        picValues={picValues}
        filters={filters}
        onFiltersChange={setFilters}
        showAI={showAI}
        onToggleAI={toggleAI}
        onAddStage={() => setStageModalOpen(true)}
        onAddDeal={() => setDealModal({ dealId: null })}
        onImportLeads={() => setImportOpen(true)}
      />

      {stages.length > 0 && <PipelineFlowBar deals={deals} stages={stages} />}

      <PipelineAIPanel
        hidden={!showAI}
        insights={insights}
        isLoading={insightsLoading}
        error={insightsError}
        updatedAt={aiUpdatedAt}
        hasDeals={deals.length > 0}
        deals={deals}
        onRefresh={() => void loadInsights()}
        onOpenDeal={setDrawerId}
      />

      <KanbanBoard
        deals={filteredDeals}
        stages={stages}
        layoutKey={showAI}
        onOpenDeal={setDrawerId}
        onMoveDeal={(id, stage) => void run(() => moveDeal(id, stage))}
        onAddDealToStage={(stage) => setDealModal({ dealId: null, stage })}
        onCardMenu={(e, id) => {
          e.stopPropagation();
          setStageMenu(null);
          setCardMenu({ x: e.clientX, y: e.clientY, id });
        }}
        onStageMenu={(e, id) => {
          e.stopPropagation();
          setCardMenu(null);
          setStageMenu({ x: e.clientX, y: e.clientY, id });
        }}
        onAddStage={() => setStageModalOpen(true)}
        onReorderStages={(order) => void run(() => reorderStages(order))}
      />

      <PlPortal>
        {dealModal && (
          <DealFormModal
            key={dealModal.dealId ?? `new-${dealModal.stage ?? ""}`}
            stages={stages}
            deal={editingDeal}
            defaultStage={dealModal.stage}
            picValues={picValues}
            picLabelOf={picLabel}
            onClose={closeDealModal}
            onSubmit={submitDeal}
          />
        )}

        {stageModalOpen && (
          <AddStageModal
            onClose={closeStageModal}
            onSubmit={async (label) => {
              await addStage(label);
              showToast("Stage ditambahkan.");
            }}
          />
        )}

        {importOpen && (
          <ImportLeadsModal
            existingLeadIds={linkedLeadIds}
            onClose={closeImport}
            onImport={async (inputs) => {
              const r = await importLeads(inputs);
              showToast(r.created > 0 ? `${r.created} lead diimpor ke pipeline${r.skipped ? `, ${r.skipped} dilewati` : ""}.` : "Semua lead terpilih sudah ada di pipeline.");
              return r;
            }}
          />
        )}

        {drawerDeal && (
          <DealDrawer
            deal={drawerDeal}
            stages={stages}
            onClose={closeDrawer}
            onEdit={() => {
              setDrawerId(null);
              setDealModal({ dealId: drawerDeal.id });
            }}
            onNextStage={nextStage}
          />
        )}

        {cardMenu && (
          <FloatingMenu
            x={cardMenu.x}
            y={cardMenu.y}
            onClose={closeCardMenu}
            items={[
              { label: "Edit Deal", icon: <PlIcon icon={SquarePen} />, onSelect: () => { setCardMenu(null); setDealModal({ dealId: cardMenu.id }); } },
              { label: "Pindah Stage", icon: <PlIcon icon={Move} />, onSelect: () => { setCardMenu(null); setDrawerId(cardMenu.id); } },
              { label: "Duplikat Deal", icon: <PlIcon icon={Copy} />, onSelect: () => { setCardMenu(null); duplicate(cardMenu.id); } },
              { label: "Hapus Deal", icon: <PlIcon icon={Trash2} />, danger: true, dividerBefore: true, onSelect: () => { setCardMenu(null); removeDeal(cardMenu.id); } },
            ]}
          />
        )}

        {stageMenu && (
          <FloatingMenu
            x={stageMenu.x}
            y={stageMenu.y}
            onClose={closeStageMenu}
            items={[{ label: "Hapus Stage", icon: <PlIcon icon={Trash2} />, danger: true, onSelect: () => { setStageMenu(null); removeStage(stageMenu.id); } }]}
          />
        )}

        {toast && (
          <div className={`pl-toast ${toast.type}`} role="status">
            {toast.msg}
          </div>
        )}
      </PlPortal>
    </div>
  );
}
