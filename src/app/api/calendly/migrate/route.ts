import { calendlySetConfig } from '@/server/calendly';
import { errMsg, fail, ok, readJson } from '@/server/http';
import { getIntegration } from '@/server/integration-store';
import { requireOrgId } from '@/server/org-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/calendly/migrate — pindahkan kredensial lama dari localStorage ke database (sekali jalan).
   Body: { token, eventTypeUri }.
   - Database sudah punya kredensial -> database yang menang; klien boleh membuang salinan browser (alreadyInDb:true).
   - Database masih kosong           -> token divalidasi ke Calendly, lalu disimpan terenkripsi (migrated:true).
   - Token tidak valid               -> error 400; klien TIDAK menghapus localStorage. */
export async function POST(req: Request) {
  try {
    const orgId = requireOrgId();
    const existing = await getIntegration(orgId, 'calendly');
    if (existing?.status === 'connected' && existing.settings.token && existing.settings.eventTypeUri) {
      return ok({ migrated: false, alreadyInDb: true });
    }

    const body = await readJson(req);
    const token = String(body.token || '').trim();
    const eventTypeInput = String(body.eventTypeUri || '').trim();
    if (!token) return fail('Token Calendly dari localStorage kosong', 400);

    const { user, eventType } = await calendlySetConfig(token, eventTypeInput);
    return ok({ migrated: true, user, eventType });
  } catch (err: any) {
    console.error('[Calendly] Migrasi localStorage -> database gagal:', errMsg(err));
    return fail(errMsg(err), err?.status || 500);
  }
}
