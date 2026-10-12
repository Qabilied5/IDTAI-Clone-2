import { listConversations } from '@/server/conversation-routes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return listConversations('whatsapp');
}
