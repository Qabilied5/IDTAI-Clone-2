"use client";

import { useEffect, useRef } from "react";
import { useUIStore, type NotifType } from "@/store/useUIStore";

const TYPE_STYLES: Record<NotifType, { iconCls: string; icon: JSX.Element }> = {
  chat: {
    iconCls: "tb-ni-red",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  lead: {
    iconCls: "tb-ni-blue",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  ai: {
    iconCls: "tb-ni-purple",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
        <circle cx="9" cy="13" r="1" fill="currentColor" />
        <circle cx="15" cy="13" r="1" fill="currentColor" />
      </svg>
    ),
  },
  success: {
    iconCls: "tb-ni-green",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  appt: {
    iconCls: "tb-ni-amber",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
};

export default function NotificationPanel() {
  const { isNotifOpen, notifications, toggleNotif, closeNotif, markNotifRead, markAllNotifRead, pushNotif } =
    useUIStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click / Escape — mirrors the legacy tb-notif behavior.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (isNotifOpen && rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeNotif();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNotif();
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isNotifOpen, closeNotif]);

  // Demo: simulate an incoming notification once, like the original dashboard.
  // Safe to remove once real-time notifications (e.g. via useNotifications hook) are wired up.
  useEffect(() => {
    const t = setTimeout(() => {
      pushNotif({ type: "chat", title: "Percakapan baru", sub: "Andi Wijaya — Instagram DM" });
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className={`tb-notif${unreadCount > 0 ? " has-unread" : ""}${isNotifOpen ? " open" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Notifikasi"
      aria-haspopup="true"
      aria-expanded={isNotifOpen}
      onClick={(e) => {
        e.stopPropagation();
        toggleNotif();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleNotif();
        }
      }}
    >
      <svg className="tb-notif-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 8.4C18 6.7 17.37 5.06 16.24 3.86C15.11 2.65 13.59 2 12 2C10.41 2 8.89 2.65 7.76 3.86C6.63 5.06 6 6.7 6 8.4C6 15.867 3 18 3 18H21C21 18 18 15.867 18 8.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="tb-notif-ring" cx="12" cy="12" r="10" stroke="var(--red)" strokeWidth="1.2" fill="none" opacity="0" />
      </svg>
      <span className="tb-notif-dot" />

      <div className="tb-notif-dropdown" role="menu">
        <div className="tb-notif-head">
          <span className="tb-notif-head-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8.4C18 6.7 17.37 5.06 16.24 3.86C15.11 2.65 13.59 2 12 2C10.41 2 8.89 2.65 7.76 3.86C6.63 5.06 6 6.7 6 8.4C6 15.867 3 18 3 18H21C21 18 18 15.867 18 8.4Z" />
              <path d="M13.73 21C13.55 21.3 13.3 21.55 13 21.73C12.69 21.9 12.35 22 12 22C11.65 22 11.31 21.9 11 21.73C10.7 21.55 10.45 21.3 10.27 21" />
            </svg>
            Notifikasi
          </span>
          <button
            type="button"
            className="tb-notif-mark-all"
            onClick={(e) => {
              e.stopPropagation();
              markAllNotifRead();
            }}
          >
            Tandai semua dibaca
          </button>
        </div>

        <div className="tb-notif-list">
          {notifications.length === 0 ? (
            <div className="tb-notif-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 8.4C18 6.7 17.37 5.06 16.24 3.86C15.11 2.65 13.59 2 12 2C10.41 2 8.89 2.65 7.76 3.86C6.63 5.06 6 6.7 6 8.4C6 15.867 3 18 3 18H21C21 18 18 15.867 18 8.4Z" />
                <path d="M13.73 21C13.55 21.3 13.3 21.55 13 21.73C12.69 21.9 12.35 22 12 22C11.65 22 11.31 21.9 11 21.73C10.7 21.55 10.45 21.3 10.27 21" />
              </svg>
              <span>Semua notifikasi sudah dibaca</span>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_STYLES[n.type] ?? TYPE_STYLES.success;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`tb-notif-item${n.read ? "" : " unread"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    markNotifRead(n.id);
                  }}
                >
                  <div className={`tb-ni-icon ${cfg.iconCls}`}>{cfg.icon}</div>
                  <div className="tb-ni-body">
                    <div className="tb-ni-title">{n.title}</div>
                    <div className="tb-ni-sub">{n.sub}</div>
                  </div>
                  <div className="tb-ni-time">{n.time}</div>
                </button>
              );
            })
          )}
        </div>

        <button type="button" className="tb-notif-footer">
          Lihat semua notifikasi →
          {unreadCount > 0 ? <span className="tb-notif-count-badge">{unreadCount}</span> : null}
        </button>
      </div>
    </div>
  );
}