"use client";

import Link from "next/link";
import { Bot, Calendar, File } from "lucide-react";

import type { KbDoc } from "@/types/knowledge-base";
import { CAT_ICON, IconActivate, IconDelete, IconEdit, IconPreview, SrcIcon } from "./kb-icons";
import { catLabel, coveragePct, fmtDate, fmtSize } from "./kb-utils";

interface Props {
  doc: KbDoc;
  selectMode: boolean;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onPreview: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onActivate: (id: number) => void;
}

export function KbDocCard({ doc, selectMode, selected, onSelect, onPreview, onEdit, onDelete, onActivate }: Props) {
  const inactive = doc.status !== "aktif";
  const CatIcon = CAT_ICON[doc.category] ?? CAT_ICON.umum;
  const cov = coveragePct(doc);
  const covClass = doc.extractFailed ? "kb-cov-gray" : cov < 40 ? "kb-cov-amber" : "";
  const covColor = doc.extractFailed ? "var(--kb-gray-400)" : cov < 40 ? "var(--kb-amber)" : undefined;
  const dim = inactive ? { opacity: 0.5 } : undefined;

  return (
    <div className="kb-card" data-cat={doc.category} data-status={doc.status}>
      {selectMode && (
        <label className="kb-select-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Pilih ${doc.title}`}
            onChange={(e) => onSelect(doc.id, e.target.checked)}
          />
        </label>
      )}

      <div className="kb-card-top">
        <div className="kb-file-icon kb-icon-pdf" style={inactive ? { opacity: 0.45 } : undefined}>
          <SrcIcon doc={doc} />
        </div>
        <div className="kb-card-badges">
          {doc.status === "aktif" ? (
            <>
              <span className="kb-badge kb-badge-aktif"><span className="kb-dot kb-dot-green" />Aktif</span>
              {!doc.extractFailed && <span className="kb-badge kb-badge-ai"><Bot aria-hidden />Terlatih</span>}
            </>
          ) : doc.status === "draft" ? (
            <span className="kb-badge kb-badge-nonaktif"><span className="kb-dot kb-dot-amber" />Draft</span>
          ) : (
            <span className="kb-badge kb-badge-nonaktif"><span className="kb-dot kb-dot-gray" />Nonaktif</span>
          )}
        </div>
      </div>

      <div className={`kb-card-name${inactive ? " kb-card-muted" : ""}`}>
        <Link href={`/knowledge-base/${doc.id}`}>{doc.title}</Link>
      </div>

      <div className="kb-card-meta" style={dim}>
        <span><CatIcon aria-hidden /> {catLabel(doc.category)}</span>
        <span><File aria-hidden /> {doc.sourceType === "url" ? "URL" : fmtSize(doc.sizeBytes)}</span>
      </div>

      <div className={`kb-card-cov${doc.extractFailed ? " kb-cov-muted" : ""}`}>
        <span className="kb-cov-label">{doc.extractFailed ? "Gagal ekstrak" : "Cakupan AI"}</span>
        <div className="kb-cov-track">
          <div className={`kb-cov-fill ${covClass}`.trim()} style={{ width: `${doc.extractFailed ? 100 : cov}%` }} />
        </div>
        <span className="kb-cov-pct" style={covColor ? { color: covColor } : undefined}>
          {doc.extractFailed ? "N/A" : `${cov}%`}
        </span>
      </div>

      <div className="kb-card-footer">
        <span className="kb-card-date" style={dim}>
          <Calendar aria-hidden /> Diperbarui {fmtDate(doc.updatedAt)}
        </span>
        <div className="kb-card-actions">
          {inactive ? (
            <button type="button" className="kb-icon-btn kb-icon-success" title="Aktifkan kembali" aria-label="Aktifkan kembali" onClick={() => onActivate(doc.id)}>
              <IconActivate />
            </button>
          ) : (
            <>
              <button type="button" className="kb-icon-btn" title="Pratinjau" aria-label="Pratinjau" onClick={() => onPreview(doc.id)}><IconPreview /></button>
              <button type="button" className="kb-icon-btn" title="Edit" aria-label="Edit" onClick={() => onEdit(doc.id)}><IconEdit /></button>
            </>
          )}
          <button type="button" className="kb-icon-btn kb-icon-danger" title={inactive ? "Hapus permanen" : "Hapus"} aria-label={inactive ? "Hapus permanen" : "Hapus"} onClick={() => onDelete(doc.id)}>
            <IconDelete />
          </button>
        </div>
      </div>
    </div>
  );
}
