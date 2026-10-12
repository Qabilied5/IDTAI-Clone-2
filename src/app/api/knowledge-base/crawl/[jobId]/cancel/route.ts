import { fail, ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const job = state.kbCrawlJobs[params.jobId];
  if (!job) return fail('Job crawl tidak ditemukan', 404);
  if (job.status === 'running') job.cancelled = true;
  return ok();
}
