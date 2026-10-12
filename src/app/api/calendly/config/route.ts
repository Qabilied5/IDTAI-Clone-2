import { calendlyClearConfig, calendlySetConfig } from '@/server/calendly';
import { errMsg, fail, ok, readJson } from '@/server/http';
import { calendlyConfigured, state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const t = state.CALENDLY_ACCESS_TOKEN;
  return ok({
    configured: calendlyConfigured(),
    tokenPreview: t ? `${t.slice(0, 6)}••••${t.slice(-4)}` : '',
    eventTypeUri: state.CALENDLY_EVENT_TYPE_URI,
    user: state.calendlyUserInfo,
  });
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const token = String(body.token || '').trim();
    const eventTypeUri = String(body.eventTypeUri || '').trim();
    if (!token) return fail('Personal Access Token tidak boleh kosong', 400);
    const user = await calendlySetConfig(token, eventTypeUri);
    return ok({ user });
  } catch (err: any) {
    console.error('[Calendly] Gagal menyimpan konfigurasi:', errMsg(err));
    return fail(errMsg(err), err?.status || 500);
  }
}

export async function DELETE() {
  calendlyClearConfig();
  return ok();
}
