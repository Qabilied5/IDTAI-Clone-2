import type {
  AiConversationSummary,
  Conversation,
  ContactProfile,
} from "@/types/conversation";

export type ChatFilter = "all" | "ai" | "human" | "escalated";

export const CHAT_FILTERS: Array<{ key: ChatFilter; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "ai", label: "AI Agent" },
  { key: "human", label: "Agen Manusia" },
  { key: "escalated", label: "Dieskalasi" },
];

/**
 * Filter channel (Telegram/WhatsApp) sudah dihapus — Telegram tidak lagi
 * dipakai di Percakapan, jadi semua percakapan di sini pasti WhatsApp dan
 * filter channel jadi tidak relevan. Digantikan pencarian kontak lewat
 * parameter `search` (cocokkan nama, nomor HP, atau username).
 */
export function filterConversations(
  conversations: Conversation[],
  chatFilter: ChatFilter,
  search: string
): Conversation[] {
  const q = search.trim().toLowerCase();

  return conversations.filter((c) => {
    const matchesChat =
      chatFilter === "all" ||
      (chatFilter === "ai" && c.handledBy === "ai") ||
      (chatFilter === "human" && c.handledBy === "human") ||
      (chatFilter === "escalated" && c.escalated);

    const matchesSearch =
      q === "" ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.username || "").toLowerCase().includes(q);

    return matchesChat && matchesSearch;
  });
}

export const QUICK_REPLY_ACTIONS = ["Invoice", "Follow-up", "Tiket", "Cek Stok"] as const;

/**
 * Riwayat pesan per percakapan SUDAH diambil dari backend lewat
 * hooks/useConversationDetail.ts (GET /api/waba/conversations/:chatId).
 * Yang masih placeholder hanya profil kontak & ringkasan AI di bawah ini —
 * server.js versi vanilla juga belum menyediakan endpoint untuk keduanya.
 * Data dibuat deterministik per conversation.id supaya UI stabil.
 */
export function getContactProfile(conversation: Conversation): ContactProfile {
  return {
    company: "PT. Maju Bersama Tbk",
    email: `${conversation.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    city: "Jakarta Selatan",
    leadTemperature: conversation.escalated ? "hot" : "warm",
    stats: {
      conversationCount: 7,
      orderCount: 3,
      totalSpend: "Rp 4,8jt",
    },
    history: [
      { label: "Menanyakan detail produk/layanan", date: "Hari ini · 10:24", by: "AI" },
      { label: "Order/booking → Selesai", date: "28 Mei 2025", by: "AI" },
      { label: "Konfirmasi pengiriman", date: "20 Mei 2025", by: "Human" },
    ],
    agentNotes: "Customer tertarik dengan bundling produk + layanan. Follow-up H+3.",
  };
}

export function getAiSummary(conversation: Conversation): AiConversationSummary {
  return {
    leadScore: 87,
    leadTag: "High Intent Siap Beli",
    summary: `${conversation.name} menanyakan produk dan menunjukkan minat untuk order. AI berhasil mengarahkan ke closing dengan cepat.`,
    topics: ["Detail produk", "Pengiriman", "Harga & invoice"],
    recommendations: [
      "Follow-up dalam 24 jam untuk konfirmasi order.",
      "Tawarkan diskon untuk order dalam jumlah besar sebagai upsell.",
      "Kirim katalog produk serupa setelah invoice dikirim.",
    ],
    sentiment: { positive: 72, neutral: 24, negative: 4 },
  };
}
