/* =============================================================
   src/server/conversation-routes.ts
   Logic bersama untuk endpoint percakapan Telegram & WABA — port dari
   blok /api/telegram/conversations* dan /api/waba/conversations* di
   server.js. Route Handler tinggal memilih provider-nya.
   ============================================================= */
import { errMsg, fail, ok, readJson } from './http';
import { state } from './state';
import { sendViaTelegram, tgConversationSummaryList } from './telegram';
import type { Conversation } from './types';
import { sendViaWaba, wabaConversationSummaryList } from './waba';
import { ensureDataLoaded } from './store';

export type Provider = 'telegram' | 'whatsapp';

function mapOf(provider: Provider): Map<string, Conversation> {
  return provider === 'whatsapp' ? state.wabaConversations : state.tgConversations;
}

/* GET /api/{telegram|waba}/conversations */
export function listConversations(provider: Provider) {
  ensureDataLoaded();
  if (provider === 'whatsapp') {
    return ok({
      conversations: wabaConversationSummaryList(),
      botConfigured: !!(state.WABA_ACCESS_TOKEN && state.WABA_PHONE_NUMBER_ID),
    });
  }
  return ok({
    conversations: tgConversationSummaryList(),
    botConfigured: !!state.TELEGRAM_BOT_TOKEN,
    polling: state.tgPollingActive,
  });
}

/* GET /api/{telegram|waba}/conversations/:chatId — sekaligus tandai sudah dibaca */
export function getConversation(provider: Provider, chatId: string) {
  const conv = mapOf(provider).get(chatId);
  if (!conv) return fail('Percakapan tidak ditemukan', 404);
  conv.unread = 0;
  return ok({ conversation: conv });
}

/* POST /api/{telegram|waba}/conversations/:chatId/send — balasan manual,
   otomatis ambil alih dari AI. Untuk WABA hanya berhasil jika window 24 jam
   customer masih terbuka (freeform message). */
export async function sendToConversation(provider: Provider, chatId: string, req: Request) {
  try {
    const conv = mapOf(provider).get(chatId);
    if (!conv) return fail('Percakapan tidak ditemukan', 404);

    const body = await readJson<{ text?: string }>(req);
    const text = String(body.text || '').trim();
    if (!text) return fail('Pesan tidak boleh kosong', 400);

    if (provider === 'whatsapp') await sendViaWaba(conv.chatId, text);
    else await sendViaTelegram(conv.chatId, text);

    const msg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'human' as const, text, time: Date.now() };
    conv.messages.push(msg);
    conv.lastMessageText = text;
    conv.lastMessageTime = msg.time;
    conv.handledBy = 'human';

    return ok({ message: msg, conversation: conv });
  } catch (err) {
    console.error(err);
    return fail(errMsg(err));
  }
}

/* POST /api/{telegram|waba}/conversations/:chatId/takeover — ambil alih /
   kembalikan ke AI. Balik ke AI = reset PIC + flag eskalasi. */
export async function takeoverConversation(provider: Provider, chatId: string, req: Request) {
  const conv = mapOf(provider).get(chatId);
  if (!conv) return fail('Percakapan tidak ditemukan', 404);

  const { handledBy, picId, picName } = await readJson<{ handledBy?: string; picId?: number; picName?: string }>(req);
  if (handledBy !== 'ai' && handledBy !== 'human') {
    return fail('handledBy harus "ai" atau "human"', 400);
  }
  conv.handledBy = handledBy;
  if (handledBy === 'human') {
    conv.picId = picId || null;
    conv.picName = picName || null;
  } else {
    conv.picId = null;
    conv.picName = null;
    conv.escalated = false;
    conv.escalationReason = null;
  }
  return ok({ conversation: conv });
}
