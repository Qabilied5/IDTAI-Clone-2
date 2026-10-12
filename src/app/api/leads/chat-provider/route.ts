import { NextResponse } from 'next/server';
import { chatProviderStatus, getActiveChatProvider } from '@/server/leads';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { whatsapp, telegram } = chatProviderStatus();
  return NextResponse.json({
    ok: true,
    provider: getActiveChatProvider(),
    whatsapp: { configured: whatsapp },
    telegram: { configured: telegram },
  });
}