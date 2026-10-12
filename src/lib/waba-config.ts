/* =============================================================
   src/lib/waba-config.ts
   Kredensial WhatsApp Business API (Meta Cloud API) — port dari
   script_page/waba-token.js versi vanilla.

   Alur (sama persis dengan versi lama):
   - Kredensial tersimpan di localStorage browser ini (idt_waba_*).
   - "Test Koneksi" hit langsung Graph API dari browser.
   - "Simpan" kirim ke backend (POST /api/waba/config); backend validasi
     ulang ke Meta, BARU disimpan ke localStorage kalau backend bilang ok.
   - Saat halaman dimuat, kredensial dikirim ulang ke backend (server bisa
     saja baru restart dan kehilangan kredensial in-memory).
   ============================================================= */
import { apiFetch } from "@/lib/api";

const LS_TOKEN = "idt_waba_access_token";
const LS_PHONEID = "idt_waba_phone_number_id";
const LS_WABAID = "idt_waba_business_account_id";
const LS_VERIFY = "idt_waba_verify_token";

export const WABA_GRAPH_VERSION = "v20.0";
export const WABA_DOCS_URL = "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started";

export interface WabaCredentials {
  token: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
}

export interface WabaBotInfo {
  verified_name?: string;
  display_phone_number?: string;
}

function ls(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function wabaGetStored(): WabaCredentials {
  const s = ls();
  return {
    token: s?.getItem(LS_TOKEN) || "",
    phoneNumberId: s?.getItem(LS_PHONEID) || "",
    businessAccountId: s?.getItem(LS_WABAID) || "",
    verifyToken: s?.getItem(LS_VERIFY) || "",
  };
}

export function wabaIsStored(): boolean {
  const c = wabaGetStored();
  return Boolean(c.token && c.phoneNumberId);
}

export function wabaSaveStored(c: WabaCredentials) {
  const s = ls();
  if (!s) return;
  s.setItem(LS_TOKEN, c.token.trim());
  s.setItem(LS_PHONEID, c.phoneNumberId.trim());
  s.setItem(LS_WABAID, (c.businessAccountId || "").trim());
  if (c.verifyToken) s.setItem(LS_VERIFY, c.verifyToken.trim());
}

export function wabaClearStored() {
  const s = ls();
  if (!s) return;
  [LS_TOKEN, LS_PHONEID, LS_WABAID, LS_VERIFY].forEach((k) => s.removeItem(k));
}

/** URL webhook yang harus didaftarkan di Meta App Dashboard. */
export function wabaWebhookUrl(): string {
  if (typeof window === "undefined") return "/api/waba/webhook";
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base && /^https?:\/\//.test(base)) return `${base.replace(/\/$/, "")}/waba/webhook`;
  return `${window.location.origin}/api/waba/webhook`;
}

/** Test langsung ke Graph API — tidak lewat backend. */
export async function wabaTestConnection(
  token: string,
  phoneNumberId: string
): Promise<{ ok: true; name?: string; phone?: string } | { ok: false; error: string }> {
  if (!token) return { ok: false, error: "Access Token kosong" };
  if (!phoneNumberId) return { ok: false, error: "Phone Number ID kosong" };
  try {
    const url = `https://graph.facebook.com/${WABA_GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.error) return { ok: true, name: data.verified_name, phone: data.display_phone_number };
    return { ok: false, error: data.error?.message || "Kredensial tidak valid" };
  } catch {
    return { ok: false, error: "Gagal terhubung — periksa koneksi internet" };
  }
}

/** Kirim kredensial ke backend; backend validasi ulang ke Meta. */
export async function wabaSyncToBackend(
  c: WabaCredentials
): Promise<{ ok: true; bot?: WabaBotInfo } | { ok: false; error: string }> {
  try {
    const data = await apiFetch<{ ok: boolean; bot?: WabaBotInfo; error?: string }>("/waba/config", {
      method: "POST",
      body: JSON.stringify(c),
    });
    if (!data.ok) return { ok: false, error: data.error || "Gagal menyimpan kredensial ke server" };
    return { ok: true, bot: data.bot };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { ok: false, error: msg || "Backend tidak bisa dihubungi (pastikan npm run dev sudah jalan)" };
  }
}

export async function wabaDeleteFromBackend() {
  try {
    await apiFetch("/waba/config", { method: "DELETE" });
  } catch {
    // backend mungkin mati — tetap lanjut hapus lokal
  }
}

/** Dipanggil sekali saat dashboard dimuat. */
export async function wabaAutoSyncOnLoad() {
  const c = wabaGetStored();
  if (!c.token || !c.phoneNumberId) return;
  await wabaSyncToBackend(c);
}
