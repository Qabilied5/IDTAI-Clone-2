"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/* Drag & drop untuk mengurutkan kolom stage (Pointer Events → mouse & sentuh).
   Imperatif seperti drag kartu: ghost, indikator "sebelum/sesudah", dan auto-scroll
   horizontal di tepi board. React baru disentuh saat drop (onReorder). */

const EDGE = 70;
const MAX_SPEED = 18;

export function useColumnDrag(
  wrapRef: RefObject<HTMLDivElement>,
  getStageIds: () => string[],
  onReorder: (order: string[]) => void
) {
  const cbRef = useRef(onReorder);
  cbRef.current = onReorder;
  const idsRef = useRef(getStageIds);
  idsRef.current = getStageIds;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  return useCallback(
    (e: ReactPointerEvent<HTMLElement>, stageId: string) => {
      if (e.button !== 0) return;
      cleanupRef.current?.(); // drag lama yang tersangkut dibatalkan
      e.stopPropagation();
      e.preventDefault();

      const col = (e.currentTarget as HTMLElement).closest<HTMLElement>(".pl-col[data-stage]");
      const root = col?.closest<HTMLElement>(".pl-root");
      const head = col?.querySelector<HTMLElement>(".pl-col-head");
      if (!col || !root || !head) return;

      const rect = col.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      let lastX = e.clientX;
      let dropId: string | null = null;
      let dropSide: "before" | "after" | null = null;
      let raf = 0;

      // Ghost = salinan header kolom (nama, jumlah, total) — tanpa membangun HTML dari teks user.
      const ghost = document.createElement("div");
      ghost.className = "pl-col-ghost";
      ghost.style.width = rect.width + "px";
      ghost.style.left = e.clientX - offX + "px";
      ghost.style.top = e.clientY - offY + "px";
      ghost.appendChild(head.cloneNode(true));
      root.appendChild(ghost);
      col.classList.add("pl-col-is-dragging");

      const clearIndicators = () =>
        root.querySelectorAll(".pl-col[data-stage]").forEach((c) => c.classList.remove("pl-col-drop-before", "pl-col-drop-after"));

      const updateHover = (x: number, y: number) => {
        ghost.style.pointerEvents = "none";
        const target = document.elementFromPoint(x, y);
        ghost.style.pointerEvents = "";
        const over = target ? target.closest<HTMLElement>(".pl-col[data-stage]") : null;
        const overId = over?.dataset.stage ?? null;
        clearIndicators();
        dropId = null;
        dropSide = null;
        if (over && overId && overId !== stageId) {
          const r = over.getBoundingClientRect();
          dropSide = x < r.left + r.width / 2 ? "before" : "after";
          over.classList.add(dropSide === "before" ? "pl-col-drop-before" : "pl-col-drop-after");
          dropId = overId;
        }
      };

      let lastY = e.clientY;
      const tick = () => {
        const wrap = wrapRef.current;
        if (wrap) {
          const r = wrap.getBoundingClientRect();
          const dLeft = lastX - r.left;
          const dRight = r.right - lastX;
          let scrolled = false;
          if (dLeft < EDGE && wrap.scrollLeft > 0) {
            wrap.scrollLeft -= Math.ceil((1 - Math.max(dLeft, 0) / EDGE) * MAX_SPEED);
            scrolled = true;
          } else if (dRight < EDGE && wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth) {
            wrap.scrollLeft += Math.ceil((1 - Math.max(dRight, 0) / EDGE) * MAX_SPEED);
            scrolled = true;
          }
          if (scrolled) updateHover(lastX, lastY); // board bergeser → kolom di bawah kursor berubah
        }
        raf = requestAnimationFrame(tick);
      };

      const onMove = (ev: PointerEvent) => {
        lastX = ev.clientX;
        lastY = ev.clientY;
        ghost.style.left = lastX - offX + "px";
        ghost.style.top = lastY - offY + "px";
        updateHover(lastX, lastY);
      };

      const finish = (commit: boolean) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("blur", onCancel);
        cancelAnimationFrame(raf);
        ghost.remove();
        col.classList.remove("pl-col-is-dragging");
        clearIndicators();
        cleanupRef.current = null;

        if (commit && dropId && dropSide) {
          const order = idsRef.current().slice();
          const from = order.indexOf(stageId);
          if (from === -1) return;
          order.splice(from, 1);
          const ref = order.indexOf(dropId);
          if (ref === -1) return;
          order.splice(dropSide === "before" ? ref : ref + 1, 0, stageId);
          cbRef.current(order);
        }
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
      window.addEventListener("blur", onCancel);
      raf = requestAnimationFrame(tick);
      cleanupRef.current = () => finish(false);
    },
    [wrapRef]
  );
}
