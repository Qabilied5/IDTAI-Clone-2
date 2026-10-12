import { ok } from '@/server/http';
import { state } from '@/server/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ configured: !!state.TELEGRAM_BOT_TOKEN, polling: state.tgPollingActive, bot: state.tgBotInfo });
}
