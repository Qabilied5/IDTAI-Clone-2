import { picCreate } from '@/server/agents';
import { fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/agents — daftar PIC / human agent */
export async function GET() {
  ensureDataLoaded();
  return ok({ agents: state.picAgents });
}

/* POST /api/agents — tambah PIC baru */
export async function POST(req: Request) {
  const body = await readJson(req);
  const nama = String(body.nama || '').trim();
  const email = String(body.email || '').trim();
  if (!nama) return fail('Nama wajib diisi', 400);
  if (!email) return fail('Email wajib diisi', 400);
  return ok({ agent: picCreate({ nama, email, role: body.role }) });
}
