import { getIntegration, listOrganizations } from "@/server/integration-store";
import { runWithOrg, setDefaultOrgId } from "@/server/org-context";
import { getStateFor } from "@/server/state";
import { loadOrgDataIntoState } from "@/server/store";

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Dipanggil dari instrumentation.ts saat server boot, SEBELUM startBackgroundJobs:
 *  1. menentukan perusahaan default (slug "indotrading", atau yang pertama) — hanya perusahaan
 *     ini yang memakai nilai .env sebagai fallback;
 *  2. membuat state tiap perusahaan aktif dan mengisinya dari SQL Server
 *     (kredensial channel + data bisnis).
 * Jika DB kosong/gagal, nilai .env tetap dipakai oleh perusahaan default.
 */
export async function loadIntegrationsIntoState(): Promise<void> {
  const orgs = await listOrganizations();
  const def = orgs.find((o) => o.slug === "indotrading") ?? orgs[0];
  if (def) setDefaultOrgId(def.id);

  for (const org of orgs) {
    const st = getStateFor(org.id);
    st.companyIntro.companyName = org.name; // nilai awal; ditimpa dbo.AgentIdentity bila sudah diisi

    const [wa, tg, cal] = await Promise.all([
      getIntegration(org.id, "whatsapp"),
      getIntegration(org.id, "telegram"),
      getIntegration(org.id, "calendly"),
    ]);

    if (wa?.status === "connected" && wa.settings.token && wa.settings.phoneNumberId) {
      st.WABA_ACCESS_TOKEN = wa.settings.token;
      st.WABA_PHONE_NUMBER_ID = wa.settings.phoneNumberId;
      st.WABA_BUSINESS_ACCOUNT_ID = wa.settings.businessAccountId ?? "";
      if (wa.settings.verifyToken) st.WABA_VERIFY_TOKEN = wa.settings.verifyToken;
      st.wabaBotInfo = parseJson(wa.settings.botInfo);
      console.log(`[Integrasi] ${org.name}: WhatsApp dimuat dari database`);
    }

    if (tg?.status === "connected" && tg.settings.token) {
      st.TELEGRAM_BOT_TOKEN = tg.settings.token;
      st.TELEGRAM_DEFAULT_CHAT_ID = tg.settings.chatId ?? "";
      st.tgBotInfo = parseJson(tg.settings.botInfo);
      console.log(`[Integrasi] ${org.name}: Telegram dimuat dari database`);
    }

    if (cal?.status === "connected" && cal.settings.token && cal.settings.eventTypeUri) {
      st.CALENDLY_ACCESS_TOKEN = cal.settings.token;
      st.CALENDLY_EVENT_TYPE_URI = cal.settings.eventTypeUri;
      st.calendlyUserInfo = parseJson(cal.settings.userInfo);
      st.calendlyEventType = parseJson(cal.settings.eventType);
      console.log(`[Integrasi] ${org.name}: Calendly dimuat dari database`);
    }

    // Data bisnis (KB, agent, eskalasi, identitas, pipeline) dari SQL Server.
    await runWithOrg(org.id, () => loadOrgDataIntoState());
  }
}
