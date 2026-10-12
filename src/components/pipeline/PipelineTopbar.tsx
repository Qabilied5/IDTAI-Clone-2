"use client";

import { Kanban, Layers, Table2, Plus, RefreshCw, Search, Sparkles, TrendingUp } from "lucide-react";

import { TYPE_OPTIONS, picLabel, type PipelineFilters } from "@/lib/pipeline";

import { PlIcon } from "./PlIcon";

interface Props {
  totalDeals: number;
  totalValueLabel: string;
  renewalCount: number;
  /** Kode/nama PIC yang tersedia untuk filter. */
  picValues: string[];
  filters: PipelineFilters;
  onFiltersChange: (f: PipelineFilters) => void;
  showAI: boolean;
  onToggleAI: () => void;
  onAddStage: () => void;
  onAddDeal: () => void;
  onImportLeads: () => void;
}

export function PipelineTopbar(p: Props) {
  const set = (patch: Partial<PipelineFilters>) => p.onFiltersChange({ ...p.filters, ...patch });

  return (
    <div className="pl-topbar">
      <div className="pl-topbar-left">
        <div className="pl-page-title">Pipeline</div>
        <div className="pl-summary-pills">
          <span className="pl-sum-pill total">
            <PlIcon icon={Layers} />
            <span>{p.totalDeals} Deal</span>
          </span>
          <span className="pl-sum-pill revenue">
            <PlIcon icon={TrendingUp} />
            <span>{p.totalValueLabel} pipeline</span>
          </span>
          <span className="pl-sum-pill renewal">
            <PlIcon icon={RefreshCw} />
            <span>{p.renewalCount} renewal mendekati</span>
          </span>
        </div>
      </div>

      <div className="pl-topbar-right">
        <div className="pl-search-wrap">
          <PlIcon icon={Search} />
          <input
            type="text"
            value={p.filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Cari deal atau kontak..."
            aria-label="Cari deal atau kontak"
          />
        </div>
        <select className="pl-filter-select" value={p.filters.pic} onChange={(e) => set({ pic: e.target.value })} aria-label="Filter PIC">
          <option value="">Semua PIC</option>
          {p.picValues.map((v) => (
            <option key={v} value={v}>
              {picLabel(v)}
            </option>
          ))}
        </select>
        <select className="pl-filter-select" value={p.filters.type} onChange={(e) => set({ type: e.target.value })} aria-label="Filter tipe deal">
          <option value="">Semua Tipe</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`pl-btn pl-btn-ghost pl-ai-toggle-btn${p.showAI ? "" : " active"}`}
          onClick={p.onToggleAI}
          title="Sembunyikan/tampilkan AI Insights"
        >
          <PlIcon icon={Sparkles} />
          <span>{p.showAI ? "Hide AI Insights" : "Show AI Insights"}</span>
        </button>
        <button type="button" className="pl-btn pl-btn-ghost" onClick={p.onImportLeads} title="Impor deal dari Google Sheet Kontak / Leads">
          <PlIcon icon={Table2} /> Import dari Leads
        </button>
        <button type="button" className="pl-btn pl-btn-ghost" onClick={p.onAddStage}>
          <PlIcon icon={Kanban} /> Tambah Stage
        </button>
        <button type="button" className="pl-btn pl-btn-primary" onClick={p.onAddDeal}>
          <PlIcon icon={Plus} /> Tambah Deal
        </button>
      </div>
    </div>
  );
}
