/**
 * Auto Reply berbasis Knowledge Base.
 *
 * Alur: pesan masuk → cari potongan dokumen AKTIF yang relevan → model (Ollama) menjawab
 * HANYA dari potongan itu. Jika jawabannya tidak ada, hasilnya `handoff: true`
 * sehingga pemanggil (webhook Telegram/WhatsApp) bisa meneruskan ke agen manusia
 * alih-alih mengarang jawaban.
 */
import { selectContext } from '@/lib/knowledge-base/retrieval';
import { getActiveChunks } from '@/server/knowledge-base/index-cache';
import { ollamaChat, type ChatMsg } from '@/server/knowledge-base/ai';
import type { KbAnswer, KbChatTurn } from '@/types/knowledge-base';

export { AiUnavailableError } from '@/server/knowledge-base/ai';

export const NO_ANSWER_MARKER = '[[TIDAK_TAHU]]';
export const DEFAULT_FALLBACK =
  'Terima kasih atas pertanyaannya. Untuk hal ini saya belum punya informasi yang pasti, ' +
  'jadi saya teruskan ke tim kami ya. Mohon ditunggu sebentar. 🙏';

export interface AutoReplyInput {
  message: string;
  /** Riwayat percakapan sebelumnya (opsional, maks 6 giliran terakhir dipakai). */
  history?: KbChatTurn[];
  businessName?: string;
  /** Balasan saat jawaban tidak ada di KB. */
  fallbackReply?: string;
}

function systemPrompt(business: string, context: string): string {
  return [
    `Kamu adalah asisten layanan pelanggan ${business}. Jawab pertanyaan pelanggan HANYA berdasarkan bagian PENGETAHUAN di bawah.`,
    '',
    'Aturan:',
    '- Jangan mengarang harga, spesifikasi, stok, kebijakan, atau data apa pun yang tidak tertulis di PENGETAHUAN.',
    `- Jika jawabannya tidak ada di PENGETAHUAN, balas persis dengan: ${NO_ANSWER_MARKER}`,
    '- Untuk sapaan atau ucapan terima kasih, balas singkat dan ramah (tanpa penanda di atas).',
    '- Jawab ringkas, sopan, dan dalam bahasa yang dipakai pelanggan (default: Bahasa Indonesia).',
    '- Jangan menyebut kata "PENGETAHUAN", "dokumen", atau nomor sumber kepada pelanggan.',
    '',
    'PENGETAHUAN:',
    context,
  ].join('\n');
}

export async function answerFromKnowledgeBase(input: AutoReplyInput): Promise<KbAnswer> {
  const message = input.message.trim();
  const fallback = input.fallbackReply || DEFAULT_FALLBACK;
  const history = (input.history ?? []).slice(-6);
  const handoff: KbAnswer = { reply: fallback, grounded: false, handoff: true, sources: [] };

  const chunks = await getActiveChunks();
  if (!message || !chunks.length) return handoff;

  // Pertanyaan lanjutan ("berapa harganya?") butuh konteks pesan pelanggan sebelumnya.
  const query = [...history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content), message].join(' ');
  const budget = Number(process.env.KB_CONTEXT_CHARS) || 9000;
  const { picked, ranked } = selectContext(query, chunks, budget);

  const context = picked.length
    ? picked.map((c, i) => `[${i + 1}] ${c.title}\n${c.text}`).join('\n\n')
    : '(tidak ada informasi yang relevan)';

  const messages: ChatMsg[] = [
    { role: 'system', content: systemPrompt(input.businessName || 'kami', context) },
    ...history.map((h) => ({ role: h.role, content: h.content }) as ChatMsg),
    { role: 'user', content: message },
  ];

  const raw = await ollamaChat(messages, { temperature: 0.2 });
  if (!raw || raw.includes(NO_ANSWER_MARKER)) return handoff;

  const seen = new Set<string>();
  const sources = ranked
    .slice(0, 5)
    .filter((r) => (seen.has(r.chunk.docId) ? false : (seen.add(r.chunk.docId), true)))
    .slice(0, 3)
    .map((r) => ({ id: r.chunk.docId, title: r.chunk.title }));

  return { reply: raw, grounded: sources.length > 0, handoff: false, sources };
}
