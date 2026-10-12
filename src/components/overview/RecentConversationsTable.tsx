"use client";

import Link from "next/link";

import type { Conversation } from "@/types/conversation";
import { CONVERSATION_STATUS_CONFIG, formatRelativeTime, getInitials } from "@/lib/overview";
import { IconTelegram, IconWhatsapp } from "./channel-icons";

interface RecentConversationsTableProps {
  conversations: Conversation[];
  isLoading?: boolean;
}

export function RecentConversationsTable({
  conversations,
  isLoading,
}: RecentConversationsTableProps) {
  const rows = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Percakapan Terbaru</div>
        <Link
          href="/percakapan"
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-canvas">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr] gap-2 border-b border-border bg-panel px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span>Kontak</span>
          <span>Pesan Terakhir</span>
          <span>Ditangani</span>
          <span>Status</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted">
            Memuat percakapan…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted">
            Belum ada percakapan.
          </div>
        ) : (
          rows.map((c) => {
            const statusCfg = CONVERSATION_STATUS_CONFIG[c.status];
            const ChannelIcon = c.channel === "telegram" ? IconTelegram : IconWhatsapp;

            return (
              <Link
                key={c.id}
                href="/percakapan"
                className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr] items-center gap-2 border-b border-neutral-100 px-3.5 py-2.5 transition-colors last:border-0 hover:bg-panel"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                    {getInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-ink">{c.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted">
                      <ChannelIcon className="h-[11px] w-[11px]" />
                      {c.channel === "telegram" ? "Telegram" : "WhatsApp"}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 truncate text-[11px] text-neutral-600">
                  {c.lastMessage}
                  <div className="text-[10px] text-muted">{formatRelativeTime(c.updatedAt)}</div>
                </div>
                <div>
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                      (c.handledBy === "ai"
                        ? "bg-accent-soft text-accent"
                        : "bg-indigo-50 text-indigo-700")
                    }
                  >
                    {c.handledBy === "ai" ? "AI Agent" : "Agent Manusia"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                  <span className={`h-[7px] w-[7px] rounded-full ${statusCfg.dotClassName}`} />
                  {statusCfg.label}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
