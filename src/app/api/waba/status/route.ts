import { ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/waba/status — indikator koneksi di UI */
export async function GET() {
  return ok({
    configured: !!(state.WABA_ACCESS_TOKEN && state.WABA_PHONE_NUMBER_ID),
    bot: state.wabaBotInfo,
  });
}
