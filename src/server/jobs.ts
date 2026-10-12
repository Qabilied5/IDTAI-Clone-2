/* =============================================================
   src/server/jobs.ts
   Background jobs — pengganti app.listen() di server.js:
   polling Telegram, cek percakapan stall, polling booking Calendly.
   Dipanggil sekali dari src/instrumentation.ts saat server Next boot.
   ============================================================= */
import { calendlyPollNewBookings } from './calendly';
import { escAssignToAgent } from './escalation';
import { state } from './state';
import { ensureDataLoaded } from './store';
import { sendViaTelegramSafe, startTelegramPolling } from './telegram';
import { sendViaWaba } from './waba';

/* Trigger "tidak ada respons > N menit" — dicek tiap 1 menit. */
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

export function startBackgroundJobs() {
  if (state.backgroundStarted) return;
  state.backgroundStarted = true;

  ensureDataLoaded();
  console.log('[IDT-AI] Backend Next.js aktif — background jobs dimulai');

  startTelegramPolling().catch((e) => console.error('[Telegram] Polling berhenti:', (e as Error).message));
  setInterval(escCheckStalledConversations, 60 * 1000);
  setInterval(calendlyPollNewBookings, 2 * 60 * 1000);
}
