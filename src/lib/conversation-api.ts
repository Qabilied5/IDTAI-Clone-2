/* =============================================================
   src/lib/conversation-api.ts
   Client-side helper untuk endpoint percakapan Telegram & WABA —
   pengganti pcApiBase()/pcFetch() di script_page/percapakan.js.
   ============================================================= */
import { apiFetch } from "@/lib/api";
import type {
  Conversation,
  ConversationChannel,
  ConversationMessage,
  RawChatMessage,
  RawConversationDetail,
  RawConversationSummary,
} from "@/types/conversation";

export function channelApiBase(channel: ConversationChannel) {
  return channel === "whatsapp" ? "/waba" : "/telegram";
}

export function conversationId(channel: ConversationChannel, chatId: string) {
  return `${channel}:${chatId}`;
}

export function toConversation(raw: RawConversationSummary, channel: ConversationChannel): Conversation {
  return {
    id: conversationId(channel, raw.chatId),
    chatId: raw.chatId,
    phone: raw.phone,
    username: raw.username,
    name: raw.name || raw.phone || raw.chatId,
    channel,
    lastMessage: raw.lastMessageText || "",
    handledBy: raw.handledBy,
    status: raw.escalated ? "waiting" : "open",
    updatedAt: new Date(raw.lastMessageTime || Date.now()).toISOString(),
    unread: raw.unread || 0,
    msgCount: raw.msgCount || 0,
    escalated: !!raw.escalated,
    escalationReason: raw.escalationReason || undefined,
    escalatedAt: raw.escalatedAt || undefined,
    picId: raw.picId,
    picName: raw.picName,
  };
}

export function formatMessageTime(epochMs: number) {
  return new Date(epochMs).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function toMessage(raw: RawChatMessage, convId: string): ConversationMessage {
  const sender =
    raw.dir === "in" ? "contact" : raw.from === "ai" ? "ai" : raw.from === "system" ? "system" : "human";
  return {
    id: `${convId}-${raw.id}`,
    sender,
    text: raw.text,
    time: formatMessageTime(raw.time),
  };
}

interface ListResponse {
  ok: boolean;
  conversations: RawConversationSummary[];
}

interface DetailResponse {
  ok: boolean;
  conversation: RawConversationDetail;
}

export async function fetchConversationList(channel: ConversationChannel): Promise<Conversation[]> {
  const res = await apiFetch<ListResponse>(`${channelApiBase(channel)}/conversations`);
  if (!res.ok) return [];
  return res.conversations.map((c) => toConversation(c, channel));
}

export async function fetchConversationDetail(channel: ConversationChannel, chatId: string) {
  const res = await apiFetch<DetailResponse>(`${channelApiBase(channel)}/conversations/${encodeURIComponent(chatId)}`);
  return res.conversation;
}

export async function sendConversationMessage(channel: ConversationChannel, chatId: string, text: string) {
  return apiFetch<{ ok: boolean; message: RawChatMessage; conversation: RawConversationDetail }>(
    `${channelApiBase(channel)}/conversations/${encodeURIComponent(chatId)}/send`,
    { method: "POST", body: JSON.stringify({ text }) }
  );
}

export async function takeoverConversation(
  channel: ConversationChannel,
  chatId: string,
  handledBy: "ai" | "human",
  pic?: { picId?: number; picName?: string }
) {
  return apiFetch<{ ok: boolean; conversation: RawConversationDetail }>(
    `${channelApiBase(channel)}/conversations/${encodeURIComponent(chatId)}/takeover`,
    { method: "POST", body: JSON.stringify({ handledBy, ...pic }) }
  );
}
