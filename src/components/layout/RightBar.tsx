"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Send,
  Sparkles,
  User,
  Video,
} from "lucide-react";

import { useConversations } from "@/hooks/useConversations";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useUIStore } from "@/store/useUIStore";
import { getInitials } from "@/lib/overview";
import { getAiSummary, getContactProfile } from "@/lib/percakapan";
import { AiSummaryPanel } from "@/components/percakapan/AiSummaryPanel";
import { ContactDetailPanel } from "@/components/percakapan/ContactDetailPanel";

type RightBarTab = "live" | "contact" | "summary";

const TABS: Array<{ key: RightBarTab; label: string }> = [
  { key: "live", label: "Live Chat" },
  { key: "contact", label: "Detail Kontak" },
  { key: "summary", label: "Ringkasan AI" },
];

const PANEL_WIDTH = 340;

/**
 * Panel kanan **persisten** yang tampil di semua halaman dashboard, sejajar
 * dengan Sidebar kiri: layout-nya selalu Sidebar - (Topbar + konten halaman)
 * - RightBar, dan bisa disembunyikan lewat handle panah di tepi kirinya.
 * Ini BUKAN popup/drawer -- fungsinya supaya user tetap bisa memantau &
 * membalas live chat sekalipun sedang berada di halaman lain (Overview,
 * Analitik, dst) tanpa harus membuka halaman Percakapan.
 *
 * Migrasi dari versi vanilla (right-bar.html/css/js):
 * - Struktur aslinya adalah sidebar tetap 3-tab (Live Chat / Detail Kontak /
 *   Ringkasan AI). Implementasi migrasi sebelumnya keliru dibuat sebagai
 *   floating action button + drawer overlay -- versi ini memperbaikinya
 *   supaya strukturnya sesuai dengan aslinya.
 * - Tab "Detail Kontak" & "Ringkasan AI" memakai ulang ContactDetailPanel &
 *   AiSummaryPanel yang sudah dibuat untuk halaman Percakapan (lihat
 *   PercakapanContent.tsx) supaya tidak ada komponen/logic dobel.
 * - Percakapan aktif disimpan global lewat useUIStore.activeConversationId,
 *   dipakai bersama oleh halaman Percakapan penuh -- pilih chat di salah
 *   satu tempat langsung sinkron ke tempat lain.
 * - Riwayat pesan & aksi kirim/ambil-alih memakai useConversationDetail()
 *   yang sama dengan ChatWindow (GET/POST /api/{telegram|waba}/conversations/:chatId).
 */
export function RightBar() {
  const { conversations, refresh } = useConversations({ pollIntervalMs: 8000 });

  const activeConversationId = useUIStore((s) => s.activeConversationId);
  const isCollapsed = useUIStore((s) => s.isRightBarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleRightBar);

  const [tab, setTab] = useState<RightBarTab>("live");
  const [draft, setDraft] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  const { messages: threadMessages, handledBy, picName, isSending, send, takeover } =
    useConversationDetail(activeConversation, { pollIntervalMs: 3000 });
  const isHuman = handledBy === "human";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [threadMessages.length, tab]);

  // Reset draft tiap kali pindah percakapan.
  useEffect(() => {
    setDraft("");
  }, [activeConversationId]);

  async function handleSend() {
    if (!activeConversation || !draft.trim() || isSending) return;
    const okSend = await send(draft);
    if (okSend) {
      setDraft("");
      refresh();
    }
  }

  async function handleTakeover() {
    if (!activeConversation) return;
    setIsSwitching(true);
    const okTo = await takeover(isHuman ? "ai" : "human");
    setIsSwitching(false);
    if (okTo) refresh();
  }

  return (
    <div className="relative h-full shrink-0">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "Tampilkan panel kanan" : "Sembunyikan panel kanan"}
        aria-expanded={!isCollapsed}
        className="absolute -left-3.5 top-1/2 z-10 flex h-10 w-3.5 -translate-y-1/2 items-center justify-center rounded-l-md bg-accent text-canvas shadow-[0_2px_8px_rgba(214,0,28,0.35)] hover:bg-accent-strong"
      >
        {isCollapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      <aside
        aria-hidden={isCollapsed}
        className={`flex h-full flex-col overflow-hidden border-l border-border bg-canvas transition-[width] duration-200 ease-in-out ${
          isCollapsed ? "w-0 border-l-0" : ""
        }`}
        style={{ width: isCollapsed ? 0 : PANEL_WIDTH }}
      >
        <div className="flex shrink-0 items-center border-b border-border" style={{ width: PANEL_WIDTH }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 border-b-2 px-2 py-3.5 text-center text-[12.5px] font-semibold transition-colors ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col" style={{ width: PANEL_WIDTH }}>
          {tab === "live" && (
            <>
              <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {activeConversation ? getInitials(activeConversation.name) : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">
                    {activeConversation ? activeConversation.name : "Pilih percakapan"}
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    {activeConversation
                      ? activeConversation.channel === "whatsapp"
                        ? "WhatsApp"
                        : "Telegram"
                      : "—"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={!activeConversation}
                    className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted hover:bg-panel-raised hover:text-ink disabled:opacity-40"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!activeConversation}
                    className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted hover:bg-panel-raised hover:text-ink disabled:opacity-40"
                  >
                    <Video className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!activeConversation}
                    className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted hover:bg-panel-raised hover:text-ink disabled:opacity-40"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {activeConversation && (
                <div className="shrink-0 border-b border-border px-3.5 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                      !isHuman
                        ? "bg-accent-soft text-accent"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {!isHuman
                      ? "Ditangani AI — Agent Sales"
                      : `Ditangani: ${picName || "Anda (Manual)"}`}
                  </span>
                </div>
              )}

              <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-panel p-3.5"
              >
                {activeConversation && threadMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted">Belum ada pesan.</div>
                ) : activeConversation ? (
                  threadMessages.filter((m) => m.sender !== "system").map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "contact" ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                          m.sender === "contact"
                            ? "rounded-bl-[4px] border border-border bg-canvas text-ink"
                            : m.sender === "ai"
                              ? "rounded-br-[4px] bg-accent-soft text-ink"
                              : "rounded-br-[4px] bg-accent text-canvas"
                        }`}
                      >
                        {m.text}
                        <span
                          className={`mt-1 block text-[9.5px] ${
                            m.sender === "human" ? "text-canvas/70" : "text-muted"
                          }`}
                        >
                          {m.time}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center">
                    <MessageCircle className="h-6 w-6 text-neutral-300" />
                    <div className="text-xs text-muted">
                      Pilih percakapan di halaman Percakapan untuk mulai chat di sini.
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/percakapan"
                className="flex shrink-0 items-center justify-center gap-1.5 border-t border-border bg-panel px-3.5 py-2 text-[11px] font-semibold text-accent hover:bg-accent-soft"
              >
                Buka di halaman Percakapan penuh
              </Link>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex shrink-0 flex-col gap-2 border-t border-border bg-canvas px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10.5px] font-medium text-muted">
                    {isHuman ? "Balas sebagai Admin (override AI)" : "AI menangani otomatis"}
                  </span>
                  <button
                    type="button"
                    onClick={handleTakeover}
                    disabled={!activeConversation || isSwitching}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors disabled:opacity-50 ${
                      isHuman
                        ? "bg-accent text-canvas hover:bg-accent-strong"
                        : "border border-border text-ink hover:bg-panel"
                    }`}
                  >
                    {isHuman ? "Biarkan AI" : "Ambil Alih"}
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!activeConversation}
                    placeholder="Ketik pesan..."
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent-mid disabled:bg-panel"
                  />
                  <button
                    type="submit"
                    aria-label="Kirim pesan"
                    disabled={!activeConversation || !draft.trim() || isSending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-canvas transition-colors hover:bg-accent-strong disabled:opacity-50"
                  >
                    <Send className="h-[15px] w-[15px]" />
                  </button>
                </div>
              </form>
            </>
          )}

          {tab === "contact" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {activeConversation ? (
                <ContactDetailPanel
                  conversation={activeConversation}
                  profile={getContactProfile(activeConversation)}
                />
              ) : (
                <EmptyTabState
                  icon={<User className="h-6 w-6 text-neutral-300" />}
                  text="Pilih percakapan untuk melihat detail kontak."
                />
              )}
            </div>
          )}

          {tab === "summary" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {activeConversation ? (
                <AiSummaryPanel summary={getAiSummary(activeConversation)} />
              ) : (
                <EmptyTabState
                  icon={<Sparkles className="h-6 w-6 text-neutral-300" />}
                  text="Pilih percakapan untuk melihat ringkasan AI."
                />
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function EmptyTabState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      {icon}
      <div className="text-xs text-muted">{text}</div>
    </div>
  );
}
