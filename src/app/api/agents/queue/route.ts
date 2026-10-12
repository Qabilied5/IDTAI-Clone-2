import { picAvailableAgents } from '@/server/agents';
import { ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/agents/queue — urutan antrean eskalasi (least-busy dulu) */
export async function GET() {
  const pool = picAvailableAgents().slice().sort((a, b) => (a.chat || 0) - (b.chat || 0));
  return ok({ queue: pool, pointer: state.picQueuePointer });
}
