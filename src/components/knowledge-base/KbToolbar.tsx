"use client";

import { forwardRef } from "react";
import { Bot, Brain, CircleCheck, Database, Files, MessageCircleQuestion, Plus, RefreshCw, Search } from "lucide-react";

import type { KbDoc } from "@/types/knowledge-base";
import { coveragePct, fmtDate, fmtSize } from "./kb-utils";

interface ToolbarProps {
  query: string;
  onQuery: (q: string) => void;
  activeCount: number;
  onTrain: () => void;
  onAdd: () => void;
}

/** Search + status AI + tombol aksi. Ref diteruskan ke <input> untuk pintasan ⌘K / Ctrl+K. */
export const KbToolbar = forwardRef<HTMLInputElement, ToolbarProps>(function KbToolbar(
  { query, onQuery, activeCount, onTrain, onAdd },
  ref
) {
  return (
    <div className="kb-toolbar">
      <div className="kb-toolbar-left">
        <div className="kb-search-wrap">
          <Search aria-hidden />
          <input
            ref={ref}
            type="text"
            value={query}
            placeholder="Cari dokumen, FAQ, SOP…"
            aria-label="Cari dokumen"
            onChange={(e) => onQuery(e.target.value)}
          />
          <kbd className="kb-shortcut">⌘K</kbd>
        </div>
        <div className="kb-ai-pill">
          <span className="kb-pulse-dot" />
          <Bot aria-hidden />
          AI siap menjawab dari <strong>{activeCount}</strong> dokumen
        </div>
      </div>
      <div className="kb-toolbar-right">
        <button type="button" className="kb-btn-ghost" onClick={onTrain}>
          <RefreshCw aria-hidden /> Latih Ulang AI
        </button>
        <button type="button" className="kb-btn-primary" onClick={onAdd}>
          <Plus aria-hidden /> Tambah Dokumen
        </button>
      </div>
    </div>
  );
});

/** Baris statistik. Semua angka dihitung dari dokumen nyata (referensi memakai angka contoh statis). */
export function KbStatsBar({ docs }: { docs: KbDoc[] }) {
  const active = docs.filter((d) => d.status === "aktif");
  const faq = docs.filter((d) => d.category === "faq").length;
  const bytes = docs.reduce((s, d) => s + (d.sizeBytes || 0), 0);
  const lastTrained = active.length ? Math.max(...active.map((d) => d.updatedAt)) : 0;
  const avgCov = active.length ? Math.round(active.reduce((s, d) => s + coveragePct(d), 0) / active.length) : 0;

  return (
    <div className="kb-stats-bar">
      <div className="kb-stat-item"><Files aria-hidden /><span><strong>{docs.length}</strong> Dokumen</span></div>
      <div className="kb-stat-sep" />
      <div className="kb-stat-item"><MessageCircleQuestion aria-hidden /><span><strong>{faq}</strong> FAQ</span></div>
      <div className="kb-stat-sep" />
      <div className="kb-stat-item">
        <CircleCheck aria-hidden />
        <span>Diperbarui <strong className="kb-text-green">{lastTrained ? fmtDate(lastTrained) : "—"}</strong></span>
      </div>
      <div className="kb-stat-sep" />
      <div className="kb-stat-item"><Brain aria-hidden /><span>Rata-rata cakupan AI <strong className="kb-text-green">{avgCov}%</strong></span></div>
      <div className="kb-stat-sep" />
      <div className="kb-stat-item"><Database aria-hidden /><span><strong>{fmtSize(bytes)}</strong> digunakan</span></div>
    </div>
  );
}
