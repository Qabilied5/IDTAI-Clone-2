"use client";

import { memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { RefreshCw } from "lucide-react";

import { formatRupiah, picLabel } from "@/lib/pipeline";
import type { PipelineDeal } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";
import { TYPE_NAMES, TYPE_TAG_CLASS, daysUntil, formatDate, picAvatar, renewalClass, renewalWidth } from "./pipeline-ui";

interface Props {
  deal: PipelineDeal;
  isWon: boolean;
  onOpen: (id: string) => void;
  onMenu: (e: React.MouseEvent, id: string) => void;
  onStartDrag: (e: ReactPointerEvent<HTMLElement>, id: string) => void;
}

function DealCardBase({ deal: d, isWon, onOpen, onMenu, onStartDrag }: Props) {
  const days = d.recurring ? daysUntil(d.endDate) : null;
  const cls = renewalClass(days);
  const avatar = picAvatar(d.pic);

  return (
    <div className="pl-card" data-stage={d.stage} data-id={d.id} onClick={() => onOpen(d.id)}>
      <div
        className="pl-drag-handle"
        title="Drag untuk pindah stage"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => onStartDrag(e, d.id)}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
          <rect y="0" width="16" height="1.8" rx="0.9" fill="currentColor" />
          <rect y="4.1" width="16" height="1.8" rx="0.9" fill="currentColor" />
        </svg>
      </div>

      <div className="pl-card-top">
        <div className="pl-card-company">{d.company}</div>
        <button type="button" className="pl-card-menu" onClick={(e) => onMenu(e, d.id)} title="Opsi" aria-label="Opsi deal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
          </svg>
        </button>
      </div>

      {d.contactName && <div className="pl-card-product" style={{ marginTop: -2 }}>{d.contactName}</div>}
      {d.product && <div className="pl-card-product">{d.product}</div>}
      <div className="pl-card-value">{formatRupiah(d.value)}</div>

      <div className="pl-card-tags">
        <span className={`pl-tag ${TYPE_TAG_CLASS[d.type] ?? "pl-tag-new"}`}>{TYPE_NAMES[d.type] ?? d.type}</span>
        {d.recurring && <span className="pl-tag pl-tag-recurring">Recurring</span>}
      </div>

      <div className="pl-card-footer">
        <div className="pl-card-pic">
          <div className="pl-pic-avatar" style={{ background: avatar.color }}>
            {avatar.initials}
          </div>
          <div className="pl-pic-name">{picLabel(d.pic)}</div>
        </div>
        <div className="pl-card-date">{isWon ? (d.recurring ? "Aktif" : "Selesai") : formatDate(d.date)}</div>
      </div>

      {d.recurring && days !== null && (
        <div className="pl-renewal-bar">
          <div className="pl-renewal-label">
            <div className="pl-renewal-text">
              <PlIcon icon={RefreshCw} /> Kontrak berakhir
            </div>
            <div className={`pl-renewal-days ${cls}`}>{days <= 0 ? "Berakhir" : `${days} hari lagi`}</div>
          </div>
          <div className="pl-renewal-progress">
            <div className={`pl-renewal-fill ${cls}`} style={{ width: `${renewalWidth(days)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export const DealCard = memo(DealCardBase);
