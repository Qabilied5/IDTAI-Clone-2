"use client";

import { Brain, LayoutGrid } from "lucide-react";

import type { KbDoc, KbStatus } from "@/types/knowledge-base";
import { CAT_ICON } from "./kb-icons";
import { CATEGORIES, coveragePct } from "./kb-utils";

export type StatusFilter = "semua" | KbStatus;

interface Props {
  docs: KbDoc[];
  cat: string;
  onCat: (id: string) => void;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string; dot?: string }[] = [
  { value: "semua", label: "Semua Status" },
  { value: "aktif", label: "Aktif", dot: "kb-dot-green" },
  { value: "draft", label: "Draft", dot: "kb-dot-amber" },
  { value: "nonaktif", label: "Nonaktif", dot: "kb-dot-gray" },
];

/** Kategori yang ditampilkan di widget "Cakupan AI" (sama dengan referensi). */
const COVERAGE_ROWS: { id: string; label: string }[] = [
  { id: "produk", label: "Produk" },
  { id: "harga", label: "Harga" },
  { id: "faq", label: "FAQ" },
  { id: "pengiriman", label: "Pengiriman" },
];

export function KbSidebar({ docs, cat, onCat, status, onStatus }: Props) {
  const count = (id: string) => (id === "semua" ? docs.length : docs.filter((d) => d.category === id).length);

  // Cakupan per kategori = rata-rata cakupan dokumen AKTIF di kategori itu (0 jika belum ada).
  const coverage = (id: string) => {
    const list = docs.filter((d) => d.category === id && d.status === "aktif");
    return list.length ? Math.round(list.reduce((s, d) => s + coveragePct(d), 0) / list.length) : 0;
  };

  return (
    <div className="kb-sidebar">
      <div className="kb-cat-label">Kategori</div>

      <div className={`kb-cat-item${cat === "semua" ? " active" : ""}`} role="button" tabIndex={0}
           onClick={() => onCat("semua")} onKeyDown={(e) => e.key === "Enter" && onCat("semua")}>
        <LayoutGrid aria-hidden />
        <span>Semua Dokumen</span>
        <span className="kb-cat-count">{count("semua")}</span>
      </div>
      {CATEGORIES.map(({ id, label }) => {
        const Icon = CAT_ICON[id];
        return (
          <div key={id} className={`kb-cat-item${cat === id ? " active" : ""}`} role="button" tabIndex={0}
               onClick={() => onCat(id)} onKeyDown={(e) => e.key === "Enter" && onCat(id)}>
            <Icon aria-hidden />
            <span>{label}</span>
            <span className="kb-cat-count">{count(id)}</span>
          </div>
        );
      })}

      <div className="kb-cat-label" style={{ marginTop: 16 }}>Status</div>
      <div className="kb-status-filter" role="radiogroup" aria-label="Filter status">
        {STATUS_OPTIONS.map((o) => (
          <label key={o.value} className="kb-radio-row">
            <input type="radio" name="kb-status" value={o.value} checked={status === o.value} onChange={() => onStatus(o.value)} />
            {o.dot && <span className={`kb-dot ${o.dot}`} />}
            <span>{o.label}</span>
          </label>
        ))}
      </div>

      <div className="kb-coverage-card">
        <div className="kb-coverage-title"><Brain aria-hidden /> Cakupan AI</div>
        <div className="kb-coverage-list">
          {COVERAGE_ROWS.map(({ id, label }) => {
            const pct = coverage(id);
            const amber = pct < 60;
            return (
              <div key={id} className="kb-coverage-row">
                <span>{label}</span>
                <div className="kb-cov-track">
                  <div className={`kb-cov-fill${amber ? " kb-cov-amber" : ""}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="kb-cov-pct" style={amber ? { color: "var(--kb-amber)" } : undefined}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
