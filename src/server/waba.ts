/* =============================================================
   src/server/waba.ts
   WhatsApp Business API (Meta Cloud API) — kirim teks/interactive/
   template, proses pesan masuk dari webhook, mulai chat ke lead.
   ============================================================= */
import { WABA_GRAPH_BASE } from './config';
import { escCheckIncoming } from './escalation';
import { xfetch } from './fetch';
import {
  handleMessageAndMaybeSchedule, schedFreshState, schedOptionsToPlainText, schedResolveButtonId,
} from './scheduling';
import { state, wabaConfigured } from './state';
import type { Conversation, SchedOption } from './types';

function assertConfigured() {
  if (!wabaConfigured()) throw new Error('WABA belum dikonfigurasi (Access Token / Phone Number ID kosong)');
}

async function wabaPost(payload: unknown) {
  const url = `${WABA_GRAPH_BASE}/${state.WABA_PHONE_NUMBER_ID}/messages`;
  const res = await xfetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.WABA_ACCESS_TOKEN}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendViaWaba(to: string, message: string) {
  assertConfigured();
  if (!to) throw new Error('Nomor tujuan (to) kosong');
  const data = await wabaPost({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } });
  if (data.error) throw new Error(`WABA error: ${data.error.message || 'unknown'}`);
  return data;
}

async function wabaSendInteractiveRaw(payload: unknown) {
  assertConfigured();
  const data = await wabaPost(payload);
  if (data.error) {
    console.error('[WABA] Interactive message ditolak, detail lengkap:', JSON.stringify(data.error));
    throw new Error(`WABA error: ${data.error.message || 'unknown'}`);
  }
  return data;
}

async function wabaSendInteractiveButtons(to: string, bodyText: string, options: SchedOption[]) {
  const buttons = options.slice(0, 3).map((o) => ({ type: 'reply', reply: { id: o.id, title: (o.label || '').slice(0, 20) } }));
  return wabaSendInteractiveRaw({
    messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: { type: 'button', body: { text: bodyText }, action: { buttons } },
  });
}

async function wabaSendInteractiveList(to: string, bodyText: string, options: SchedOption[], buttonLabel?: string) {
  const rows = options.slice(0, 10).map((o) => ({ id: o.id, title: (o.label || '').slice(0, 24) }));
  return wabaSendInteractiveRaw({
    messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: { button: (buttonLabel || 'Pilih').slice(0, 20), sections: [{ title: 'Pilihan', rows }] },
    },
  });
}

async function wabaSendCtaUrl(to: string, bodyText: string, buttonLabel: string, url: string) {
  return wabaSendInteractiveRaw({
    messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: bodyText },
      action: { name: 'cta_url', parameters: { display_text: (buttonLabel || 'Buka Link').slice(0, 20), url } },
    },
  });
}

export async function wabaSendOfferMessage(to: string, text: string, options: SchedOption[]) {
  if (!options || !options.length) return sendViaWaba(to, text);
  const hasUrl = options.some((o) => o.url);
  if (options.length === 1 && options[0].url) return wabaSendCtaUrl(to, text, options[0].label, options[0].url);
  if (!hasUrl && options.length <= 3) return wabaSendInteractiveButtons(to, text, options);
  return wabaSendInteractiveList(to, text, options, 'Pilih Jadwal');
}

export async function wabaSendOfferMessageSafe(to: string, text: string, options: SchedOption[]) {
  try {
    return await wabaSendOfferMessage(to, text, options);
  } catch (err) {
    console.error('[WABA] Gagal kirim pesan interaktif (tombol/list), fallback ke teks biasa:', (err as Error).message);
    return sendViaWaba(to, schedOptionsToPlainText(text, options));
  }
}

export async function sendViaWabaTemplate(to: string, templateName = 'hello_test', languageCode = 'en', components: unknown = null) {
  assertConfigured();
  if (!to) throw new Error('Nomor tujuan (to) kosong');
  const template: Record<string, unknown> = { name: templateName, language: { code: languageCode } };
  if (components) template.components = components;
  const data = await wabaPost({ messaging_product: 'whatsapp', to, type: 'template', template });
  console.log('[WABA] Response template lengkap:', JSON.stringify(data));
  if (data.error) throw new Error(`WABA error: ${data.error.message || 'unknown'}`);
  return data;
}

export function wabaGetOrCreateConversation(waId: string, profileName?: string): Conversation {
  let conv = state.wabaConversations.get(waId);
  if (!conv) {
    conv = {
      chatId: waId,
      name: profileName || waId,
      phone: waId,
      handledBy: 'ai',
      introSent: true,
      messages: [],
      lastMessageText: '',
      lastMessageTime: Date.now(),
      unread: 0,
      provider: 'whatsapp',
      scheduling: schedFreshState(),
    };
    state.wabaConversations.set(waId, conv);
  }
  if (!conv.scheduling || !conv.scheduling.offeredDates) conv.scheduling = schedFreshState();
  if (profileName && conv.name === waId) conv.name = profileName;
  return conv;
}

export async function wabaProcessIncomingMessage(message: any, contactProfile?: any) {
  const waId: string = message.from;
  const conv = wabaGetOrCreateConversation(waId, contactProfile && contactProfile.name);

  if (message.type === 'interactive' && message.interactive) {
    const picked = message.interactive.button_reply || message.interactive.list_reply;
    if (!picked) return;

    conv.messages.push({
      id: conv.messages.length + 1, dir: 'in', from: 'user',
      text: `[Tombol] ${picked.title || picked.id}`,
      time: message.timestamp ? Number(message.timestamp) * 1000 : Date.now(),
    });
    conv.unread += 1;
    if (conv.handledBy !== 'ai') return;

    try {
      const result = await schedResolveButtonId(conv, picked.id);
      if (result) {
        await wabaSendOfferMessageSafe(conv.chatId, result.text, result.options);
        const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: result.text, time: Date.now() };
        conv.messages.push(outMsg);
        conv.lastMessageText = result.text;
        conv.lastMessageTime = outMsg.time;
      }
    } catch (err) {
      console.error('[WABA] Gagal kirim balasan tombol:', (err as Error).message);
    }
    return;
  }

  if (!message.text || !message.text.body) return;

  const incomingTime = message.timestamp ? Number(message.timestamp) * 1000 : Date.now();
  conv.messages.push({ id: conv.messages.length + 1, dir: 'in', from: 'user', text: message.text.body, time: incomingTime });
  conv.lastMessageText = message.text.body;
  conv.lastMessageTime = incomingTime;
  conv.unread += 1;

  if (escCheckIncoming(conv, message.text.body, (text) => sendViaWaba(conv.chatId, text))) return;
  if (conv.handledBy !== 'ai') return;

  try {
    const reply = await handleMessageAndMaybeSchedule(conv, message.text.body);
    if (reply && reply.text) {
      await wabaSendOfferMessageSafe(conv.chatId, reply.text, reply.options);
      const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: reply.text, time: Date.now() };
      conv.messages.push(outMsg);
      conv.lastMessageText = reply.text;
      conv.lastMessageTime = outMsg.time;
    }
  } catch (err) {
    console.error('[WABA] Gagal auto-reply AI:', (err as Error).message);
  }
}

/* Proses body webhook Meta (dipanggil setelah 200 dikirim). */
export function wabaHandleWebhookBody(body: any) {
  try {
    const entry = body.entry && body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    const messages = value && value.messages;
    const statuses = value && value.statuses;
    const contacts = value && value.contacts;

    const profileByWaId: Record<string, any> = {};
    if (Array.isArray(contacts)) {
      contacts.forEach((c: any) => { if (c.wa_id) profileByWaId[c.wa_id] = c.profile || {}; });
    }

    if (Array.isArray(messages)) {
      messages.forEach((m: any) => {
        const bodyText = (m.text && m.text.body) || `[${m.type}]`;
        console.log('[WABA] Pesan masuk dari', m.from, ':', bodyText);
        wabaProcessIncomingMessage(m, profileByWaId[m.from]).catch((err) => {
          console.error('[WABA] Gagal proses pesan masuk:', (err as Error).message);
        });
      });
    }

    if (Array.isArray(statuses)) {
      statuses.forEach((s: any) => {
        console.log(`[WABA] Status pesan ${s.id} ke ${s.recipient_id}: ${s.status}`);
        if (s.errors) console.log('[WABA] Detail error:', JSON.stringify(s.errors));
      });
    }
  } catch (err) {
    console.error('[WABA] Gagal proses webhook:', (err as Error).message);
  }
}

/* Validasi kredensial ke Meta lalu simpan (POST /api/waba/config). */
export async function wabaSetConfig(input: { token: string; phoneNumberId: string; businessAccountId: string; verifyToken: string }) {
  const testUrl = `${WABA_GRAPH_BASE}/${input.phoneNumberId}?fields=display_phone_number,verified_name`;
  const testRes = await xfetch(testUrl, { headers: { Authorization: `Bearer ${input.token}` } });
  const testData = await testRes.json();
  if (testData.error) throw Object.assign(new Error(testData.error.message || 'Kredensial tidak valid'), { status: 400 });

  state.WABA_ACCESS_TOKEN = input.token;
  state.WABA_PHONE_NUMBER_ID = input.phoneNumberId;
  state.WABA_BUSINESS_ACCOUNT_ID = input.businessAccountId;
  if (input.verifyToken) state.WABA_VERIFY_TOKEN = input.verifyToken;
  state.wabaBotInfo = { verified_name: testData.verified_name, display_phone_number: testData.display_phone_number };
  return state.wabaBotInfo;
}

export function wabaClearConfig() {
  state.WABA_ACCESS_TOKEN = '';
  state.WABA_PHONE_NUMBER_ID = '';
  state.WABA_BUSINESS_ACCOUNT_ID = '';
  state.wabaBotInfo = null;
}

export function wabaConversationSummaryList() {
  return Array.from(state.wabaConversations.values())
    .map((c) => ({
      chatId: c.chatId,
      name: c.name,
      phone: c.phone,
      handledBy: c.handledBy,
      lastMessageText: c.lastMessageText,
      lastMessageTime: c.lastMessageTime,
      unread: c.unread,
      msgCount: c.messages.length,
      provider: 'whatsapp',
      escalated: !!c.escalated,
      escalationReason: c.escalationReason || null,
      escalatedAt: c.escalatedAt || null,
      picId: c.picId || null,
      picName: c.picName || null,
    }))
    .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
}
