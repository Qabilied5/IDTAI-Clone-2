/* =============================================================
   src/lib/calendly-migrate.ts
   Pengganti calendly-config.ts (versi localStorage).
   Token & event type URI kini disimpan di SQL Server oleh server dan dimuat
   ulang saat boot (integration-sync.ts), jadi browser tidak perlu menyimpan apa pun.
   File ini hanya memindahkan sisa data lama di localStorage ke database SEKALI,
   lalu menghapusnya. Tanpa data lama = tidak ada request sama sekali.
   ============================================================= */
import { apiFetch } from "@/lib/api";

const LS_TOKEN = "idt_calendly_token";
const LS_EVENT_TYPE = "idt_calendly_event_type_uri";

export async function calendlyMigrateLegacyOnLoad(): Promise<void> {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem(LS_TOKEN) || "";
  const eventTypeUri = window.localStorage.getItem(LS_EVENT_TYPE) || "";
  if (!token) return;

  try {
    const res = await apiFetch<{ ok: boolean; migrated?: boolean; alreadyInDb?: boolean }>(
      "/calendly/migrate",
      { method: "POST", body: JSON.stringify({ token, eventTypeUri }) }
    );
    // Hapus salinan browser HANYA setelah server memastikan data sudah ada di database.
    if (res.ok && (res.migrated || res.alreadyInDb)) {
      window.localStorage.removeItem(LS_TOKEN);
      window.localStorage.removeItem(LS_EVENT_TYPE);
    }
  } catch {
    // Server tidak terjangkau / token lama sudah tidak valid: biarkan localStorage, coba lagi di muat berikutnya.
  }
}
