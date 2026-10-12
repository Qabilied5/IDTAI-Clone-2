import { ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { ensureDataLoaded, escSave } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  ensureDataLoaded();
  return ok({ settings: state.escalationSettings });
}

export async function POST(req: Request) {
  ensureDataLoaded();
  const body = await readJson(req);
  const s = state.escalationSettings;
  if (Array.isArray(body.keywords)) s.keywords = body.keywords.filter(Boolean);
  if (Array.isArray(body.humanRequestKeywords)) s.humanRequestKeywords = body.humanRequestKeywords.filter(Boolean);
  if (Array.isArray(body.priceNegotiationKeywords)) s.priceNegotiationKeywords = body.priceNegotiationKeywords.filter(Boolean);
  if (Number.isFinite(body.priceLimitPercent) && body.priceLimitPercent >= 0) s.priceLimitPercent = body.priceLimitPercent;
  if (Number.isFinite(body.repeatThreshold) && body.repeatThreshold > 0) s.repeatThreshold = body.repeatThreshold;
  if (Number.isFinite(body.stallMinutes) && body.stallMinutes > 0) s.stallMinutes = body.stallMinutes;
  if (body.triggers && typeof body.triggers === 'object') s.triggers = { ...s.triggers, ...body.triggers };
  if (typeof body.notifyCustomer === 'boolean') s.notifyCustomer = body.notifyCustomer;
  if (typeof body.handoffMessage === 'string') s.handoffMessage = body.handoffMessage.trim();
  escSave();
  return ok({ settings: s });
}
