import { picDelete, picUpdate } from '@/server/agents';
import { fail, ok, readJson } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson(req);
  const agent = picUpdate(Number(params.id), body);
  if (!agent) return fail('PIC tidak ditemukan', 404);
  return ok({ agent });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!picDelete(Number(params.id))) return fail('PIC tidak ditemukan', 404);
  return ok();
}
