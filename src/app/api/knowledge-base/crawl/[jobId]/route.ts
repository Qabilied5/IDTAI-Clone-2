import { fail, ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const job = state.kbCrawlJobs[params.jobId];
  if (!job) return fail('Job crawl tidak ditemukan (mungkin sudah lama selesai)', 404);
  return ok({
    job: {
      id: job.id,
      status: job.status,
      startUrl: job.startUrl,
      pagesVisited: job.pagesVisited,
      maxPages: job.maxPages,
      currentUrl: job.currentUrl,
      docsCreated: job.docsCreated.length,
      errors: job.errors.slice(-10),
      error: job.error,
      aiFilterTotalPages: job.aiFilterTotalPages || 0,
      aiFilterFailedPages: job.aiFilterFailedPages || 0,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    },
  });
}
