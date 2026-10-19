import { allStates } from './state';

/* Pencarian lintas perusahaan — dipakai webhook (yang tidak punya sesi login)
   dan validasi agar satu nomor / satu bot tidak dipakai dua perusahaan. */

export function findOrgByWabaPhoneNumberId(phoneNumberId: string): string | null {
  if (!phoneNumberId) return null;
  for (const [orgId, s] of allStates()) {
    if (s.WABA_PHONE_NUMBER_ID && s.WABA_PHONE_NUMBER_ID === phoneNumberId) return orgId;
  }
  return null;
}

/** Untuk verifikasi webhook Meta (GET hub.verify_token): cocok dengan perusahaan mana pun. */
export function findOrgByWabaVerifyToken(token: string): string | null {
  if (!token) return null;
  for (const [orgId, s] of allStates()) {
    if (s.WABA_VERIFY_TOKEN && s.WABA_VERIFY_TOKEN === token) return orgId;
  }
  return null;
}

export function otherOrgHasWabaPhone(orgId: string, phoneNumberId: string): boolean {
  const owner = findOrgByWabaPhoneNumberId(phoneNumberId);
  return !!owner && owner !== orgId;
}

export function otherOrgHasTelegramToken(orgId: string, token: string): boolean {
  if (!token) return false;
  for (const [id, s] of allStates()) {
    if (id !== orgId && s.TELEGRAM_BOT_TOKEN === token) return true;
  }
  return false;
}

/** Webhook Calendly: cocokkan event type / user pada payload dengan konfigurasi tiap perusahaan. */
export function findOrgByCalendlyEvent(eventTypeUri?: string, userUris: string[] = []): string | null {
  const states = allStates();
  if (eventTypeUri) {
    for (const [orgId, s] of states) {
      if (s.CALENDLY_EVENT_TYPE_URI && s.CALENDLY_EVENT_TYPE_URI === eventTypeUri) return orgId;
    }
  }
  for (const [orgId, s] of states) {
    const uri = s.calendlyUserInfo && s.calendlyUserInfo.uri;
    if (uri && userUris.includes(uri)) return orgId;
  }
  return null;
}
