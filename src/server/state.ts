/* =============================================================
   src/server/state.ts
   Semua state mutable backend disimpan sebagai SINGLETON di globalThis.
   Alasan: di Next.js, modul bisa di-reload (dev HMR) dan Route Handler
   tidak punya "process global" seperti app.listen() di Express. Dengan
   globalThis, state tetap satu instance selama proses Node hidup —
   percakapan, token yang diinput dari halaman Integrasi, polling
   Telegram, dsb tidak ke-reset antar request.
   ============================================================= */
import type {
  AiAppointment, Conversation, CrawlJob, EscalationSettings, KbDoc, PicAgent, PipelineDeal,
  PipelineStage, SendLogEntry,
} from './types';

export interface BackendState {
  // ── Kredensial runtime (diatur dari halaman Integrasi; .env cuma fallback awal) ──
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_DEFAULT_CHAT_ID: string;
  WABA_ACCESS_TOKEN: string;
  WABA_PHONE_NUMBER_ID: string;
  WABA_BUSINESS_ACCOUNT_ID: string;
  WABA_VERIFY_TOKEN: string;
  CALENDLY_ACCESS_TOKEN: string;
  CALENDLY_EVENT_TYPE_URI: string;

  wabaBotInfo: { verified_name?: string; display_phone_number?: string } | null;
  calendlyUserInfo: { uri: string; name: string; email: string; organizationUri: string } | null;
  calendlyEventType: { uri: string; name: string; duration: number | null; schedulingUrl: string } | null;
  calendlyLastPolledAt: string | null;
  calKnownEventUris: Set<string>;

  // ── Telegram polling ──
  tgBotInfo: any;
  tgOffset: number;
  tgPollingActive: boolean;
  tgPollEpoch: number;

  // ── Data in-memory (hilang saat restart, sama seperti server.js) ──
  tgConversations: Map<string, Conversation>;
  wabaConversations: Map<string, Conversation>;
  sendLog: SendLogEntry[];
  aiAppointments: AiAppointment[];
  kbCrawlJobs: Record<string, CrawlJob>;
  kbOllamaReachableCache: { ok: boolean | null; checkedAt: number };

  // ── Data persisten (file JSON di data/) ──
  knowledgeBase: KbDoc[];
  picAgents: PicAgent[];
  pipelineDeals: PipelineDeal[];
  pipelineStages: PipelineStage[];
  picQueuePointer: number;
  escalationSettings: EscalationSettings;
  companyIntro: { botName: string; companyName: string };

  // ── Flag background jobs (instrumentation.ts) ──
  backgroundStarted: boolean;
  dataLoaded: boolean;
}

function freshState(): BackendState {
  return {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_DEFAULT_CHAT_ID: process.env.TELEGRAM_DEFAULT_CHAT_ID || '',
    WABA_ACCESS_TOKEN: process.env.WABA_ACCESS_TOKEN || '',
    WABA_PHONE_NUMBER_ID: process.env.WABA_PHONE_NUMBER_ID || '',
    WABA_BUSINESS_ACCOUNT_ID: process.env.WABA_BUSINESS_ACCOUNT_ID || '',
    WABA_VERIFY_TOKEN: process.env.WABA_VERIFY_TOKEN || '',
    CALENDLY_ACCESS_TOKEN: process.env.CALENDLY_ACCESS_TOKEN || '',
    CALENDLY_EVENT_TYPE_URI: process.env.CALENDLY_EVENT_TYPE_URI || '',

    wabaBotInfo: null,
    calendlyUserInfo: null,
    calendlyEventType: null,
    calendlyLastPolledAt: null,
    calKnownEventUris: new Set(),

    tgBotInfo: null,
    tgOffset: 0,
    tgPollingActive: false,
    tgPollEpoch: 0,

    tgConversations: new Map(),
    wabaConversations: new Map(),
    sendLog: [],
    aiAppointments: [],
    kbCrawlJobs: {},
    kbOllamaReachableCache: { ok: null, checkedAt: 0 },

    knowledgeBase: [],
    picAgents: [],
    pipelineStages: [
      { id: 'prospek', label: 'Prospek' },
      { id: 'kualifikasi', label: 'Kualifikasi' },
      { id: 'proposal', label: 'Proposal' },
      { id: 'negosiasi', label: 'Negosiasi' },
      { id: 'won', label: 'Won' },
    ],
    pipelineDeals: [], // mulai kosong — deal diisi lewat "Tambah Deal"
    picQueuePointer: 0,
    escalationSettings: {
      keywords: ['komplain', 'refund', 'rusak', 'tidak terima', 'salah kirim'],
      humanRequestKeywords: ['admin', 'manusia', 'cs', 'agen', 'operator', 'customer service'],
      priceNegotiationKeywords: ['diskon', 'nego', 'negosiasi', 'harga khusus', 'harga spesial', 'harga miring', 'potongan harga', 'boleh kurang', 'murahin'],
      priceLimitPercent: 10,
      repeatThreshold: 3,
      stallMinutes: 5,
      triggers: {
        sensitiveKeyword: true,
        repeatedQuestion: true,
        priceNegotiation: true,
        humanRequest: true,
        stalled: false,
      },
      notifyCustomer: true,
      handoffMessage: 'Percakapan Anda akan diteruskan ke Agent, mohon menunggu beberapa saat',
    },
    companyIntro: {
      botName: process.env.BOT_NAME || 'IDT AI',
      companyName: process.env.COMPANY_NAME || 'Indotrading',
    },

    backgroundStarted: false,
    dataLoaded: false,
  };
}

const g = globalThis as unknown as { __idtaiBackendState?: BackendState };
if (!g.__idtaiBackendState) g.__idtaiBackendState = freshState();

export const state: BackendState = g.__idtaiBackendState;

export function wabaConfigured(): boolean {
  return !!(state.WABA_ACCESS_TOKEN && state.WABA_PHONE_NUMBER_ID);
}
export function telegramConfigured(): boolean {
  return !!state.TELEGRAM_BOT_TOKEN;
}
export function calendlyConfigured(): boolean {
  return !!(state.CALENDLY_ACCESS_TOKEN && state.CALENDLY_EVENT_TYPE_URI);
}
