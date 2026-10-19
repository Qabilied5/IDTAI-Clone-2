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
import { clearIntegration, saveIntegration } from './integration-store';
import { currentOrgIdOrNull, requireOrgId, runWithOrg } from './org-context';
import { findOrgByWabaPhoneNumberId, otherOrgHasWabaPhone } from './tenants';
import { state, wabaConfigured } from './state';
import { ensureDataLoaded } from './store';
import type { Conversation, SchedOption } from './types';

function assertConfigured() {
  if (!wabaConfigured()) throw new Error('WABA belum dikonfigurasi (Access Token / Phone Number ID kosong)');
}

/* Batas body pesan interactive WhatsApp = 1024 karakter (lebih → ditolak Meta). */
const clipBody = (t: string) => (t.length > 1024 ? `${t.slice(0, 1021)}...` : t);

/* Email di teks tidak boleh memicu eskalasi — mis. "admin@pt-maju.com" mengandung
   kata kunci "admin" dan akan memindahkan chat ke agent di tengah booking. */
const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/* Webhook Meta bisa dikirim ulang (retry), dan customer bisa menekan tombol dua
   kali beruntun. Karena itu: (1) pesan yang id-nya sudah pernah diproses dibuang,
   (2) pesan per-chat diproses SATU PER SATU supaya state penjadwalan tidak balapan.
   Disimpan di globalThis agar selamat dari reload modul (HMR) di dev. */
const gw = globalThis as unknown as {
  __idtaiWabaSeen?: Map<string, number>;
  __idtaiWabaQueues?: Map<string, Promise<void>>;
};
const seenMsgIds: Map<string, number> = (gw.__idtaiWabaSeen ??= new Map());
const chatQueues: Map<string, Promise<void>> = (gw.__idtaiWabaQueues ??= new Map());
const SEEN_TTL_MS = 60 * 60 * 1000;

function wabaAlreadySeen(id?: string): boolean {
  if (!id) return false;
  const now = Date.now();
  if (seenMsgIds.size > 500) {
    for (const [k, t] of seenMsgIds) if (now - t > SEEN_TTL_MS) seenMsgIds.delete(k);
  }
  if (seenMsgIds.has(id)) return true;
  seenMsgIds.set(id, now);
  return false;
}

function wabaEnqueue(rawChatId: string, job: () => Promise<void>) {
  const chatId = `${currentOrgIdOrNull() ?? 'default'}:${rawChatId}`;
  const prev = chatQueues.get(chatId) || Promise.resolve();
  const next: Promise<void> = prev
    .then(job)
    .catch((err) => console.error('[WABA] Gagal proses pesan masuk:', (err as Error).message))
    .finally(() => { if (chatQueues.get(chatId) === next) chatQueues.delete(chatId); });
  chatQueues.set(chatId, next);
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
    interactive: { type: 'button', body: { text: clipBody(bodyText) }, action: { buttons } },
  });
}

async function wabaSendInteractiveList(to: string, bodyText: string, options: SchedOption[], buttonLabel?: string) {
  const rows = options.slice(0, 10).map((o) => ({ id: o.id, title: (o.label || '').slice(0, 24) }));
  return wabaSendInteractiveRaw({
    messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: clipBody(bodyText) },
      action: { button: (buttonLabel || 'Pilih').slice(0, 20), sections: [{ title: 'Pilihan', rows }] },
    },
  });
}

async function wabaSendCtaUrl(to: string, bodyText: string, buttonLabel: string, url: string) {
  return wabaSendInteractiveRaw({
    messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: clipBody(bodyText) },
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
  if (wabaAlreadySeen(message.id)) {
    console.log('[WABA] Pesan duplikat (retry webhook / tap ganda) dilewati:', message.id);
    return;
  }
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

  if (escCheckIncoming(conv, message.text.body.replace(EMAIL_IN_TEXT, ' '), (text) => sendViaWaba(conv.chatId, text))) return;
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

/* Proses body webhook Meta (dipanggil setelah 200 dikirim). Meta bisa menggabung
   beberapa entry/changes/messages dalam satu request — semuanya diproses. */
export function wabaHandleWebhookBody(body: any) {
  try {
    const entries: any[] = Array.isArray(body && body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes: any[] = Array.isArray(entry && entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change && change.value;
        if (!value) continue;

        // Multi-perusahaan: tentukan pemilik pesan dari Phone Number ID tujuan webhook.
        const phoneId = value.metadata && value.metadata.phone_number_id;
        const orgId = phoneId ? findOrgByWabaPhoneNumberId(String(phoneId)) : null;
        if (phoneId && !orgId) {
          console.warn(`[WABA] Webhook untuk Phone Number ID ${phoneId} tidak cocok dengan perusahaan mana pun — diabaikan`);
          continue;
        }
        const handle = () => {
          ensureDataLoaded();
          wabaHandleChangeValue(value);
        };
        if (orgId) runWithOrg(orgId, handle);
        else handle();
      }
    }
  } catch (err) {
    console.error('[WABA] Gagal proses webhook:', (err as Error).message);
  }
}

function wabaHandleChangeValue(value: any) {
  const { messages, statuses, contacts } = value;

  const profileByWaId: Record<string, any> = {};
  if (Array.isArray(contacts)) {
    contacts.forEach((c: any) => { if (c.wa_id) profileByWaId[c.wa_id] = c.profile || {}; });
  }

  if (Array.isArray(messages)) {
    messages.forEach((m: any) => {
      const bodyText = (m.text && m.text.body) || `[${m.type}]`;
      console.log('[WABA] Pesan masuk dari', m.from, ':', bodyText);
      wabaEnqueue(String(m.from), () => wabaProcessIncomingMessage(m, profileByWaId[m.from]));
    });
  }

  if (Array.isArray(statuses)) {
    statuses.forEach((st: any) => {
      console.log(`[WABA] Status pesan ${st.id} ke ${st.recipient_id}: ${st.status}`);
      if (st.errors) console.log('[WABA] Detail error:', JSON.stringify(st.errors));
    });
  }
}

/* Validasi kredensial ke Meta lalu simpan (POST /api/waba/config). */
export async function wabaSetConfig(input: { token: string; phoneNumberId: string; businessAccountId: string; verifyToken: string }) {
  const orgId = requireOrgId();
  if (otherOrgHasWabaPhone(orgId, input.phoneNumberId)) {
    throw Object.assign(new Error('Phone Number ID ini sudah dipakai perusahaan lain.'), { status: 409 });
  }
  const testUrl = `${WABA_GRAPH_BASE}/${input.phoneNumberId}?fields=display_phone_number,verified_name`;
  const testRes = await xfetch(testUrl, { headers: { Authorization: `Bearer ${input.token}` } });
  const testData = await testRes.json();
  if (testData.error) throw Object.assign(new Error(testData.error.message || 'Kredensial tidak valid'), { status: 400 });

  const botInfo = { verified_name: testData.verified_name, display_phone_number: testData.display_phone_number };
  const verifyToken = input.verifyToken || state.WABA_VERIFY_TOKEN;

  // Simpan ke SQL Server DULU; kalau gagal, state tidak berubah dan error sampai ke UI.
  await saveIntegration(
    orgId,
    'whatsapp',
    {
      token: input.token,
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
      verifyToken,
      botInfo: JSON.stringify(botInfo),
    },
    {
      status: 'connected',
      accountLabel: botInfo.display_phone_number
        ? `${botInfo.display_phone_number}${botInfo.verified_name ? ` (${botInfo.verified_name})` : ''}`
        : null,
      lastStatus: 'Aktif — webhook /api/waba/webhook',
    }
  );

  state.WABA_ACCESS_TOKEN = input.token;
  state.WABA_PHONE_NUMBER_ID = input.phoneNumberId;
  state.WABA_BUSINESS_ACCOUNT_ID = input.businessAccountId;
  if (input.verifyToken) state.WABA_VERIFY_TOKEN = input.verifyToken;
  state.wabaBotInfo = botInfo;
  return state.wabaBotInfo;
}

export async function wabaClearConfig() {
  await clearIntegration(requireOrgId(), 'whatsapp');
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
