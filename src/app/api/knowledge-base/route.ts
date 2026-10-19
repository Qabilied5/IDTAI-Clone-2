import { ok } from '@/server/http';
import { kbPublicDoc } from '@/server/knowledge-base';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/knowledge-base — daftar dokumen milik perusahaan yang sedang login
   (state di-resolve per perusahaan lewat konteks tenant). Isi lengkap tiap dokumen
   diambil terpisah lewat GET /api/knowledge-base/:id. */
export async function GET() {
  ensureDataLoaded();
  return ok({ docs: state.knowledgeBase.map(kbPublicDoc) });
}
