export type ConversationChannel = "telegram" | "whatsapp";
export type ConversationHandledBy = "ai" | "human";
export type ConversationStatus = "open" | "waiting" | "closed";

/**
 * Bentuk gabungan dari /api/telegram/conversations dan
 * /api/waba/conversations di backend Express (server.js). `channel`
 * ditambahkan di sisi client (lihat useConversations()) karena kedua
 * endpoint tsb tidak mengirim field itu sendiri -- responsnya dibedakan
 * lewat endpoint yang dipanggil.
 */
export interface Conversation {
  id: string;
  chatId?: string;
  phone?: string;
  name: string;
  channel: ConversationChannel;
  lastMessage: string;
  handledBy: ConversationHandledBy;
  status: ConversationStatus;
  updatedAt: string;
  /** true jika sedang menunggu diambil-alih human agent. */
  escalated?: boolean;
  /** Kalimat lengkap dari server, mis. "User minta bicara dengan manusia". */
  escalationReason?: string;
  /** Epoch ms saat eskalasi terjadi, dipakai untuk hitung "menunggu N menit". */
  escalatedAt?: number;
}
