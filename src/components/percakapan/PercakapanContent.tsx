"use client";

import { useEffect, useState } from "react";

import { useConversations } from "@/hooks/useConversations";
import { useUIStore } from "@/store/useUIStore";
import { filterConversations, type ChatFilter } from "@/lib/percakapan";

import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

/**
 * Halaman Percakapan versi Next.js. Daftar percakapan diambil dari
 * useConversations() (GET /api/waba/conversations -- Telegram sudah
 * tidak dipakai lagi di halaman ini). Riwayat pesan per chat dari
 * useConversationDetail() di dalam ChatWindow. Profil kontak & ringkasan
 * AI masih placeholder (lihat lib/percakapan.ts).
 *
 * Kolom "Detail Kontak" & "Ringkasan AI" TIDAK lagi dirender di sini --
 * keduanya sudah pindah ke RightBar (panel persisten di semua halaman,
 * lihat src/components/layout/RightBar.tsx) supaya tidak dobel. Percakapan
 * yang dipilih di ChatList disimpan lewat useUIStore.activeConversationId
 * yang sama dipakai RightBar, jadi keduanya selalu sinkron.
 */
export function PercakapanContent() {
  const { conversations, isLoading, refresh } = useConversations({ pollIntervalMs: 4000 });
  const selectedId = useUIStore((s) => s.activeConversationId);
  const setSelectedId = useUIStore((s) => s.setActiveConversationId);
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = filterConversations(conversations, chatFilter, search);
  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [selectedId, filtered, setSelectedId]);

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 gap-3">
      <ChatList
        conversations={filtered}
        allConversations={conversations}
        isLoading={isLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        chatFilter={chatFilter}
        onChatFilterChange={setChatFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <ChatWindow conversation={selectedConversation} onChanged={refresh} />
    </div>
  );
}
