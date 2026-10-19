/* =============================================================
   src/server/jobs.ts
   Background jobs — pengganti app.listen() di server.js:
   polling Telegram, cek percakapan stall, polling booking Calendly.
   Dipanggil sekali dari src/instrumentation.ts saat server Next boot.
   Multi-perusahaan: tiap job dijalankan DI DALAM konteks tiap perusahaan.
   ============================================================= */
import { calendlyPollNewBookings } from './calendly';
import { escAssignToAgent } from './escalation';
import { runWithOrg } from './org-context';
import { allOrgIds, calendlyConfigured, state, telegramConfigured } from './state';
import { apptSave, ensureDataLoaded } from './store';
import { sendViaTelegramSafe, startTelegramPolling } from './telegram';
import { sendViaWaba } from './waba';

/* Trigger "tidak ada respons > N menit" — dicek tiap 1 menit (per perusahaan). */
export function escCheckStalledConversations() {
  if (!state.escalationSettings.triggers.stalled) return;
  const cutoffMs = state.escalationSettings.stallMinutes * 60 * 1000;
  const now = Date.now();

  const scan = (map: typeof state.tgConversations, sendFnFactory: (conv: any) => (text: string) => Promise<unknown>) => {
    for (const conv of map.values()) {
      if (conv.handledBy !== 'ai' || conv.escalated) continue;
      const last = conv.messages[conv.messages.length - 1];
      if (!last || last.dir !== 'in') continue;
      if (now - last.time >= cutoffMs) {
        escAssignToAgent(conv, `Tidak ada respons lebih dari ${state.escalationSettings.stallMinutes} menit`, sendFnFactory(conv));
      }
    }
  };
  scan(state.tgConversations, (conv) => (text) => sendViaTelegramSafe(conv.chatId, text));
  scan(state.wabaConversations, (conv) => (text) => sendViaWaba(conv.chatId, text));
}

/** Jalankan fn satu kali untuk setiap perusahaan yang dikenal, masing-masing dalam konteksnya. */
function forEachOrg(label: string, fn: () => unknown) {
  const guard = (f: () => unknown) => {
    try {
      const r = f();
      if (r instanceof Promise) r.catch((e) => console.error(`[${label}]`, (e as Error).message));
    } catch (e) {
      console.error(`[${label}]`, (e as Error).message);
    }
  };
  const ids = allOrgIds();
  if (ids.length === 0) guard(fn); // DB tidak terbaca: jalan sebagai perusahaan default
  else ids.forEach((id) => runWithOrg(id, () => guard(fn)));
}

const g = globalThis as unknown as { __idtaiJobsStarted?: boolean };

export function startBackgroundJobs() {
  if (g.__idtaiJobsStarted) return;
  g.__idtaiJobsStarted = true;

  console.log(`[IDT-AI] Backend Next.js aktif — background jobs dimulai (${Math.max(allOrgIds().length, 1)} perusahaan)`);

  forEachOrg('Startup', () => {
    ensureDataLoaded();
    if (telegramConfigured()) {
      startTelegramPolling().catch((e) => console.error('[Telegram] Polling berhenti:', (e as Error).message));
    }
  });

  setInterval(() => forEachOrg('Eskalasi', escCheckStalledConversations), 60 * 1000);
  // Jaring pengaman: appointment yang diubah di tempat yang tidak memanggil apptSave() tetap tersimpan.
  // Hanya baris yang berubah yang ditulis (dibandingkan lewat hash), jadi murah.
  setInterval(() => forEachOrg('Simpan', apptSave), 15 * 1000);
  setInterval(() => forEachOrg('Calendly', () => (calendlyConfigured() ? calendlyPollNewBookings() : undefined)), 2 * 60 * 1000);
}
