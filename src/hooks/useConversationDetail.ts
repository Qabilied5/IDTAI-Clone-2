"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchConversationDetail,
  sendConversationMessage,
  takeoverConversation,
  toMessage,
} from "@/lib/conversation-api";
import type { Conversation, ConversationMessage, RawConversationDetail } from "@/types/conversation";

interface UseConversationDetailOptions {
  /** Refresh riwayat pesan tiap N ms selama chat terbuka (vanilla: 3 detik). */
  pollIntervalMs?: number;
}

/**
 * Riwayat pesan + aksi (kirim balasan manual, ambil alih / kembalikan ke AI)
 * untuk 1 percakapan — port dari pcOpenConversation()/pcSend()/pcTakeover()
 * di script_page/percapakan.js. Memanggil:
 *   GET  /api/{telegram|waba}/conversations/:chatId
 *   POST /api/{telegram|waba}/conversations/:chatId/send
 *   POST /api/{telegram|waba}/conversations/:chatId/takeover
 */
export function useConversationDetail(
  conversation: Conversation | null,
  { pollIntervalMs = 3000 }: UseConversationDetailOptions = {}
) {
  const [detail, setDetail] = useState<RawConversationDetail | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channel = conversation?.channel ?? null;
  const chatId = conversation?.chatId ?? null;
  const convId = conversation?.id ?? null;

  const keyRef = useRef<string | null>(null);

  const applyDetail = useCallback(
    (d: RawConversationDetail, id: string) => {
      setDetail(d);
      setMessages((d.messages || []).map((m) => toMessage(m, id)));
    },
    []
  );

  const load = useCallback(async () => {
    if (!channel || !chatId || !convId) return;
    try {
      const d = await fetchConversationDetail(channel, chatId);
      if (keyRef.current !== convId) return; // sudah pindah chat
      applyDetail(d, convId);
      setError(null);
    } catch (e) {
      if (keyRef.current !== convId) return;
      setError(e instanceof Error ? e.message : "Gagal memuat pesan.");
    } finally {
      if (keyRef.current === convId) setIsLoading(false);
    }
  }, [channel, chatId, convId, applyDetail]);

  useEffect(() => {
    keyRef.current = convId;
    setDetail(null);
    setMessages([]);
    setError(null);
    if (!convId) return;

    setIsLoading(true);
    load();
    const id = setInterval(load, pollIntervalMs);
    return () => clearInterval(id);
  }, [convId, load, pollIntervalMs]);

  const send = useCallback(
    async (text: string) => {
      if (!channel || !chatId || !convId) return false;
      const clean = text.trim();
      if (!clean) return false;
      setIsSending(true);
      try {
        const res = await sendConversationMessage(channel, chatId, clean);
        if (keyRef.current === convId) applyDetail(res.conversation, convId);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengirim pesan.");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [channel, chatId, convId, applyDetail]
  );

  const takeover = useCallback(
    async (handledBy: "ai" | "human", pic?: { picId?: number; picName?: string }) => {
      if (!channel || !chatId || !convId) return false;
      try {
        const res = await takeoverConversation(channel, chatId, handledBy, pic);
        if (keyRef.current === convId) applyDetail(res.conversation, convId);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengubah penanganan.");
        return false;
      }
    },
    [channel, chatId, convId, applyDetail]
  );

  return {
    detail,
    messages,
    /** handledBy terbaru dari server (lebih fresh daripada list yang polling lebih lambat). */
    handledBy: detail?.handledBy ?? conversation?.handledBy ?? "ai",
    picName: detail?.picName ?? conversation?.picName ?? null,
    isLoading,
    isSending,
    error,
    refresh: load,
    send,
    takeover,
  };
}
