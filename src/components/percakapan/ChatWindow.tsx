"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, UserCog } from "lucide-react";

import type { Conversation } from "@/types/conversation";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { QUICK_REPLY_ACTIONS } from "@/lib/percakapan";
import { getInitials } from "@/lib/overview";
import { IconTelegram, IconWhatsapp } from "@/components/overview/channel-icons";

import { TicketModal } from "./TicketModal";
import { InvoiceModal } from "./InvoiceModal";

interface ChatWindowProps {
  conversation: Conversation | null;
  /** Dipanggil setelah kirim/takeover sukses supaya daftar di kiri ikut refresh. */
  onChanged?: () => void;
}

/**
 * Jendela chat — port dari pcOpenConversation()/pcRenderMessages()/pcSend()/
 * pcTakeover() di script_page/percapakan.js. Riwayat pesan diambil langsung
 * dari backend (bukan placeholder lagi) dan di-refresh tiap 3 detik selama
 * chat terbuka, jadi pesan masuk dari webhook WABA / polling Telegram
 * langsung muncul.
 */
export function ChatWindow({ conversation, onChanged }: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  const { messages, handledBy, picName, isLoading, isSending, error, send, takeover } =
    useConversationDetail(conversation, { pollIntervalMs: 3000 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // Auto-scroll ke bawah tiap ada pesan baru / pindah chat.
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages.length]);

  useEffect(() => {
    setDraft("");
    lastCountRef.current = 0;
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-[10px] border border-border bg-canvas">
        <div className="text-sm font-semibold text-ink">Pilih percakapan</div>
        <div className="text-xs text-muted">Klik salah satu chat di sebelah kiri</div>
      </div>
    );
  }

  const isHuman = handledBy === "human";
  const ChannelIcon = conversation.channel === "whatsapp" ? IconWhatsapp : IconTelegram;

  async function handleSend() {
    if (!draft.trim() || isSending) return;
    const okSend = await send(draft);
    if (okSend) {
      setDraft("");
      onChanged?.();
    }
  }

  async function handleTakeover() {
    setIsTakingOver(true);
    const okTo = await takeover(isHuman ? "ai" : "human");
    setIsTakingOver(false);
    if (okTo) onChanged?.();
  }

  function handleQuickAction(action: (typeof QUICK_REPLY_ACTIONS)[number]) {
    if (action === "Tiket") {
      setIsTicketOpen(true);
      return;
    }
    if (action === "Invoice") {
      setIsInvoiceOpen(true);
      return;
    }
    setDraft((prev) => (prev ? `${prev} ` : "") + `[${action}] `);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col rounded-[10px] border border-border bg-canvas">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {getInitials(conversation.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-ink">{conversation.name}</span>
              <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
            </div>
            <div className="truncate text-[10.5px] text-muted">
              {isHuman
                ? `Ditangani: ${picName || "Anda (Manual)"}`
                : "Ditangani AI — Agent Sales"}
              {conversation.phone ? ` · ${conversation.phone}` : ""}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleTakeover}
            disabled={isTakingOver}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60 ${
              isHuman
                ? "border border-accent bg-accent-soft text-accent hover:bg-panel"
                : "bg-accent text-canvas hover:bg-accent-strong"
            }`}
          >
            {isHuman ? <Bot className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}
            {isHuman ? "Kembalikan ke AI" : "Ambil Alih"}
          </button>
          <button
            type="button"
            onClick={() => setIsTicketOpen(true)}
            className="rounded-[7px] border border-border px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-panel"
          >
            Buat Tiket
          </button>
          <button
            type="button"
            onClick={() => setIsInvoiceOpen(true)}
            className="rounded-[7px] border border-border px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-panel"
          >
            Kirim Invoice
          </button>
        </div>
      </div>

      {conversation.escalated && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
          Dieskalasi{conversation.escalationReason ? ` — ${conversation.escalationReason}` : ""}
        </div>
      )}

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted">Memuat pesan...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted">Belum ada pesan.</div>
        ) : (
          messages.map((m) => {
            if (m.sender === "system") {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[80%] rounded-full bg-panel px-3 py-1 text-center text-[10.5px] text-muted">
                    {m.text} · {m.time}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${m.sender === "contact" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[70%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-xs ${
                    m.sender === "contact"
                      ? "bg-panel text-ink"
                      : m.sender === "ai"
                        ? "bg-accent-soft text-ink"
                        : "bg-accent text-canvas"
                  }`}
                >
                  <div>{m.text}</div>
                  <div className={`mt-1 text-[9.5px] ${m.sender === "human" ? "text-canvas/70" : "text-muted"}`}>
                    {m.time} {m.sender === "ai" && "· AI"} {m.sender === "human" && "· Human"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-[11px] text-danger">{error}</div>
      )}

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REPLY_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleQuickAction(action)}
              className="rounded-full bg-panel px-2.5 py-1 text-[10.5px] font-medium text-neutral-600 hover:bg-panel-raised"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isHuman ? "Ketik balasan..." : "AI aktif — mengetik balasan akan otomatis mengambil alih"
            }
            className="min-w-0 flex-1 rounded-full border border-border px-4 py-2 text-xs text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            className="flex shrink-0 items-center justify-center rounded-full bg-accent p-2 text-canvas hover:bg-accent-strong disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {conversation.channel === "whatsapp" && (
          <div className="mt-1.5 text-[10px] text-muted">
            Balasan manual WhatsApp hanya terkirim jika window 24 jam pelanggan masih terbuka.
          </div>
        )}
      </div>

      {isTicketOpen && (
        <TicketModal
          contactName={conversation.name}
          onClose={() => setIsTicketOpen(false)}
          onSubmit={() => setIsTicketOpen(false)}
        />
      )}

      {isInvoiceOpen && (
        <InvoiceModal
          contactName={conversation.name}
          invoiceNumber="INV-20250603-084"
          product="Produk / layanan × 2"
          subtotal="Rp 1.100.000"
          shipping="Rp 140.000"
          total="Rp 1.240.000"
          onClose={() => setIsInvoiceOpen(false)}
          onSend={() => setIsInvoiceOpen(false)}
        />
      )}
    </div>
  );
}
