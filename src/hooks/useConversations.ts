"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Conversation } from "@/types/conversation";

interface RawConversationsResponse {
  ok: boolean;
  conversations: Array<Omit<Conversation, "channel">>;
}

interface UseConversationsOptions {
  /**
   * Selaras dengan refresh antrean eskalasi di overview.js versi vanilla
   * (tiap 8 detik) -- tidak sekencang daftar percakapan penuh di halaman
   * Percakapan (4 detik) karena widget ini hanya ringkasan.
   */
  pollIntervalMs?: number;
}

/**
 * Gabungan dari GET /api/telegram/conversations dan GET /api/waba/conversations
 * pada backend Express (server.js) yang sudah ada. Kedua endpoint dipanggil
 * paralel lalu digabung di sini, sama seperti loadEscalationQueue() di
 * overview.js versi vanilla -- bedanya sekarang datanya dipakai bersama oleh
 * semua widget Overview (bukan cuma antrean eskalasi) lewat satu hook.
 */
export function useConversations({ pollIntervalMs = 8000 }: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [telegramRes, wabaRes] = await Promise.allSettled([
        apiFetch<RawConversationsResponse>("/telegram/conversations"),
        apiFetch<RawConversationsResponse>("/waba/conversations"),
      ]);

      if (cancelled) return;

      const telegram =
        telegramRes.status === "fulfilled" && telegramRes.value.ok
          ? telegramRes.value.conversations.map((c) => ({ ...c, channel: "telegram" as const }))
          : [];
      const whatsapp =
        wabaRes.status === "fulfilled" && wabaRes.value.ok
          ? wabaRes.value.conversations.map((c) => ({ ...c, channel: "whatsapp" as const }))
          : [];

      setConversations([...telegram, ...whatsapp]);
      setError(
        telegramRes.status === "rejected" && wabaRes.status === "rejected"
          ? "Gagal memuat percakapan."
          : null
      );
      setIsLoading(false);
    }

    load();
    const id = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  return { conversations, isLoading, error };
}
