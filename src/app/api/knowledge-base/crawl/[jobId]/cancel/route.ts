import { fail, ok } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST /api/knowledge-base/crawl/:jobId/cancel */
export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  ensureDataLoaded();
  const job = state.kbCrawlJobs[params.jobId];
  if (!job) return fail('Job crawl tidak ditemukan', 404);
  job.cancelled = true;
  return ok();
}
