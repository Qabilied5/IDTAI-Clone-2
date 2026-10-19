import { NextResponse } from 'next/server';

import { findOrgByWabaVerifyToken } from '@/server/tenants';
import { wabaHandleWebhookBody } from '@/server/waba';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/waba/webhook — verifikasi webhook dari Meta App Dashboard.
   Multi-perusahaan: verify token boleh cocok dengan perusahaan MANA PUN. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge') || '';

  const owner = mode === 'subscribe' && token ? findOrgByWabaVerifyToken(token) : null;
  console.log(`[WABA] Webhook verify — mode: ${mode}, token ${owner ? 'cocok' : 'TIDAK cocok'}`);

  if (owner) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse(null, { status: 403 });
}

/* POST /api/waba/webhook — pesan masuk dari Meta. Balas 200 secepatnya,
   proses (termasuk panggilan Ollama) jalan di background.
   Perusahaan pemilik pesan ditentukan di wabaHandleWebhookBody lewat phone_number_id. */
export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  setImmediate(() => {
    try {
      wabaHandleWebhookBody(body);
    } catch (err) {
      console.error('[WABA] Gagal proses webhook:', (err as Error).message);
    }
  });

  return new NextResponse(null, { status: 200 });
}
