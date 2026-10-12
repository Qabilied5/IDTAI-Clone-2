import { NextResponse } from 'next/server';
import { OLLAMA_BASE_URL, OLLAMA_MODEL, PIPELINE_OLLAMA_MODEL, SEND_MODE } from '@/server/config';
import { kbActiveContext } from '@/server/knowledge-base';
import { ollamaReachable } from '@/server/ollama';
import { calendlyConfigured, state, telegramConfigured, wabaConfigured } from '@/server/state';
import { ensureDataLoaded } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  ensureDataLoaded();
  const ollamaOk = await ollamaReachable();
  return NextResponse.json({
    ok: true,
    sendMode: SEND_MODE,
    ollama: { reachable: ollamaOk, followupModel: OLLAMA_MODEL, pipelineModel: PIPELINE_OLLAMA_MODEL, baseUrl: OLLAMA_BASE_URL },
    telegram: { configured: telegramConfigured() },
    waba: { configured: wabaConfigured() },
    calendly: { configured: calendlyConfigured(), eventTypeUri: state.CALENDLY_EVENT_TYPE_URI || null },
    knowledgeBase: {
      totalDocs: state.knowledgeBase.length,
      activeDocs: state.knowledgeBase.filter((d) => d.status === 'aktif').length,
      contextChars: kbActiveContext().length,
    },
  });
}
