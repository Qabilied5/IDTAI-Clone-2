/* Knowledge Base index — belum diport dari server.js. Stub supaya route valid. */
import { fail } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return fail('Endpoint /api/knowledge-base belum diimplementasikan', 501);
}
