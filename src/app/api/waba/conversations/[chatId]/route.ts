import { getConversation } from '@/server/conversation-routes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { chatId: string } }) {
  return getConversation('whatsapp', params.chatId);
}
