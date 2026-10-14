import { calendlyClearConfig, calendlySetConfig } from '@/server/calendly';
import { errMsg, fail, ok, readJson } from '@/server/http';
import { calendlyConfigured, state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/calendly/config — konfigurasi saat ini (token hanya preview) */
export async function GET() {
  const t = state.CALENDLY_ACCESS_TOKEN;
  return ok({
    configured: calendlyConfigured(),
    tokenPreview: t ? `${t.slice(0, 6)}••••${t.slice(-4)}` : '',
    eventTypeUri: state.CALENDLY_EVENT_TYPE_URI,
    eventType: state.calendlyEventType,
    user: state.calendlyUserInfo,
  });
}

/* POST /api/calendly/config — pasang / ganti kredensial. `eventTypeUri` boleh
   berupa URI API, link Calendly biasa, slug, atau kosong (lihat
   calendlyResolveEventType). Token divalidasi ke Calendly dulu. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const token = String(body.token || '').trim();
    const eventTypeInput = String(body.eventTypeUri || body.eventType || '').trim();
    if (!token) return fail('Personal Access Token tidak boleh kosong', 400);
    const { user, eventType } = await calendlySetConfig(token, eventTypeInput);
    return ok({ user, eventType });
  } catch (err: any) {
    console.error('[Calendly] Gagal menyimpan konfigurasi:', errMsg(err));
    return fail(errMsg(err), err?.status || 500);
  }
}

/* DELETE /api/calendly/config — putuskan koneksi */
export async function DELETE() {
  try {
    await calendlyClearConfig();
    return ok();
  } catch (err) {
    return fail(errMsg(err), 500);
  }
}
