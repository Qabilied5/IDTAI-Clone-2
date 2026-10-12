import { NextResponse } from 'next/server';

import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';
import { wabaHandleWebhookBody } from '@/server/waba';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/waba/webhook — verifikasi webhook dari Meta App Dashboard */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge') || '';

  console.log(`[WABA] Webhook verify — mode: ${mode}, token diterima: "${token}", token di server: "${state.WABA_VERIFY_TOKEN}"`);

  if (mode === 'subscribe' && token && token === state.WABA_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse(null, { status: 403 });
}

/* POST /api/waba/webhook — pesan masuk dari Meta. Balas 200 secepatnya,
   proses (termasuk panggilan Ollama) jalan di background. */
export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  ensureDataLoaded();
  setImmediate(() => {
    try {
      wabaHandleWebhookBody(body);
    } catch (err) {
      console.error('[WABA] Gagal proses webhook:', (err as Error).message);
    }
  });

  return new NextResponse(null, { status: 200 });
}
