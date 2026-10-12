"use client";

import { useEffect } from "react";
import { ArrowRight, History, Info, RefreshCw, SquarePen, TriangleAlert, X } from "lucide-react";

import { formatRupiah, picLabel } from "@/lib/pipeline";
import type { PipelineDeal, PipelineStage } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";
import {
  TYPE_NAMES,
  TYPE_TAG_CLASS,
  daysUntil,
  formatActivityTime,
  formatDate,
  intervalLabel,
  renewalClass,
  renewalWidth,
} from "./pipeline-ui";

interface Props {
  deal: PipelineDeal;
  stages: PipelineStage[];
  onClose: () => void;
  onEdit: () => void;
  onNextStage: () => void;
}

export function DealDrawer({ deal: d, stages, onClose, onEdit, onNextStage }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stageIdx = stages.findIndex((s) => s.id === d.stage);
  const hasNext = stageIdx !== -1 && stageIdx < stages.length - 1;
  const days = d.recurring ? daysUntil(d.endDate) : null;
  const cls = renewalClass(days);
  const daysText = days === null ? "" : days <= 0 ? "Sudah berakhir" : `${days} hari lagi`;

  return (
    <div className="pl-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-drawer" role="dialog" aria-modal="true" aria-label={`Detail deal ${d.company}`}>
        <div className="pl-drawer-head">
          <div className="pl-drawer-head-top">
            <div className="pl-drawer-company">{d.company}</div>
            <button type="button" className="pl-drawer-close" onClick={onClose} aria-label="Tutup">
              <PlIcon icon={X} />
            </button>
          </div>
          <div className="pl-drawer-stage-row">
            <span className={`pl-tag ${TYPE_TAG_CLASS[d.type] ?? "pl-tag-new"}`}>{TYPE_NAMES[d.type] ?? d.type}</span>
            {d.recurring && <span className="pl-tag pl-tag-recurring">Recurring</span>}
          </div>
        </div>

        <div className="pl-stage-steps">
          {stages.map((s, i) => (
            <div key={s.id} className={`pl-stage-step ${i < stageIdx ? "done" : i === stageIdx ? "current" : ""}`} />
          ))}
        </div>
        <div className="pl-stage-step-labels">
          {stages.map((s, i) => (
            <div key={s.id} className={`pl-stage-step-label ${i === stageIdx ? "current" : ""}`}>
              {s.label}
            </div>
          ))}
        </div>

        <div className="pl-drawer-body">
          <div className="pl-dk-section">
            <div className="pl-dk-sec-title">
              <PlIcon icon={Info} /> Detail Deal
            </div>
            <div className="pl-dk-grid">
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">Produk / Layanan</div>
                <div className="pl-dk-item-value">{d.product || "—"}</div>
              </div>
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">Nilai</div>
                <div className="pl-dk-item-value green">{formatRupiah(d.value)}</div>
              </div>
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">Kontak</div>
                <div className="pl-dk-item-value">{d.contactName || "—"}</div>
              </div>
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">PIC</div>
                <div className="pl-dk-item-value">{picLabel(d.pic)}</div>
              </div>
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">Tipe Deal</div>
                <div className="pl-dk-item-value">{TYPE_NAMES[d.type] ?? d.type}</div>
              </div>
              <div className="pl-dk-item">
                <div className="pl-dk-item-label">Dibuat</div>
                <div className="pl-dk-item-value">{formatDate(d.date)}</div>
              </div>
            </div>
          </div>

          {d.recurring && (
            <>
              <div className="pl-dk-section">
                <div className="pl-dk-sec-title">
                  <PlIcon icon={RefreshCw} style={{ color: "var(--green)" }} /> Info Kontrak Berulang
                </div>
                <div className="pl-dk-grid">
                  <div className="pl-dk-item">
                    <div className="pl-dk-item-label">Interval</div>
                    <div className="pl-dk-item-value">{intervalLabel(d.interval)}</div>
                  </div>
                  <div className="pl-dk-item">
                    <div className="pl-dk-item-label">Berakhir</div>
                    <div className={`pl-dk-item-value ${cls}`}>{formatDate(d.endDate)}</div>
                  </div>
                  <div className="pl-dk-item">
                    <div className="pl-dk-item-label">Sisa Hari</div>
                    <div className={`pl-dk-item-value ${cls}`}>{days !== null ? `${days} hari` : "—"}</div>
                  </div>
                </div>
                <div className="pl-renewal-progress" style={{ marginTop: 6 }}>
                  <div className={`pl-renewal-fill ${cls}`} style={{ width: `${renewalWidth(days)}%` }} />
                </div>
              </div>

              {days !== null && days <= 45 && (
                <div className="pl-renewal-info-box">
                  <PlIcon icon={TriangleAlert} />
                  <div className="pl-renewal-info-text">
                    <div className="pl-renewal-info-title">Renewal Segera — {daysText}</div>
                    <div className="pl-renewal-info-sub">
                      Kontrak berakhir <strong>{formatDate(d.endDate)}</strong>. Segera tindak lanjuti perpanjangan kontrak.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {d.notes && (
            <div className="pl-dk-section">
              <div className="pl-dk-sec-title">Catatan</div>
              <div style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.6 }}>{d.notes}</div>
            </div>
          )}

          <div className="pl-dk-section">
            <div className="pl-dk-sec-title">
              <PlIcon icon={History} /> Riwayat Aktivitas
            </div>
            <div className="pl-activity-list">
              {d.activity.length ? (
                d.activity.map((a, i) => (
                  <div className="pl-activity-item" key={`${a.time}-${i}`}>
                    <div className="pl-act-dot" style={{ background: "var(--gray-400)" }} />
                    <div className="pl-act-body">
                      <div className="pl-act-text">{a.text}</div>
                      <div className="pl-act-time">{formatActivityTime(a.time)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: "var(--gray-400)" }}>Belum ada aktivitas.</div>
              )}
            </div>
          </div>
        </div>

        <div className="pl-drawer-foot">
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onEdit}>
            <PlIcon icon={SquarePen} /> Edit
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={onNextStage} disabled={!hasNext}>
            <PlIcon icon={ArrowRight} /> Pindah Stage
          </button>
        </div>
      </div>
    </div>
  );
}
