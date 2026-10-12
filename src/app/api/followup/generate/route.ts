import { generateFollowupMessage } from '@/server/followup';
import { errMsg, fail, ok, readJson } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { lead } = await readJson(req);
    if (!lead || !lead.nama) return fail('Data lead tidak lengkap', 400);
    const message = await generateFollowupMessage(lead);
    return ok({ message });
  } catch (err) {
    console.error(err);
    return fail(errMsg(err));
  }
}
