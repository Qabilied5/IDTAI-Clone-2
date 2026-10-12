import { WABA_GRAPH_BASE } from '@/server/config';
import { xfetch } from '@/server/fetch';
import { errMsg, fail, ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/waba/templates — diagnosa: daftar template yang terdaftar di WABA */
export async function GET() {
  try {
    if (!state.WABA_ACCESS_TOKEN || !state.WABA_BUSINESS_ACCOUNT_ID) {
      return fail(
        'WABA Access Token / WhatsApp Business Account ID belum diisi. Isi keduanya di halaman Integrasi.',
        400
      );
    }
    const url = `${WABA_GRAPH_BASE}/${state.WABA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,language,status,category&limit=100`;
    const r = await xfetch(url, { headers: { Authorization: `Bearer ${state.WABA_ACCESS_TOKEN}` } });
    const data = await r.json();
    if (data.error) return fail(data.error.message, 400, { detail: data.error });
    return ok({ wabaBusinessAccountId: state.WABA_BUSINESS_ACCOUNT_ID, templates: data.data || [] });
  } catch (err) {
    return fail(errMsg(err));
  }
}
