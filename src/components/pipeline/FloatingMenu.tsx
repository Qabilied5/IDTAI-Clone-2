"use client";

import { useEffect, useRef } from "react";

export interface MenuItem {
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  dividerBefore?: boolean;
  onSelect: () => void;
}

/* Menu konteks kartu & kolom. Ditutup saat klik di luar, Escape, resize, atau scroll. */
export function FloatingMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openedAt = performance.now();
    // Event scroll bisa tiba beberapa ms SETELAH menu terbuka → abaikan di jendela awal.
    const onScroll = () => {
      if (performance.now() - openedAt > 150) onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(x, window.innerWidth - 175));
  const top = Math.max(8, Math.min(y, window.innerHeight - (items.length * 40 + 24)));

  return (
    <div ref={ref} className="pl-ctx-menu" style={{ left, top }} role="menu">
      {items.map((it) => (
        <div key={it.label}>
          {it.dividerBefore && <div className="pl-ctx-divider" />}
          <div
            className={`pl-ctx-item${it.danger ? " danger" : ""}`}
            role="menuitem"
            tabIndex={0}
            onClick={it.onSelect}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                it.onSelect();
              }
            }}
          >
            {it.icon}
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
