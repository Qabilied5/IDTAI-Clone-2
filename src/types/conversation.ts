export type ConversationChannel = "telegram" | "whatsapp";
export type ConversationHandledBy = "ai" | "human";
export type ConversationStatus = "open" | "waiting" | "closed";

/**
 * Ringkasan 1 percakapan — bentuk yang dikirim GET /api/telegram/conversations
 * dan GET /api/waba/conversations (lihat src/server/conversation-routes.ts).
 * Sama persis dengan respons server.js versi vanilla.
 */
export interface RawConversationSummary {
  chatId: string;
  name: string;
  username?: string;
  phone?: string;
  handledBy: ConversationHandledBy;
  lastMessageText: string;
  lastMessageTime: number;
  unread: number;
  msgCount: number;
  provider?: ConversationChannel;
  escalated: boolean;
  escalationReason: string | null;
  escalatedAt: number | null;
  picId: number | null;
  picName: string | null;
}

/** Bentuk yang dipakai komponen UI. `id` = `${channel}:${chatId}` supaya unik lintas channel. */
export interface Conversation {
  id: string;
  chatId: string;
  phone?: string;
  username?: string;
  name: string;
  channel: ConversationChannel;
  lastMessage: string;
  handledBy: ConversationHandledBy;
  status: ConversationStatus;
  updatedAt: string;
  unread: number;
  msgCount: number;
  /** true jika sedang menunggu diambil-alih human agent. */
  escalated?: boolean;
  /** Kalimat lengkap dari server, mis. "User minta bicara dengan manusia". */
  escalationReason?: string;
  /** Epoch ms saat eskalasi terjadi, dipakai untuk hitung "menunggu N menit". */
  escalatedAt?: number;
  picId?: number | null;
  picName?: string | null;
}

/** 1 pesan mentah dari backend (conv.messages[] di server/types.ts). */
export interface RawChatMessage {
  id: number;
  dir: "in" | "out";
  from: "user" | "ai" | "human" | "system";
  text: string;
  time: number;
}

/** Detail percakapan dari GET /api/{telegram|waba}/conversations/:chatId */
export interface RawConversationDetail extends RawConversationSummary {
  messages: RawChatMessage[];
}

export type MessageSender = "contact" | "ai" | "human" | "system";

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
}

export type LeadTemperature = "hot" | "warm" | "cold";

export interface ContactHistoryEntry {
  label: string;
  date: string;
  by: "AI" | "Human";
}

/**
 * Profil kontak + statistik interaksi untuk panel kanan halaman Percakapan.
 * Belum ada endpoint backend untuk ini (lihat catatan di lib/percakapan.ts),
 * jadi bentuknya disiapkan dulu supaya UI bisa dibangun lalu disambungkan
 * belakangan tanpa perlu ubah kontrak komponen.
 */
export interface ContactProfile {
  company?: string;
  email?: string;
  city?: string;
  leadTemperature: LeadTemperature;
  stats: {
    conversationCount: number;
    orderCount: number;
    totalSpend: string;
  };
  history: ContactHistoryEntry[];
  agentNotes?: string;
}

export interface ConversationSentiment {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AiConversationSummary {
  leadScore: number;
  leadTag: string;
  summary: string;
  topics: string[];
  recommendations: string[];
  sentiment: ConversationSentiment;
}
