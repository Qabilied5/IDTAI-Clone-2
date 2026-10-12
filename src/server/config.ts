/* =============================================================
   src/server/config.ts
   Konstanta & env untuk backend (port dari server.js bagian atas).
   Nilai runtime yang bisa berubah (token Telegram/WABA/Calendly, dsb)
   TIDAK di sini — ada di state.ts supaya bisa diubah dari halaman Integrasi.
   ============================================================= */
import path from 'path';

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
// Model terpisah untuk pipeline insight (opsional).
export const PIPELINE_OLLAMA_MODEL = process.env.PIPELINE_OLLAMA_MODEL || OLLAMA_MODEL;
export const KB_FILTER_MODEL = process.env.KB_FILTER_MODEL || OLLAMA_MODEL;
export const SEND_MODE = process.env.SEND_MODE || 'mock'; // mock | telegram | whatsapp

// Deskripsi singkat & FAKTUAL soal bisnis Indotrading — disisipkan ke SEMUA
// prompt Ollama. Tanpa ini, model bisa "mengarang" bidang usaha perusahaan.
export const COMPANY_DESC =
  process.env.COMPANY_DESC ||
  'Indotrading.com adalah marketplace B2B & B2G (business-to-business dan ' +
    'business-to-government) di Indonesia. Kami mempertemukan supplier dengan ' +
    'buyer perusahaan maupun instansi pemerintah lewat sistem RFQ (permintaan ' +
    'pembelian/tender online) dan E-Procurement, dan terdaftar resmi di Toko ' +
    'Daring LKPP. Kami TIDAK memproduksi atau menjual barang/mesin sendiri — ' +
    'kami adalah platform yang membantu perusahaan (supplier) menjangkau lebih ' +
    'banyak buyer, dan membantu buyer menemukan supplier yang tepat.';

// ── Direktori data (relatif ke root project Next.js) ──
export const DATA_DIR = path.join(process.cwd(), 'data');
export const KB_UPLOADS_DIR = path.join(DATA_DIR, 'kb-uploads');
export const KB_DATA_FILE = path.join(DATA_DIR, 'knowledge-base.json');
export const AGENTS_DATA_FILE = path.join(DATA_DIR, 'agents.json');
export const ESCALATION_SETTINGS_FILE = path.join(DATA_DIR, 'escalation-settings.json');
export const IDENTITY_DATA_FILE = path.join(DATA_DIR, 'agent-identity.json');
export const PIPELINE_DATA_FILE = path.join(DATA_DIR, 'pipeline.json');

// ── Knowledge Base ──
export const KB_MAX_CONTENT_CHARS = 300000;
export const KB_CRAWL_MAX_PAGES_LIMIT = 50;
export const KB_CRAWL_MAX_DEPTH_LIMIT = 5;
export const KB_CRAWL_TIME_BUDGET_MS = 5 * 60 * 1000;
export const KB_CRAWL_JOB_TTL_MS = 10 * 60 * 1000;
export const KB_CONTEXT_MAX_CHARS = Number(process.env.KB_CONTEXT_MAX_CHARS || 9000);
export const KB_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const KB_UPLOAD_ALLOWED_EXT = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'csv'];

export const KB_FILTER_BATCH_MAX_LINES = 50;
export const KB_FILTER_BATCH_MAX_CHARS = 2000;
export const KB_FILTER_MIN_LINES = 4;
export const KB_FILTER_TIMEOUT_MS = 45000;
export const KB_OLLAMA_REACHABLE_TTL_MS = 20000;

// ── Appointment internal ──
export const APPT_WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Senin–Sabtu
export const APPT_TIME_SLOTS = [
  { start: '08.00', end: '09.30' },
  { start: '10.00', end: '11.30' },
  { start: '13.00', end: '14.30' },
  { start: '15.00', end: '16.30' },
];
export const APPT_DEFAULT_DURATION = 90;
export const APPT_DEFAULT_STAFF = process.env.APPT_DEFAULT_STAFF || 'Tim Sales (belum ditentukan)';
export const APPT_TYPE_LABELS: Record<string, string> = {
  demo: 'Demo Produk',
  konsultasi: 'Konsultasi',
  negosiasi: 'Negosiasi',
  onboarding: 'Onboarding',
  lainnya: 'Lainnya',
};

export const CALENDLY_API_BASE = 'https://api.calendly.com';
export const WABA_GRAPH_BASE = 'https://graph.facebook.com/v20.0';
