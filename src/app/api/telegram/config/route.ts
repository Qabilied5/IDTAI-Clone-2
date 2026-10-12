import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { telegramClearConfig, telegramSetConfig } from '@/server/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({
    configured: !!state.TELEGRAM_BOT_TOKEN,
    tokenPreview: state.TELEGRAM_BOT_TOKEN
      ? `${state.TELEGRAM_BOT_TOKEN.slice(0, 6)}••••${state.TELEGRAM_BOT_TOKEN.slice(-4)}`
      : '',
    chatId: state.TELEGRAM_DEFAULT_CHAT_ID,
    polling: state.tgPollingActive,
    bot: state.tgBotInfo,
  });
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const token = String(body.token || body.botToken || '').trim();
    const chatId = String(body.chatId || '').trim();
    if (!token) return fail('Token tidak boleh kosong', 400);
    const bot = await telegramSetConfig(token, chatId);
    return ok({ bot });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    console.error('[Telegram] Gagal menyimpan konfigurasi:', errMsg(err));
    return fail(errMsg(err), status);
  }
}

export async function DELETE() {
  telegramClearConfig();
  return ok();
}
