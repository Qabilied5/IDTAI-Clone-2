import { fail, ok, readJson } from '@/server/http';
import { kbCreateCrawlJob } from '@/server/knowledge-base';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { url, category, maxPages, maxDepth, sameDomainOnly, aiFilter } = await readJson(req);
  if (!url) return fail('URL kosong', 400);
  try { new URL(url); } catch { return fail('Format URL tidak valid', 400); }
  const job = kbCreateCrawlJob({ url, category, maxPages, maxDepth, sameDomainOnly, aiFilter });
  return ok({ jobId: job.id });
}
