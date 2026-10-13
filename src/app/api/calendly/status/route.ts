import { ok } from '@/server/http';
import { calendlyConfigured, state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/calendly/status — indikator koneksi di halaman Integrasi */
export async function GET() {
  return ok({
    configured: calendlyConfigured(),
    user: state.calendlyUserInfo
      ? { name: state.calendlyUserInfo.name, email: state.calendlyUserInfo.email }
      : null,
    eventType: state.calendlyEventType
      ? { name: state.calendlyEventType.name, duration: state.calendlyEventType.duration, schedulingUrl: state.calendlyEventType.schedulingUrl }
      : null,
  });
}
