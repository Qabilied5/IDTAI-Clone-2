"use client";

import { Search } from "lucide-react";

import type { Conversation } from "@/types/conversation";
import { formatRelativeTime, getInitials } from "@/lib/overview";
import { CHAT_FILTERS, type ChatFilter } from "@/lib/percakapan";
import { IconWhatsapp } from "@/components/overview/channel-icons";

interface ChatListProps {
  conversations: Conversation[];
  allConversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  chatFilter: ChatFilter;
  onChatFilterChange: (filter: ChatFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function countForChatFilter(conversations: Conversation[], key: ChatFilter): number {
  if (key === "all") return conversations.length;
  if (key === "ai") return conversations.filter((c) => c.handledBy === "ai").length;
  if (key === "human") return conversations.filter((c) => c.handledBy === "human").length;
  return conversations.filter((c) => c.escalated).length;
}

export function ChatList({
  conversations,
  allConversations,
  isLoading,
  selectedId,
  onSelect,
  chatFilter,
  onChatFilterChange,
  search,
  onSearchChange,
}: ChatListProps) {
  const rows = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="flex h-full min-h-0 w-[320px] shrink-0 flex-col rounded-[10px] border border-border bg-canvas">
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-border p-2.5">
        {CHAT_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onChatFilterChange(f.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              chatFilter === f.key
                ? "bg-accent text-canvas"
                : "bg-panel text-muted hover:bg-panel-raised"
            }`}
          >
            {f.label} {countForChatFilter(allConversations, f.key)}
          </button>
        ))}
      </div>

      <div className="relative shrink-0 border-b border-border p-2.5">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari kontak WhatsApp..."
          className="w-full rounded-[8px] border border-border bg-panel py-1.5 pl-8 pr-2.5 text-xs text-ink placeholder:text-muted outline-none transition-colors focus:border-accent focus:bg-canvas"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted">
            Memuat percakapan...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted">
            {search ? "Kontak tidak ditemukan." : "Tidak ada percakapan."}
          </div>
        ) : (
          rows.map((c) => {
            const isSelected = c.id === selectedId;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center gap-2.5 border-b border-neutral-100 px-3 py-2.5 text-left transition-colors ${
                  isSelected ? "bg-accent-soft" : "hover:bg-panel"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                  {getInitials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-ink">{c.name}</span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {formatRelativeTime(c.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <IconWhatsapp className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.lastMessage}</span>
                  </div>
                </div>
                {c.escalated && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-danger" title="Dieskalasi" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
