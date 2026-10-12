"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Inbox } from "lucide-react";

import { formatRupiah, groupByStage } from "@/lib/pipeline";
import type { PipelineDeal, PipelineStage } from "@/types/pipeline";

import { DealCard } from "./DealCard";
import { PlIcon } from "./PlIcon";
import { stageColor, wonStageId } from "./pipeline-ui";
import { useCardDrag } from "./useCardDrag";
import { useColumnDrag } from "./useColumnDrag";

interface Props {
  /** Deal yang lolos filter/pencarian. */
  deals: PipelineDeal[];
  stages: PipelineStage[];
  onOpenDeal: (id: string) => void;
  onMoveDeal: (id: string, stageId: string) => void;
  onAddDealToStage: (stageId: string) => void;
  onCardMenu: (e: React.MouseEvent, id: string) => void;
  onStageMenu: (e: React.MouseEvent, stageId: string) => void;
  onAddStage: () => void;
  /** Dipanggil saat kolom diseret ke posisi baru; menerima urutan id stage yang baru. */
  onReorderStages: (order: string[]) => void;
  /** Berubah saat tinggi board bisa berubah (mis. panel AI disembunyikan). */
  layoutKey?: unknown;
}

export function KanbanBoard({ deals, stages, onOpenDeal, onMoveDeal, onAddDealToStage, onCardMenu, onStageMenu, onAddStage, onReorderStages, layoutKey }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const startDrag = useCardDrag(wrapRef, onMoveDeal);
  const startColDrag = useColumnDrag(wrapRef, () => stages.map((s) => s.id), onReorderStages);
  const columns = groupByStage(deals, stages);
  const wonId = wonStageId(stages);

  const updateArrows = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    setCanLeft(wrap.scrollLeft > 8);
    setCanRight(wrap.scrollLeft < wrap.scrollWidth - wrap.clientWidth - 8);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [updateArrows]);

  useLayoutEffect(() => {
    updateArrows();
    const t = window.setTimeout(updateArrows, 260); // setelah animasi panel AI selesai
    return () => window.clearTimeout(t);
  }, [stages, deals, layoutKey, updateArrows]);

  const scrollBy = (dir: -1 | 1) => wrapRef.current?.scrollBy({ left: dir * 268, behavior: "smooth" });

  return (
    <div className="pl-board-outer">
      <button type="button" className={`pl-scroll-btn pl-scroll-left${canLeft ? " visible" : ""}`} onClick={() => scrollBy(-1)} aria-label="Geser kiri">
        <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
          <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="pl-board-wrap" ref={wrapRef} onScroll={updateArrows}>
        <div className="pl-board">
          {columns.map(({ stage, deals: stageDeals, totalValue }) => (
            <div className="pl-col" data-stage={stage.id} key={stage.id}>
              <div className="pl-col-head">
                <div
                  className="pl-col-drag-handle"
                  title="Drag untuk ubah urutan stage"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => startColDrag(e, stage.id)}
                >
                  <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden="true">
                    <rect y="0" width="20" height="1.8" rx="0.9" fill="currentColor" />
                    <rect y="3.1" width="20" height="1.8" rx="0.9" fill="currentColor" />
                  </svg>
                </div>
                <div className="pl-col-title-row">
                  <div className="pl-col-dot" style={{ background: stageColor(stage) }} />
                  <div className="pl-col-name">{stage.label}</div>
                  <div className="pl-col-count">{stageDeals.length}</div>
                  <button type="button" className="pl-col-menu" title="Opsi stage" aria-label={`Opsi stage ${stage.label}`} onClick={(e) => onStageMenu(e, stage.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                </div>
                <div className="pl-col-meta">
                  <div className="pl-col-value">{stageDeals.length ? formatRupiah(totalValue) : "Rp 0"}</div>
                  <button type="button" className="pl-col-add" title={`Tambah deal di ${stage.label}`} aria-label={`Tambah deal di ${stage.label}`} onClick={() => onAddDealToStage(stage.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="pl-cards">
                {stageDeals.length ? (
                  stageDeals.map((d) => (
                    <DealCard key={d.id} deal={d} isWon={stage.id === wonId} onOpen={onOpenDeal} onMenu={onCardMenu} onStartDrag={startDrag} />
                  ))
                ) : (
                  <div className="pl-col-empty">
                    <PlIcon icon={Inbox} />
                    Belum ada deal di stage ini
                  </div>
                )}
              </div>
            </div>
          ))}

          <div
            className="pl-col pl-col-addstage"
            onClick={onAddStage}
            title="Tambah stage baru"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onAddStage();
              }
            }}
          >
            <div className="pl-addstage-inner">
              <div className="pl-addstage-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div className="pl-addstage-label">Tambah Stage</div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className={`pl-scroll-btn pl-scroll-right${canRight ? " visible" : ""}`} onClick={() => scrollBy(1)} aria-label="Geser kanan">
        <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
          <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
