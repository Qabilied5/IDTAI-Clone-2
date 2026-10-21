/* =============================================================
   src/server/state.ts
   State mutable backend, SATU PER PERUSAHAAN (multi-tenant), disimpan di globalThis
   (modul bisa di-reload saat dev HMR dan Route Handler tidak punya "process global").

   `state` yang diekspor adalah Proxy: setiap akses (`state.tgConversations`, dst.)
   otomatis diarahkan ke state milik perusahaan yang sedang aktif (lihat org-context.ts).
   Dengan begitu seluruh kode lama yang memakai `state` tetap jalan tanpa diubah.
   ============================================================= */
import { getDefaultOrgId, normOrgId, orgIdOrDefault } from './org-context';
import type {
  AiAppointment, Conversation, CrawlJob, EscalationSettings, KbDoc, PicAgent, PipelineDeal,
  PipelineStage, SendLogEntry,
} from './types';

/** Identitas & persona agent AI milik satu perusahaan (disimpan di dbo.AgentIdentity). */
export interface CompanyIntro {
  botName: string;
  companyName: string;
  /** Deskripsi bisnis yang dibaca AI di semua prompt. Kosong = AI diminta tidak mengarang. */
  companyDesc: string;
  tone?: 'formal' | 'santai' | 'industri' | 'custom';
  roleTitle?: string;
  tagline?: string;
  /** Instruksi khusus pemilik bisnis, ditambahkan ke prompt balasan pelanggan. */
  sop?: string;
  langId?: boolean;
  langAuto?: boolean;
  greetName?: boolean;
}

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
  companyIntro: CompanyIntro;

  // ── Flag background jobs (instrumentation.ts) ──
  backgroundStarted: boolean;
  dataLoaded: boolean;
}

/* Nilai .env hanya dipakai sebagai fallback awal untuk perusahaan DEFAULT. */
function isDefaultOrg(orgId: string): boolean {
  const d = getDefaultOrgId();
  return d ? orgId === d : orgId === 'default';
}

function freshState(orgId: string): BackendState {
  const env = isDefaultOrg(orgId);
  const e = (k: string) => (env ? process.env[k] || '' : '');
  return {
    TELEGRAM_BOT_TOKEN: e('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_DEFAULT_CHAT_ID: e('TELEGRAM_DEFAULT_CHAT_ID'),
    WABA_ACCESS_TOKEN: e('WABA_ACCESS_TOKEN'),
    WABA_PHONE_NUMBER_ID: e('WABA_PHONE_NUMBER_ID'),
    WABA_BUSINESS_ACCOUNT_ID: e('WABA_BUSINESS_ACCOUNT_ID'),
    WABA_VERIFY_TOKEN: e('WABA_VERIFY_TOKEN'),
    CALENDLY_ACCESS_TOKEN: e('CALENDLY_ACCESS_TOKEN'),
    CALENDLY_EVENT_TYPE_URI: e('CALENDLY_EVENT_TYPE_URI'),

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
    // Nilai .env hanya untuk perusahaan default; perusahaan lain mulai netral. Nama perusahaan
    // diisi dari tabel Organizations saat boot (integration-sync.ts), lalu ditimpa AgentIdentity.
    companyIntro: {
      botName: e('BOT_NAME') || 'Asisten AI',
      companyName: e('COMPANY_NAME') || 'perusahaan kami',
      companyDesc: e('COMPANY_DESC'),
    },

    backgroundStarted: false,
    dataLoaded: false,
  };
}

const g = globalThis as unknown as { __idtaiBackendStates?: Map<string, BackendState> };
const registry: Map<string, BackendState> = (g.__idtaiBackendStates ??= new Map());

/** State milik satu perusahaan (dibuat bila belum ada). */
export function getStateFor(orgId: string): BackendState {
  const key = normOrgId(orgId);
  let s = registry.get(key);
  if (!s) {
    s = freshState(key);
    registry.set(key, s);
  }
  return s;
}

export function allOrgIds(): string[] { return [...registry.keys()]; }
export function allStates(): [string, BackendState][] { return [...registry.entries()]; }

function current(): BackendState { return getStateFor(orgIdOrDefault()); }

export const state: BackendState = new Proxy({} as BackendState, {
  get: (_t, prop) => Reflect.get(current(), prop),
  set: (_t, prop, value) => Reflect.set(current(), prop, value),
  has: (_t, prop) => Reflect.has(current(), prop),
  deleteProperty: (_t, prop) => Reflect.deleteProperty(current(), prop),
  ownKeys: () => Reflect.ownKeys(current()),
  getOwnPropertyDescriptor: (_t, prop) => {
    const d = Reflect.getOwnPropertyDescriptor(current(), prop);
    return d ? { ...d, configurable: true } : undefined;
  },
});

export function wabaConfigured(): boolean {
  return !!(state.WABA_ACCESS_TOKEN && state.WABA_PHONE_NUMBER_ID);
}
export function telegramConfigured(): boolean {
  return !!state.TELEGRAM_BOT_TOKEN;
}
export function calendlyConfigured(): boolean {
  return !!(state.CALENDLY_ACCESS_TOKEN && state.CALENDLY_EVENT_TYPE_URI);
}
