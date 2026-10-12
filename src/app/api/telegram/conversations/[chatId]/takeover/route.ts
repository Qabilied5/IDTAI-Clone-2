import { takeoverConversation } from '@/server/conversation-routes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  return takeoverConversation('telegram', params.chatId, req);
}
