import { apptConfirm } from '@/server/appointments';
import { fail, ok } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const record = apptConfirm(params.id);
  if (!record) return fail('Appointment tidak ditemukan', 404);
  return ok({ appointment: record });
}
