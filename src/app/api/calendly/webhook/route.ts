import { NextResponse } from 'next/server';
import { apptCreateFromCalendlyBooking, calendlyGetFreshEventInfo } from '@/server/calendly';
import { readJson } from '@/server/http';
import { runWithOrg } from '@/server/org-context';
import { findOrgByCalendlyEvent } from '@/server/tenants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Webhook Calendly (invitee.created). Belum ada verifikasi signature —
   sama seperti server.js; tambahkan HMAC kalau dipakai di produksi.
   Multi-perusahaan: pemilik booking dicari dari event type / user pada payload. */
export async function POST(req: Request) {
  const body = await readJson(req);

  setImmediate(async () => {
    try {
      const { event, payload } = body || {};
      if (event !== 'invitee.created' || !payload) return;
      let eventInfo = payload.scheduled_event || {};
      if (!eventInfo.start_time) {
        console.warn('[Calendly] Payload invitee.created tanpa scheduled_event.start_time, dilewati:', JSON.stringify(payload));
        return;
      }

      const userUris: string[] = Array.isArray(eventInfo.event_memberships)
        ? eventInfo.event_memberships.map((m: any) => m && m.user).filter(Boolean)
        : [];
      const orgId = findOrgByCalendlyEvent(eventInfo.event_type, userUris);
      if (!orgId) {
        console.warn('[Calendly] Booking tidak cocok dengan perusahaan mana pun (event type:', eventInfo.event_type, ') — dilewati');
        return;
      }

      await runWithOrg(orgId, async () => {
        console.log(`[Calendly] Booking baru dari ${payload.email || '-'} untuk ${eventInfo.start_time}`);
        eventInfo = await calendlyGetFreshEventInfo(eventInfo);
        apptCreateFromCalendlyBooking(payload, eventInfo);
      });
    } catch (err) {
      console.error('[Calendly] Gagal proses webhook:', (err as Error).message);
    }
  });

  return new NextResponse(null, { status: 200 });
}
