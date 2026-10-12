import { calendlyFormatSlotLabel, calendlyGetAvailableSlots } from '@/server/calendly';
import { errMsg, fail, ok } from '@/server/http';
import { calendlyConfigured } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    if (!calendlyConfigured()) return fail('Calendly belum dikonfigurasi (token/Event Type URI belum lengkap)', 400);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 5, 20);
    const slots = await calendlyGetAvailableSlots(limit);
    return ok({
      slots: slots.map((s) => ({ startTime: s.startTime, label: calendlyFormatSlotLabel(s.startTime), schedulingUrl: s.schedulingUrl })),
    });
  } catch (err) {
    return fail(errMsg(err));
  }
}
