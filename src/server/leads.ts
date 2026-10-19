/**
 * Helper server untuk halaman Kontak / Leads.
 * Status channel dibaca dari state (per perusahaan); fungsi mulai-chat ada di followup.ts.
 */
import { tgStartChatWithLead, wabaStartChatWithLead } from '@/server/followup';
import { telegramConfigured as isTelegramConfigured, wabaConfigured as isWabaConfigured } from '@/server/state';

/* ── Proxy Google Apps Script ─────────────────────────────────── */
const ALLOWED_HOSTS = ['script.google.com', 'script.googleusercontent.com'];

export function assertSheetUrl(raw: string | null | undefined): URL {
  if (!raw) throw new Error('sheetUrl kosong');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('sheetUrl tidak valid'); }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error('sheetUrl harus URL Web App Google Apps Script (https://script.google.com/...)');
  }
  return url;
}

export async function fetchSheet(raw: string) {
  const res = await fetch(assertSheetUrl(raw), { cache: 'no-store', redirect: 'follow' });
  return res.json();
}

export async function postSheet(raw: string, payload: unknown) {
  const res = await fetch(assertSheetUrl(raw), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight di Apps Script
    body: JSON.stringify(payload),
    cache: 'no-store',
    redirect: 'follow',
  });
  return res.json();
}

/* ── Provider chat aktif ──────────────────────────────────────── */
export type ChatProviderName = 'whatsapp' | 'telegram';

export function chatProviderStatus() {
  const whatsapp = isWabaConfigured();
  const telegram = isTelegramConfigured();
  return { whatsapp, telegram };
}

/** Prioritas WABA (bisa kirim ke nomor baru), fallback Telegram. */
export function getActiveChatProvider(requested?: string): ChatProviderName | null {
  const { whatsapp, telegram } = chatProviderStatus();
  if (requested === 'whatsapp' && whatsapp) return 'whatsapp';
  if (requested === 'telegram' && telegram) return 'telegram';
  if (whatsapp) return 'whatsapp';
  if (telegram) return 'telegram';
  return null;
}

export interface StartChatLead { id: number; nama: string; perusahaan?: string; phone: string }

export async function startChatWithLead(provider: ChatProviderName, lead: StartChatLead) {
  return provider === 'whatsapp' ? wabaStartChatWithLead(lead) : tgStartChatWithLead(lead);
}