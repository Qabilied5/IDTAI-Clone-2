/* =============================================================
   src/server/telegram.ts
   Telegram Bot — kirim pesan, long-polling getUpdates, proses pesan
   masuk (auto-reply AI + penjadwalan + eskalasi), callback tombol.
   ============================================================= */
import { escCheckIncoming } from './escalation';
import { xfetch } from './fetch';
import { handleMessageAndMaybeSchedule, schedFreshState, schedResolveButtonId, tgOptionsToKeyboard } from './scheduling';
import { clearIntegration, saveIntegration } from './integration-store';
import { requireOrgId, runWithOrg } from './org-context';
import { otherOrgHasTelegramToken } from './tenants';
import { state } from './state';
import type { Conversation } from './types';

const TG = (token: string) => `https://api.telegram.org/bot${token}`;

export async function sendViaTelegram(chatId: string | null | undefined, message: string, replyMarkup?: any) {
  if (!state.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN belum diisi di .env');
  const targetChatId = chatId || state.TELEGRAM_DEFAULT_CHAT_ID;
  if (!targetChatId) throw new Error('Chat ID tujuan kosong. Isi TELEGRAM_DEFAULT_CHAT_ID atau kirim chatId di request.');

  const body: Record<string, unknown> = { chat_id: targetChatId, text: message };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await xfetch(`${TG(state.TELEGRAM_BOT_TOKEN)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('[Telegram] sendMessage ditolak, detail lengkap:', JSON.stringify(data));
    throw new Error(`Telegram error: ${data.description || 'unknown'}`);
  }
  return data;
}

/* Safety net: kalau kirim dengan keyboard gagal, coba ulang teks biasa. */
export async function sendViaTelegramSafe(chatId: string, message: string, replyMarkup?: any) {
  try {
    return await sendViaTelegram(chatId, message, replyMarkup);
  } catch (err) {
    console.error('[Telegram] Gagal kirim dengan keyboard, fallback ke teks biasa:', (err as Error).message);
    if (replyMarkup) return sendViaTelegram(chatId, message);
    throw err;
  }
}

async function tgAnswerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!state.TELEGRAM_BOT_TOKEN) return;
  try {
    await xfetch(`${TG(state.TELEGRAM_BOT_TOKEN)}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || undefined }),
    });
  } catch (e) {
    console.error('[Telegram] Gagal answerCallbackQuery:', (e as Error).message);
  }
}

export function tgInitials(name: string): string {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'TG';
}

export function tgNormalizePhone(raw: unknown): string {
  let p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('62')) p = p.slice(2);
  if (p.startsWith('0')) p = p.slice(1);
  return p;
}

export function tgGetOrCreateConversation(chat: any, fromUser?: any): Conversation {
  const chatId = String(chat.id);
  let conv = state.tgConversations.get(chatId);
  if (!conv) {
    const first = (fromUser && fromUser.first_name) || chat.first_name || '';
    const last = (fromUser && fromUser.last_name) || chat.last_name || '';
    const username = (fromUser && fromUser.username) || chat.username || '';
    const name = (first + ' ' + last).trim() || (username ? '@' + username : `Chat ${chatId}`);
    conv = {
      chatId,
      name,
      username,
      initials: tgInitials(name),
      phone: '',
      introSent: false,
      handledBy: 'ai',
      lastMessageText: '',
      lastMessageTime: Date.now(),
      unread: 0,
      messages: [],
    };
    state.tgConversations.set(chatId, conv);
  }
  return conv;
}

export function tgFindConversationByPhone(phone: unknown): Conversation | null {
  const target = tgNormalizePhone(phone);
  if (!target) return null;
  for (const conv of state.tgConversations.values()) {
    if (conv.phone && conv.phone === target) return conv;
  }
  return null;
}

export function tgFindConversationByName(name: string): Conversation | null {
  const target = (name || '').trim().toLowerCase();
  if (!target) return null;
  for (const conv of state.tgConversations.values()) {
    if ((conv.name || '').trim().toLowerCase() === target) return conv;
  }
  return null;
}

async function tgProcessMessage(message: any) {
  const conv = tgGetOrCreateConversation(message.chat, message.from);

  if (message.contact && message.contact.phone_number) {
    conv.phone = tgNormalizePhone(message.contact.phone_number);
  }

  if (!message.text) return;

  if (!conv.scheduling || !conv.scheduling.offeredDates) conv.scheduling = schedFreshState();

  const incomingTime = message.date ? message.date * 1000 : Date.now();
  conv.messages.push({ id: conv.messages.length + 1, dir: 'in', from: 'user', text: message.text, time: incomingTime });
  conv.lastMessageText = message.text;
  conv.lastMessageTime = incomingTime;
  conv.unread += 1;

  if (escCheckIncoming(conv, message.text, (text) => sendViaTelegramSafe(conv.chatId, text))) return;
  if (conv.handledBy !== 'ai') return;

  try {
    const reply = await handleMessageAndMaybeSchedule(conv, message.text);
    if (reply && reply.text) {
      await sendViaTelegramSafe(conv.chatId, reply.text, reply.replyMarkup);
      const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: reply.text, time: Date.now() };
      conv.messages.push(outMsg);
      conv.lastMessageText = reply.text;
      conv.lastMessageTime = outMsg.time;
    }
  } catch (err) {
    console.error('[Telegram] Gagal auto-reply AI:', (err as Error).message);
  }
}

async function tgProcessCallbackQuery(callbackQuery: any) {
  const dataId = callbackQuery.data || '';
  await tgAnswerCallbackQuery(callbackQuery.id);

  if (!callbackQuery.message || !callbackQuery.message.chat) return;
  const conv = tgGetOrCreateConversation(callbackQuery.message.chat, callbackQuery.from);
  if (conv.handledBy !== 'ai') return;

  const result = await schedResolveButtonId(conv, dataId);
  if (!result) return;

  conv.messages.push({ id: conv.messages.length + 1, dir: 'in', from: 'user', text: `[Tombol] ${result.chosenLabel}`, time: Date.now() });

  try {
    await sendViaTelegramSafe(conv.chatId, result.text, tgOptionsToKeyboard(result.options));
    const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: result.text, time: Date.now() };
    conv.messages.push(outMsg);
    conv.lastMessageText = result.text;
    conv.lastMessageTime = outMsg.time;
  } catch (err) {
    console.error('[Telegram] Gagal kirim balasan tombol:', (err as Error).message);
  }
}

async function tgPollOnce() {
  const url = `${TG(state.TELEGRAM_BOT_TOKEN)}/getUpdates?timeout=25&offset=${state.tgOffset}`;
  const res = await xfetch(url);
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Gagal getUpdates dari Telegram');

  for (const update of data.result) {
    state.tgOffset = update.update_id + 1;
    if (update.message) await tgProcessMessage(update.message);
    else if (update.callback_query) await tgProcessCallbackQuery(update.callback_query);
  }
}

export async function tgFetchBotInfo() {
  if (!state.TELEGRAM_BOT_TOKEN) return null;
  const res = await xfetch(`${TG(state.TELEGRAM_BOT_TOKEN)}/getMe`);
  const data = await res.json();
  if (data.ok) state.tgBotInfo = data.result;
  return state.tgBotInfo;
}

export function stopTelegramPolling() {
  state.tgPollEpoch++;
  state.tgPollingActive = false;
}

export async function startTelegramPolling() {
  if (!state.TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] Token belum dikonfigurasi — polling tidak dijalankan. Atur token di halaman Integrasi (Percakapan).');
    return;
  }

  const myEpoch = ++state.tgPollEpoch;
  state.tgOffset = 0;

  try {
    await xfetch(`${TG(state.TELEGRAM_BOT_TOKEN)}/deleteWebhook`);
    await tgFetchBotInfo();
    state.tgPollingActive = true;
    console.log(`[Telegram] Polling aktif${state.tgBotInfo ? ' — @' + state.tgBotInfo.username : ''}`);
  } catch (err) {
    console.error('[Telegram] Gagal inisialisasi polling:', (err as Error).message);
  }

  while (state.TELEGRAM_BOT_TOKEN && myEpoch === state.tgPollEpoch) {
    try {
      await tgPollOnce();
    } catch (err) {
      console.error('[Telegram] Polling error:', (err as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (myEpoch === state.tgPollEpoch) state.tgPollingActive = false;
}

/* Validasi token ke Telegram lalu pasang & restart polling. */
export async function telegramSetConfig(token: string, chatId: string) {
  const orgId = requireOrgId();
  if (otherOrgHasTelegramToken(orgId, token)) {
    throw Object.assign(new Error('Bot Telegram ini sudah dipakai perusahaan lain.'), { status: 409 });
  }
  const testRes = await xfetch(`${TG(token)}/getMe`);
  const testData = await testRes.json();
  if (!testData.ok) throw Object.assign(new Error(testData.description || 'Token tidak valid'), { status: 400 });

  await saveIntegration(
    orgId,
    'telegram',
    { token, chatId, botInfo: JSON.stringify(testData.result) },
    {
      status: 'connected',
      accountLabel: testData.result?.username ? `@${testData.result.username}` : null,
      lastStatus: 'Polling aktif',
    }
  );

  state.TELEGRAM_BOT_TOKEN = token;
  state.TELEGRAM_DEFAULT_CHAT_ID = chatId;
  state.tgBotInfo = testData.result;

  stopTelegramPolling();
  // Loop polling jalan terus di background — harus terikat ke perusahaan ini, bukan ke request.
  runWithOrg(orgId, () => {
    startTelegramPolling().catch((e) => console.error('[Telegram] Polling berhenti:', (e as Error).message));
  });
  return state.tgBotInfo;
}

export async function telegramClearConfig() {
  await clearIntegration(requireOrgId(), 'telegram');
  state.TELEGRAM_BOT_TOKEN = '';
  state.TELEGRAM_DEFAULT_CHAT_ID = '';
  state.tgBotInfo = null;
  stopTelegramPolling();
}

export function tgConversationSummaryList() {
  return Array.from(state.tgConversations.values())
    .map((c) => ({
      chatId: c.chatId,
      name: c.name,
      username: c.username,
      handledBy: c.handledBy,
      lastMessageText: c.lastMessageText,
      lastMessageTime: c.lastMessageTime,
      unread: c.unread,
      msgCount: c.messages.length,
      escalated: !!c.escalated,
      escalationReason: c.escalationReason || null,
      escalatedAt: c.escalatedAt || null,
      picId: c.picId || null,
      picName: c.picName || null,
    }))
    .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
}
