import { fail, ok, readJson } from '@/server/http';
import { kbCreateCrawlJob } from '@/server/knowledge-base';
import { ensureDataLoaded } from '@/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* POST /api/knowledge-base/crawl — body { url, category, maxPages, maxDepth, sameDomainOnly, aiFilter }
   Mulai crawl di background; progres dibaca lewat GET /crawl/:jobId. */
export async function POST(req: Request) {
  ensureDataLoaded();
  const b = await readJson<{
    url?: string; category?: string; maxPages?: number; maxDepth?: number; sameDomainOnly?: boolean; aiFilter?: boolean;
  }>(req);
  const url = String(b.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) return fail('URL harus diawali http:// atau https://', 400);
  try {
    new URL(url);
  } catch {
    return fail('URL tidak valid', 400);
  }
  const job = kbCreateCrawlJob({ ...b, url });
  return ok({ jobId: job.id });
}
