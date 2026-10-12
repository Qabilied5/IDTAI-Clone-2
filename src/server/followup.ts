/* =============================================================
   src/server/followup.ts
   Follow-up leads (generate + kirim), AI mulai chat duluan ke lead
   (Telegram: hanya ke user yang pernah chat; WABA: via template),
   follow-up appointment.
   ============================================================= */
import { OLLAMA_MODEL, SEND_MODE } from './config';
import { ollamaGenerate } from './ollama';
import { buildAppointmentFollowupPrompt, buildFollowupPrompt, buildWabaIntroVariablePrompt } from './prompts';
import { state, telegramConfigured, wabaConfigured } from './state';
import { sendViaTelegram, tgFindConversationByName, tgFindConversationByPhone } from './telegram';
import type { Conversation, Lead, SendLogEntry } from './types';
import { sendViaWaba, sendViaWabaTemplate } from './waba';

export async function generateFollowupMessage(lead: Lead): Promise<string> {
  return ollamaGenerate(buildFollowupPrompt(lead), { model: OLLAMA_MODEL, temperature: 0.7 });
}

export async function generateAppointmentFollowupMessage({ appointment, lead }: { appointment: any; lead?: Lead | null }): Promise<string> {
  return ollamaGenerate(buildAppointmentFollowupPrompt({ appointment, lead }), { model: OLLAMA_MODEL, temperature: 0.7 });
}

export async function sendMessage({ mode, chatId, message, lead }: { mode?: string; chatId?: string; message: string; lead?: Lead }) {
  const effectiveMode = mode || SEND_MODE;

  if (effectiveMode === 'mock') {
    console.log('[MOCK SEND] ke', lead?.nama, '\n', message);
    return { provider: 'mock', delivered: true } as { provider: string; delivered: boolean; messageId?: string };
  }
  if (effectiveMode === 'telegram') {
    const result = await sendViaTelegram(chatId, message);
    return { provider: 'telegram', delivered: true, messageId: result.result?.message_id };
  }
  if (effectiveMode === 'whatsapp') {
    const result = await sendViaWaba(chatId || '', message);
    return { provider: 'whatsapp', delivered: true, messageId: result.messages?.[0]?.id };
  }
  throw new Error(`SEND_MODE tidak dikenal: ${effectiveMode}`);
}

export function appendSendLog(entry: Omit<SendLogEntry, 'id'>): SendLogEntry {
  const logEntry: SendLogEntry = { id: state.sendLog.length + 1, ...entry };
  state.sendLog.unshift(logEntry);
  return logEntry;
}

// ── Intro / outreach ──
export function buildIntroMessage(lead: Lead): string {
  const perusahaanText = lead.perusahaan ? ` untuk kebutuhan ${lead.perusahaan}` : '';
  return `Halo ${lead.nama}, perkenalkan saya ${state.companyIntro.botName} dari ${state.companyIntro.companyName}. Saya menghubungi Anda${perusahaanText} — ada yang bisa kami bantu terkait produk/layanan kami?`;
}

export function buildIntroMessageWithVariable(lead: Lead, introVariable: string): string {
  return `Halo ${lead.nama}, perkenalkan saya ${state.companyIntro.botName} dari ${state.companyIntro.companyName}. Saya menghubungi Anda terkait ${introVariable} — ada yang bisa kami bantu terkait produk/layanan kami?`;
}

export async function generateWabaIntroVariable(lead: Lead): Promise<string> {
  const fallback = lead.perusahaan ? `kebutuhan ${lead.perusahaan}` : 'produk/layanan kami';
  try {
    const raw = await ollamaGenerate(buildWabaIntroVariablePrompt(lead), { model: OLLAMA_MODEL, temperature: 0.7 });
    const text = raw.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').replace(/["'.]+$/g, '');
    return text || fallback;
  } catch (err) {
    console.error('[WABA] Gagal generate variabel intro via Ollama, pakai fallback:', (err as Error).message);
    return fallback;
  }
}

export async function tgStartChatWithLead(lead: Lead) {
  const conv = tgFindConversationByPhone(lead.phone);
  if (!conv) return { ok: false, reason: 'not_found' };
  if (conv.introSent) return { ok: false, reason: 'already_started', chatId: conv.chatId };

  const introText = buildIntroMessage(lead);
  await sendViaTelegram(conv.chatId, introText);

  const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: introText, time: Date.now() };
  conv.messages.push(outMsg);
  conv.lastMessageText = introText;
  conv.lastMessageTime = outMsg.time;
  conv.handledBy = 'ai';
  conv.introSent = true;

  return { ok: true, chatId: conv.chatId, message: introText };
}

export async function wabaStartChatWithLead(lead: Lead) {
  if (!wabaConfigured()) return { ok: false, reason: 'waba_not_configured' };

  const rawPhone = String(lead.phone || '').replace(/\D/g, '');
  if (!rawPhone) return { ok: false, reason: 'no_phone' };

  const to = rawPhone.startsWith('62')
    ? rawPhone
    : rawPhone.startsWith('0')
      ? '62' + rawPhone.slice(1)
      : '62' + rawPhone;

  const introVariable = await generateWabaIntroVariable(lead);
  const introText = buildIntroMessageWithVariable(lead, introVariable);

  // Template "followup_intro" (Utility) — {{1}} = nama lead, {{2}} = frasa hasil Ollama.
  const introComponents = [{
    type: 'body',
    parameters: [
      { type: 'text', text: lead.nama || 'Bapak/Ibu' },
      { type: 'text', text: introVariable },
    ],
  }];

  try {
    await sendViaWabaTemplate(to, 'followup_intro', 'en', introComponents);

    let conv = state.wabaConversations.get(to);
    if (!conv) {
      conv = {
        chatId: to,
        name: lead.nama,
        phone: to,
        handledBy: 'ai',
        introSent: false,
        messages: [],
        lastMessageText: '',
        lastMessageTime: Date.now(),
        unread: 0,
        provider: 'whatsapp',
      } as Conversation;
      state.wabaConversations.set(to, conv);
    }

    const outMsg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: introText, time: Date.now() };
    conv.messages.push(outMsg);
    conv.lastMessageText = introText;
    conv.lastMessageTime = outMsg.time;
    conv.handledBy = 'ai';
    conv.introSent = true;

    console.log(`[WABA] Pesan intro terkirim ke ${lead.nama} (${to})`);
    return { ok: true, chatId: to, message: introText, provider: 'whatsapp' };
  } catch (err) {
    console.error(`[WABA] Gagal kirim intro ke ${lead.nama} (${to}):`, (err as Error).message);
    return { ok: false, reason: 'send_error', error: (err as Error).message };
  }
}

/* Dipanggil dari POST /api/leads/start-chat. */
export async function startChatWithLeads(leads: Lead[], requestedProvider?: string) {
  const wabaReady = wabaConfigured();
  const tgReady = telegramConfigured();

  let activeProvider: 'whatsapp' | 'telegram';
  if (requestedProvider === 'whatsapp' && wabaReady) activeProvider = 'whatsapp';
  else if (requestedProvider === 'telegram' && tgReady) activeProvider = 'telegram';
  else if (wabaReady) activeProvider = 'whatsapp';
  else if (tgReady) activeProvider = 'telegram';
  else throw Object.assign(new Error('Tidak ada provider chat yang aktif. Hubungkan WhatsApp Business API atau Telegram Bot di halaman Integrasi.'), { status: 400 });

  console.log(`[Leads Start Chat] Provider: ${activeProvider}, ${leads.length} lead`);

  const results: any[] = [];
  for (const lead of leads) {
    if (!lead || !lead.id || !lead.phone) {
      results.push({ id: lead && lead.id, ok: false, reason: 'no_phone' });
      continue;
    }
    try {
      const r = activeProvider === 'whatsapp' ? await wabaStartChatWithLead(lead) : await tgStartChatWithLead(lead);
      results.push({ id: lead.id, provider: activeProvider, ...r });
    } catch (err) {
      console.error(`[Leads] Gagal mulai chat utk lead ${lead.id}:`, (err as Error).message);
      results.push({ id: lead.id, ok: false, reason: 'error', error: (err as Error).message });
    }
  }
  return { provider: activeProvider, results };
}

/* Dipanggil dari POST /api/appointment/followup. */
export async function appointmentFollowup(appointment: any, lead?: Lead | null) {
  const message = await generateAppointmentFollowupMessage({ appointment, lead });

  const existingConv = tgFindConversationByName(appointment.nama);
  if (existingConv && telegramConfigured()) {
    await sendViaTelegram(existingConv.chatId, message);
    const outMsg = { id: existingConv.messages.length + 1, dir: 'out' as const, from: 'ai' as const, text: message, time: Date.now() };
    existingConv.messages.push(outMsg);
    existingConv.lastMessageText = message;
    existingConv.lastMessageTime = outMsg.time;
    existingConv.handledBy = 'ai';
    return { delivered: true, provider: 'telegram' as string | null, chatId: existingConv.chatId as string | undefined, message };
  }
  return { delivered: false, provider: null as string | null, chatId: undefined as string | undefined, message };
}
