import { errMsg, fail, ok, readJson } from '@/server/http';
import { kbAddFromUrl, kbPublicDoc } from '@/server/knowledge-base';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { url, category, autoSync, aiFilter } = await readJson(req);
  if (!url) return fail('URL kosong', 400);
  try {
    const { doc, aiFilterNote } = await kbAddFromUrl({ url, category, autoSync, aiFilter });
    return ok({ doc: kbPublicDoc(doc), aiFilterWarning: aiFilterNote });
  } catch (e) {
    return fail(errMsg(e));
  }
}
