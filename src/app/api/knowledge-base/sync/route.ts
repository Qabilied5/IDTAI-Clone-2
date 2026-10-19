import { syncDueUrlDocs } from '@/server/knowledge-base/sync';
import { ok, fail } from '@/server/knowledge-base/http';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/knowledge-base/sync — dipanggil cron (mis. tiap jam).
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return fail('Unauthorized', 401);
  return ok(await syncDueUrlDocs());
}
