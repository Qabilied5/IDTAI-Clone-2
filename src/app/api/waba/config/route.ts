import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { wabaClearConfig, wabaSetConfig } from '@/server/waba';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/waba/config — konfigurasi saat ini (token hanya preview) */
export async function GET() {
  return ok({
    configured: !!(state.WABA_ACCESS_TOKEN && state.WABA_PHONE_NUMBER_ID),
    tokenPreview: state.WABA_ACCESS_TOKEN
      ? `${state.WABA_ACCESS_TOKEN.slice(0, 6)}••••${state.WABA_ACCESS_TOKEN.slice(-4)}`
      : '',
    phoneNumberId: state.WABA_PHONE_NUMBER_ID,
    businessAccountId: state.WABA_BUSINESS_ACCOUNT_ID,
    bot: state.wabaBotInfo,
  });
}

/* POST /api/waba/config — pasang / ganti kredensial WABA (validasi ke Meta dulu) */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const token = String(body.token || body.accessToken || '').trim();
    const phoneNumberId = String(body.phoneNumberId || '').trim();
    const businessAccountId = String(body.businessAccountId || '').trim();
    const verifyToken = String(body.verifyToken || '').trim();

    console.log(`[WABA] POST /api/waba/config diterima — verifyToken: "${verifyToken}"`);

    if (!token) return fail('Access Token tidak boleh kosong', 400);
    if (!phoneNumberId) return fail('Phone Number ID tidak boleh kosong', 400);

    const bot = await wabaSetConfig({ token, phoneNumberId, businessAccountId, verifyToken });
    console.log(`[WABA] WABA_VERIFY_TOKEN sekarang di memori: "${state.WABA_VERIFY_TOKEN}"`);
    return ok({ bot });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    console.error('[WABA] Gagal menyimpan konfigurasi:', errMsg(err));
    return fail(errMsg(err), status);
  }
}

/* DELETE /api/waba/config — putuskan koneksi */
export async function DELETE() {
  wabaClearConfig();
  return ok();
}
