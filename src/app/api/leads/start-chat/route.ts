import { NextRequest, NextResponse } from 'next/server';
import { getActiveChatProvider, startChatWithLead, type StartChatLead } from '@/server/leads';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { leads, provider: requested } = await req.json();
    if (!Array.isArray(leads)) {
      return NextResponse.json({ ok: false, error: 'leads harus berupa array' }, { status: 400 });
    }

    const provider = getActiveChatProvider(requested);
    if (!provider) {
      return NextResponse.json(
        { ok: false, error: 'Tidak ada provider chat yang aktif. Hubungkan WhatsApp Business API atau Telegram Bot di halaman Integrasi.' },
        { status: 400 },
      );
    }

    const results: Array<Record<string, unknown>> = [];
    for (const lead of leads as StartChatLead[]) {
      if (!lead?.id || !lead.phone) {
        results.push({ id: lead?.id, ok: false, reason: 'no_phone' });
        continue;
      }
      try {
        const r = await startChatWithLead(provider, lead);
        results.push({ id: lead.id, provider, ...r });
      } catch (err) {
        console.error(`[Leads] Gagal mulai chat utk lead ${lead.id}:`, err);
        results.push({ id: lead.id, ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    }
    return NextResponse.json({ ok: true, provider, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}