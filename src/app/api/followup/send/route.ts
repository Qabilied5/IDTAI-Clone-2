import { appendSendLog, generateFollowupMessage, sendMessage } from '@/server/followup';
import { errMsg, fail, ok, readJson } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { lead, message, chatId, mode } = await readJson(req);
    if (!lead || !lead.nama) return fail('Data lead tidak lengkap', 400);

    const finalMessage = message && String(message).trim() ? String(message).trim() : await generateFollowupMessage(lead);
    const result = await sendMessage({ mode, chatId, message: finalMessage, lead });

    const logEntry = appendSendLog({
      leadId: lead.id,
      leadNama: lead.nama,
      message: finalMessage,
      provider: result.provider,
      timestamp: new Date().toISOString(),
    });
    return ok({ message: finalMessage, result, logEntry });
  } catch (err) {
    console.error(err);
    return fail(errMsg(err));
  }
}
