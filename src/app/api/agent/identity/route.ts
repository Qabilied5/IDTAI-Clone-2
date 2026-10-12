import { agentSetIdentity } from '@/server/agents';
import { fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  ensureDataLoaded();
  return ok({ identity: { ...state.companyIntro } });
}

export async function POST(req: Request) {
  const body = await readJson(req);
  const botName = String(body.botName || '').trim();
  const companyName = String(body.companyName || '').trim();
  if (!botName && !companyName) return fail('botName atau companyName wajib diisi', 400);
  return ok({ identity: agentSetIdentity({ botName, companyName }) });
}
