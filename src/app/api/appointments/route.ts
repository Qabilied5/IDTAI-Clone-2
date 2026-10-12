import { appointmentFollowup } from '@/server/followup';
import { errMsg, fail, ok, readJson } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { appointment, lead } = await readJson(req);
    if (!appointment || !appointment.nama) return fail('Data appointment tidak lengkap', 400);
    const r = await appointmentFollowup(appointment, lead);
    return ok({ delivered: r.delivered, provider: r.provider, chatId: r.chatId, message: r.message });
  } catch (err) {
    console.error('[Appointment Follow-up] Gagal:', err);
    return fail(errMsg(err));
  }
}
