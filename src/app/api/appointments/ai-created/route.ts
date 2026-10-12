import { ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ appointments: state.aiAppointments });
}
