"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { MOCK_NOTIFICATIONS, NOTIF_TYPE_CFG } from "@/lib/notifications";
import type { NotificationItem } from "@/types/nav";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markOneRead(id: number) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifikasi"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={
          "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border transition-colors " +
          (isOpen
            ? "border-accent-mid bg-accent-soft text-accent"
            : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-ink")
        }
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-[1.5px] border-white bg-accent" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-[-6px] top-[calc(100%+10px)] z-[600] flex w-80 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <Bell className="h-3.5 w-3.5" /> Notifikasi
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 flex-1 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-xs text-neutral-400">
                Belum ada notifikasi.
              </div>
            ) : (
              notifs.map((n) => {
                const cfg = NOTIF_TYPE_CFG[n.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className={
                      "relative flex w-full items-start gap-2.5 border-b border-neutral-100 px-4 py-2.5 text-left last:border-0 hover:bg-neutral-50 " +
                      (n.read ? "" : "bg-[#fef9f9] hover:bg-accent-soft")
                    }
                  >
                    {!n.read && (
                      <span className="absolute left-[5px] top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-accent" />
                    )}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${cfg.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-ink">{n.title}</div>
                      <div className="truncate text-[10.5px] text-neutral-400">{n.sub}</div>
                    </div>
                    <div className="shrink-0 self-center text-[10px] text-neutral-400">{n.time}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="cursor-pointer border-t border-neutral-100 px-4 py-2.5 text-center text-[11.5px] font-semibold text-accent hover:bg-accent-soft">
            Lihat semua notifikasi →
          </div>
        </div>
      )}
    </div>
  );
}