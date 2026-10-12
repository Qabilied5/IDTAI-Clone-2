import { calendlyFetch } from '@/server/calendly';
import { errMsg, fail, ok, readJson } from '@/server/http';
import { calendlyConfigured, state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!calendlyConfigured()) return fail('Calendly belum dikonfigurasi', 400);
    if (!state.calendlyUserInfo) return fail('Info user Calendly belum tersedia — simpan ulang token dulu', 400);
    const body = await readJson(req);
    const callbackUrl = String(body.callbackUrl || '').trim();
    if (!callbackUrl) return fail('callbackUrl wajib diisi, contoh: https://xxxx.ngrok.io/api/calendly/webhook', 400);

    const data = await calendlyFetch('/webhook_subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        url: callbackUrl,
        events: ['invitee.created'],
        organization: state.calendlyUserInfo.organizationUri,
        user: state.calendlyUserInfo.uri,
        scope: 'user',
      }),
    });
    return ok({ subscription: data.resource });
  } catch (err) {
    console.error('[Calendly] Gagal daftar webhook subscription:', errMsg(err));
    return fail(errMsg(err));
  }
}
