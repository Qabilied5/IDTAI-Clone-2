/* =============================================================
   src/server/calendly-db.ts
   Memuat kredensial Calendly dari SQL Server (dbo.Integrations +
   dbo.IntegrationSettings, token terenkripsi AES-256-GCM) ke `state`.
   Menggantikan peran localStorage: setelah server restart, state diisi
   ulang dari database, bukan dari salinan di browser.
   Aman dipanggil berulang (idempoten) dan hanya mengisi state yang masih kosong.
   ============================================================= */
import { getIntegration } from './integration-store';
import { requireOrgId } from './org-context';
import { state } from './state';

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* Isi state Calendly milik perusahaan aktif dari database.
   Mengembalikan true bila kredensial lengkap tersedia di state setelah pemanggilan. */
export async function calendlyHydrateFromDb(orgId: string = requireOrgId()): Promise<boolean> {
  if (state.CALENDLY_ACCESS_TOKEN && state.CALENDLY_EVENT_TYPE_URI) return true;

  const rec = await getIntegration(orgId, 'calendly');
  if (!rec || rec.status !== 'connected') return false;

  const token = rec.settings.token || '';
  const eventTypeUri = rec.settings.eventTypeUri || '';
  if (!token || !eventTypeUri) return false;

  state.CALENDLY_ACCESS_TOKEN = token;
  state.CALENDLY_EVENT_TYPE_URI = eventTypeUri;
  state.calendlyUserInfo = parseJson(rec.settings.userInfo) ?? state.calendlyUserInfo;
  state.calendlyEventType = parseJson(rec.settings.eventType) ?? state.calendlyEventType;
  return true;
}

/* True bila database SUDAH menyimpan kredensial Calendly untuk perusahaan ini. */
export async function calendlyExistsInDb(orgId: string = requireOrgId()): Promise<boolean> {
  const rec = await getIntegration(orgId, 'calendly');
  return !!(rec && rec.status === 'connected' && rec.settings.token && rec.settings.eventTypeUri);
}
