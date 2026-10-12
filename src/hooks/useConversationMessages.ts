"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { splitConversationId } from "@/hooks/useConversations";
import type { Conversation, ConversationMessage } from "@/types/conversation";

/** Pesan mentah dari backend (lihat src/server/types.ts → ChatMessage). */
interface RawMessage {
  id: number;
  dir: "in" | "out";
  from: "user" | "ai" | "human" | "system";
  text: string;
  time: number;
}

interface RawDetailResponse {
  ok: boolean;
  conversation: {
    chatId: string;
    handledBy: "ai" | "human";
    picName?: string | null;
    messages: RawMessage[];
  };
}

function apiBase(channel: "telegram" | "whatsapp") {
  return channel === "whatsapp" ? "/waba" : "/telegram";
}

export function mapRawMessage(m: RawMessage, convId: string): ConversationMessage {
  return {
    id: `${convId}-${m.id}`,
    sender: m.dir === "in" ? "contact" : m.from === "ai" ? "ai" : "human",
    text: m.text,
    time: new Date(m.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

interface UseConversationMessagesOptions {
  pollIntervalMs?: number;
}

/**
 * Riwayat pesan REAL satu percakapan dari
 * GET /api/{telegram|waba}/conversations/{chatId}, di-poll berkala supaya
 * balasan AI (Ollama) yang dikirim server langsung muncul di layar.
 * Juga menyediakan kirim manual (POST …/send) dan takeover (POST …/takeover).
 */
export function useConversationMessages(
  conversation: Conversation | null,
  { pollIntervalMs = 4000 }: UseConversationMessagesOptions = {}
) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [handledBy, setHandledBy] = useState<"ai" | "human">(conversation?.handledBy ?? "ai");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convId = conversation?.id ?? null;

  const load = useCallback(async () => {
    if (!convId) return;
    const parts = splitConversationId(convId);
    if (!parts) return;
    try {
      const data = await apiFetch<RawDetailResponse>(`${apiBase(parts.channel)}/conversations/${parts.chatId}`);
      if (data.ok) {
        setMessages(data.conversation.messages.map((m) => mapRawMessage(m, convId)));
        setHandledBy(data.conversation.handledBy);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pesan");
    } finally {
      setIsLoading(false);
    }
  }, [convId]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    if (!convId) return;
    setIsLoading(true);
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
  }, [convId, pollIntervalMs, load]);

  /** Kirim pesan manual sebagai human agent — server otomatis set handledBy = human. */
  const send = useCallback(
    async (text: string) => {
      if (!convId || !text.trim()) return false;
      const parts = splitConversationId(convId);
      if (!parts) return false;
      setIsSending(true);
      try {
        await apiFetch(`${apiBase(parts.channel)}/conversations/${parts.chatId}/send`, {
          method: "POST",
          body: JSON.stringify({ text: text.trim() }),
        });
        await load();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [convId, load]
  );

  /** Ambil alih (human) / kembalikan ke AI. */
  const setHandler = useCallback(
    async (target: "ai" | "human") => {
      if (!convId) return false;
      const parts = splitConversationId(convId);
      if (!parts) return false;
      try {
        await apiFetch(`${apiBase(parts.channel)}/conversations/${parts.chatId}/takeover`, {
          method: "POST",
          body: JSON.stringify({ handledBy: target }),
        });
        setHandledBy(target);
        await load();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengubah penanganan");
        return false;
      }
    },
    [convId, load]
  );

  return { messages, handledBy, isLoading, isSending, error, send, setHandler, refresh: load };
}
