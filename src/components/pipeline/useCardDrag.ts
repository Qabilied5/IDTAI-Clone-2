"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/* Drag & drop kartu antar stage (Pointer Events → mouse & sentuh). Imperatif seperti versi
   asli: ghost, hit-test elementFromPoint, dan auto-scroll tepi board. State React hanya
   disentuh saat drop (onMoveDeal), jadi tidak ada render ulang di tiap gerakan kursor. */

const EDGE = 70;
const MAX_SPEED = 18;
const TOLERANCE = 40;

export function useCardDrag(wrapRef: RefObject<HTMLDivElement>, onMoveDeal: (dealId: string, stageId: string) => void) {
  const cbRef = useRef(onMoveDeal);
  cbRef.current = onMoveDeal;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  return useCallback(
    (e: ReactPointerEvent<HTMLElement>, dealId: string) => {
      if (e.button !== 0) return;
      cleanupRef.current?.(); // drag lama yang tersangkut dibatalkan
      e.stopPropagation();
      e.preventDefault();

      const card = (e.currentTarget as HTMLElement).closest<HTMLElement>(".pl-card");
      const root = card?.closest<HTMLElement>(".pl-root");
      if (!card || !root) return;
      const fromStage = card.dataset.stage ?? "";

      const rect = card.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      let lastX = e.clientX;
      let lastY = e.clientY;
      let overStage: string | null = fromStage;
      let raf = 0;

      // Ghost dipasang di .pl-root (bukan body) agar CSS variable ikut berlaku.
      const ghost = card.cloneNode(true) as HTMLElement;
      ghost.classList.add("pl-card-ghost");
      ghost.style.width = rect.width + "px";
      ghost.style.left = lastX - offX + "px";
      ghost.style.top = lastY - offY + "px";
      root.appendChild(ghost);

      card.classList.add("pl-card-is-dragging");
      root.querySelectorAll(".pl-cards").forEach((c) => c.classList.add("pl-drop-zone"));

      const updateHover = () => {
        ghost.style.pointerEvents = "none";
        const target = document.elementFromPoint(lastX, lastY);
        ghost.style.pointerEvents = "";
        const col = target ? target.closest<HTMLElement>(".pl-col[data-stage]") : null;
        overStage = col ? col.dataset.stage ?? null : null;
        root.querySelectorAll<HTMLElement>(".pl-col[data-stage]").forEach((c) =>
          c.classList.toggle("pl-drop-active", c.dataset.stage === overStage)
        );
      };

      const speed = (dist: number) => Math.ceil((1 - Math.max(dist, 0) / EDGE) * MAX_SPEED);

      const tick = () => {
        const wrap = wrapRef.current;
        if (wrap) {
          const r = wrap.getBoundingClientRect();
          const dTop = lastY - r.top;
          const dBottom = r.bottom - lastY;
          const dLeft = lastX - r.left;
          const dRight = r.right - lastX;
          let scrolled = false;
          if (dTop < EDGE && dTop > -TOLERANCE && wrap.scrollTop > 0) {
            wrap.scrollTop -= speed(dTop);
            scrolled = true;
          } else if (dBottom < EDGE && dBottom > -TOLERANCE && wrap.scrollTop + wrap.clientHeight < wrap.scrollHeight) {
            wrap.scrollTop += speed(dBottom);
            scrolled = true;
          }
          if (dLeft < EDGE && dLeft > -TOLERANCE && wrap.scrollLeft > 0) {
            wrap.scrollLeft -= speed(dLeft);
            scrolled = true;
          } else if (dRight < EDGE && dRight > -TOLERANCE && wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth) {
            wrap.scrollLeft += speed(dRight);
            scrolled = true;
          }
          if (scrolled) updateHover();
        }
        raf = requestAnimationFrame(tick);
      };

      const onMove = (ev: PointerEvent) => {
        lastX = ev.clientX;
        lastY = ev.clientY;
        ghost.style.left = lastX - offX + "px";
        ghost.style.top = lastY - offY + "px";
        updateHover();
      };

      const finish = (commit: boolean) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("blur", onCancel);
        cancelAnimationFrame(raf);
        ghost.remove();
        card.classList.remove("pl-card-is-dragging");
        root.querySelectorAll(".pl-drop-zone").forEach((c) => c.classList.remove("pl-drop-zone"));
        root.querySelectorAll(".pl-drop-active").forEach((c) => c.classList.remove("pl-drop-active"));
        cleanupRef.current = null;
        if (commit && overStage && overStage !== fromStage) cbRef.current(dealId, overStage);
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
