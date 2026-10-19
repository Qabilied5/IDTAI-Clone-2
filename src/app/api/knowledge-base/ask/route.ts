import { AiUnavailableError, answerFromKnowledgeBase } from '@/server/auto-reply/answer';
import { ok, fail, errMsg, readJson } from '@/server/knowledge-base/http';
import type { KbChatTurn } from '@/types/knowledge-base';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** POST { message, history? } — uji jawaban AI dari KB (dipakai tombol "Uji Jawaban") */
export async function POST(req: Request) {
  const b = await readJson<{ message: string; history: KbChatTurn[] }>(req);
  const message = String(b.message ?? '').trim();
  if (!message) return fail('Tulis pertanyaan terlebih dahulu');
  try {
    return ok({ ...(await answerFromKnowledgeBase({ message, history: b.history })) });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return fail('Model AI (Ollama) tidak dapat dihubungi. Pastikan Ollama sedang berjalan.', 503);
    }
    return fail(errMsg(e, 'Gagal membuat jawaban'), 500);
  }
}
