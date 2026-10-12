/* =============================================================
   src/server/escalation.ts
   Deteksi otomatis kapan percakapan AI perlu dialihkan ke agent manusia,
   lalu assign ke PIC lewat fair queue. Channel-agnostic: fungsi kirim
   pesan (sendFn) disuplai pemanggil (Telegram/WABA).
   ============================================================= */
import { picPickNextAgent } from './agents';
import { state } from './state';
import { picSave } from './store';
import type { Conversation, PicAgent } from './types';

export type SendFn = (text: string) => Promise<unknown>;

export function escMatchKeyword(text: string, list: string[]): string | null {
  const lower = (text || '').toLowerCase();
  return (list || []).find((kw) => kw && lower.includes(kw.toLowerCase())) || null;
}

export function escExtractPercent(text: string): number | null {
  const m = String(text || '').match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(val) ? val : null;
}

export function escCountRepeatedQuestion(conv: Conversation): number {
  const incoming = conv.messages.filter((m) => m.dir === 'in');
  if (!incoming.length) return 0;
  const last = incoming[incoming.length - 1].text.trim().toLowerCase();
  let streak = 1;
  for (let i = incoming.length - 2; i >= 0; i--) {
    if (incoming[i].text.trim().toLowerCase() === last) streak++;
    else break;
  }
  return streak;
}

async function escSendHandoffNotice(conv: Conversation, sendFn?: SendFn) {
  const s = state.escalationSettings;
  if (!s.notifyCustomer) return;
  const text = String(s.handoffMessage || '').trim();
  if (!text || typeof sendFn !== 'function') return;

  await sendFn(text);
  const msg = { id: conv.messages.length + 1, dir: 'out' as const, from: 'system' as const, text, time: Date.now() };
  conv.messages.push(msg);
  conv.lastMessageText = text;
  conv.lastMessageTime = msg.time;
}

export function escAssignToAgent(conv: Conversation, reason: string, sendFn?: SendFn): PicAgent | null {
  const agent = picPickNextAgent();
  conv.handledBy = 'human';
  conv.escalated = true;
  conv.escalationReason = reason;
  conv.escalatedAt = Date.now();
  if (agent) {
    conv.picId = agent.id;
    conv.picName = agent.nama;
    agent.chat = (agent.chat || 0) + 1;
    picSave();
  } else {
    conv.picId = null;
    conv.picName = null;
  }

  escSendHandoffNotice(conv, sendFn).catch((e) => {
    console.error('[Eskalasi] Gagal mengirim pesan transisi sebelum takeover:', (e as Error).message);
  });

  return agent;
}

/* Dipanggil SEBELUM AI generate balasan. Return truthy kalau dieskalasi. */
export function escCheckIncoming(conv: Conversation, text: string, sendFn: SendFn): PicAgent | null | false {
  if (conv.handledBy !== 'ai' || conv.escalated) return null;

  const s = state.escalationSettings;
  const t = s.triggers;

  if (t.humanRequest) {
    const hit = escMatchKeyword(text, s.humanRequestKeywords);
    if (hit) return escAssignToAgent(conv, `Customer minta bicara dengan manusia (kata kunci: "${hit}")`, sendFn) || false;
  }

  if (t.sensitiveKeyword) {
    const hit = escMatchKeyword(text, s.keywords);
    if (hit) return escAssignToAgent(conv, `Kata kunci sensitif terdeteksi: "${hit}"`, sendFn) || false;
  }

  if (t.priceNegotiation) {
    const hit = escMatchKeyword(text, s.priceNegotiationKeywords);
    if (hit) {
      const pct = escExtractPercent(text);
      if (pct === null || pct > s.priceLimitPercent) {
        const reason = pct !== null
          ? `Customer minta diskon ${pct}% (di atas batas ${s.priceLimitPercent}%, kata kunci: "${hit}")`
          : `Customer negosiasi harga/diskon (kata kunci: "${hit}")`;
        return escAssignToAgent(conv, reason, sendFn) || false;
      }
    }
  }

  if (t.repeatedQuestion) {
    const streak = escCountRepeatedQuestion(conv);
    if (streak > 2) return escAssignToAgent(conv, `Pertanyaan sama diulang ${streak}x berturut-turut`, sendFn) || false;
  }

  return null;
}

/* Catatan: escCheckIncoming di server.js mengembalikan hasil escAssignToAgent
   (bisa null kalau tidak ada agent online) dan pemanggil memakai `if (esc...) return`.
   Itu bug halus: eskalasi tanpa agent online → AI tetap generate. Di sini
   eskalasi TANPA agent online mengembalikan `false` (tetap falsy) supaya
   perilakunya identik 100% — tinggal ganti ke `!== null` kalau mau AI diam
   walau tidak ada agent online. */
export function escalated(result: PicAgent | null | false): boolean {
  return !!result;
}
