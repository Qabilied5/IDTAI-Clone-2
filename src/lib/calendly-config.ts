/* =============================================================
   src/lib/calendly-config.ts
   Kredensial Calendly — pola sama dengan waba-config.ts:
   - Server menyimpan token hanya di memori (hilang saat restart),
     jadi salinannya disimpan di localStorage browser ini.
   - Saat dashboard dimuat, kalau server belum terkonfigurasi,
     kredensial dikirim ulang (POST /api/calendly/config).
   ============================================================= */
import { apiFetch } from "@/lib/api";
import type { CalendlyConfigResponse, CalendlyStatus } from "@/types/integration";

const LS_TOKEN = "idt_calendly_token";
const LS_EVENT_TYPE = "idt_calendly_event_type_uri";

export interface CalendlyCredentials {
  token: string;
  /** URI API event type yang SUDAH di-resolve server (bukan input mentah pengguna). */
  eventTypeUri: string;
}

function ls(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function calendlyGetStored(): CalendlyCredentials {
  const s = ls();
  return { token: s?.getItem(LS_TOKEN) || "", eventTypeUri: s?.getItem(LS_EVENT_TYPE) || "" };
}

export function calendlySaveStored(c: CalendlyCredentials) {
  const s = ls();
  if (!s || !c.token || !c.eventTypeUri) return;
  s.setItem(LS_TOKEN, c.token.trim());
  s.setItem(LS_EVENT_TYPE, c.eventTypeUri.trim());
}

export function calendlyClearStored() {
  const s = ls();
  if (!s) return;
  [LS_TOKEN, LS_EVENT_TYPE].forEach((k) => s.removeItem(k));
}

export async function calendlySyncToBackend(
  c: CalendlyCredentials
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = await apiFetch<CalendlyConfigResponse & { error?: string }>("/calendly/config", {
      method: "POST",
      body: JSON.stringify({ token: c.token, eventTypeUri: c.eventTypeUri }),
    });
    if (!data.ok) return { ok: false, error: data.error || "Gagal menyimpan kredensial Calendly ke server" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Backend tidak bisa dihubungi" };
  }
}

/** Dipanggil sekali saat dashboard dimuat. Murah: cek status dulu, kirim hanya bila server kosong. */
export async function calendlyAutoSyncOnLoad() {
  const c = calendlyGetStored();
  if (!c.token || !c.eventTypeUri) return;
  try {
    const st = await apiFetch<CalendlyStatus>("/calendly/status");
    if (st.configured) return;
  } catch {
    return; // server tidak terjangkau — coba lagi di muat berikutnya
  }
  await calendlySyncToBackend(c);
}
