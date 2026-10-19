import { fail, ok } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET /api/knowledge-base/crawl/:jobId — status & progres crawl.
   Client mengharapkan docsCreated berupa JUMLAH, bukan daftar dokumen. */
export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  ensureDataLoaded();
  const job = state.kbCrawlJobs[params.jobId];
  if (!job) return fail('Job crawl tidak ditemukan (mungkin sudah kedaluwarsa)', 404);
  const { docsCreated, cancelled: _cancelled, ...rest } = job;
  return ok({ job: { ...rest, docsCreated: docsCreated.length } });
}
