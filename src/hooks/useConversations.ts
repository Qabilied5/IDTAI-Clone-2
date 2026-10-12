"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchConversationList } from "@/lib/conversation-api";
import type { Conversation, ConversationChannel } from "@/types/conversation";

/**
 * Kebalikan conversationId() di lib/conversation-api: "whatsapp:628xxx" →
 * { channel: "whatsapp", chatId: "628xxx" }. Null kalau format tidak dikenal.
 */
export function splitConversationId(
  id: string
): { channel: ConversationChannel; chatId: string } | null {
  const idx = id.indexOf(":");
  if (idx <= 0) return null;
  const channel = id.slice(0, idx);
  const chatId = id.slice(idx + 1);
  if (channel !== "whatsapp" || !chatId) return null;
  return { channel, chatId };
}

interface UseConversationsOptions {
  /** Overview/RightBar 8 detik, halaman Percakapan 4 detik (sama seperti versi vanilla). */
  pollIntervalMs?: number;
}

/**
 * GET /api/waba/conversations (Route Handler Next.js — port dari server.js).
 *
 * Telegram SUDAH TIDAK DIPAKAI LAGI di halaman Percakapan — hanya WhatsApp
 * yang di-fetch di sini. Endpoint /api/telegram/* masih tetap ada di
 * backend untuk Overview & Integrasi (status koneksi), jadi tidak dihapus
 * dari server, cuma tidak dipanggil lagi dari sisi Percakapan.
 */
export function useConversations({ pollIntervalMs = 8000 }: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const whatsapp = await fetchConversationList("whatsapp");
      const sorted = [...whatsapp].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setConversations(sorted);
      setError(null);
    } catch {
      setError("Gagal memuat percakapan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) load();
    };
    run();
    const id = setInterval(run, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs, load]);

  return { conversations, isLoading, error, refresh: load };
}
