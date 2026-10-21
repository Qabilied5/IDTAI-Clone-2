/* Tipe untuk halaman Pengaturan Agent. Bentuk PicAgent / pengaturan eskalasi
   mengikuti respons /api/agents dan /api/escalation-settings. */

export type ToneId = "formal" | "santai" | "industri" | "custom";
export type DistMode = "round-robin" | "least-busy" | "manual" | "skill";
export type Timezone = "WIB" | "WITA" | "WIT";
export type SessionTimeout = "30 menit" | "1 jam" | "4 jam" | "8 jam";

export interface PicAgent {
  id: number;
  nama: string;
  email: string;
  role: string; // agent | admin | viewer (| super_admin)
  status: string; // online | offline | busy
  initials: string;
  chat: number;
}

export interface EscalationTriggers {
  sensitiveKeyword: boolean;
  repeatedQuestion: boolean;
  priceNegotiation: boolean;
  humanRequest: boolean;
  stalled: boolean;
}

/** Bagian pengaturan eskalasi yang diedit dari halaman ini (sisanya dibiarkan di server). */
export interface EscalationForm {
  keywords: string[];
  triggers: EscalationTriggers;
  priceLimitPercent: number;
  notifyCustomer: boolean;
  handoffMessage: string;
}

export interface JadwalRow {
  id: number;
  hari: string;
  mulai: string;
  selesai: string;
  aktif: boolean;
}

export interface Brand {
  id: number;
  name: string;
  cat: string;
  color: string;
  abbr: string;
  conv: number;
  agents: number;
  active: boolean;
  desc: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  tone: ToneId;
  greeting: string;
}

/** Seluruh nilai yang bisa diedit di halaman. Perubahan dibandingkan dengan snapshot tersimpan
    untuk menentukan "ada perubahan yang belum disimpan". */
export interface PaForm {
  // Persona
  agentName: string;
  roleTitle: string;
  tagline: string;
  /** Deskripsi bisnis yang dibaca AI (disimpan di dbo.AgentIdentity.CompanyDesc). */
  companyDesc: string;
  tone: ToneId;
  langId: boolean;
  langAuto: boolean;
  greetName: boolean;
  sop: string;
  // Takeover (disimpan ke server)
  escalation: EscalationForm;
  sendSummary: boolean;
  aiResumes: boolean;
  // Human agent
  distMode: DistMode;
  capEnabled: boolean;
  capNum: number;
  // Jadwal
  open24x7: boolean;
  jadwal: JadwalRow[];
  timezone: Timezone;
  holidayDisable: boolean;
  // Multi-brand
  brands: Brand[];
  isolateBrand: boolean;
  sharedKb: boolean;
  // Keamanan
  require2fa: boolean;
  singleDevice: boolean;
  autoLogout: boolean;
  sessionTimeout: SessionTimeout;
}

export const DEFAULT_ESCALATION: EscalationForm = {
  keywords: ["komplain", "refund", "rusak", "tidak terima", "salah kirim"],
  triggers: {
    sensitiveKeyword: true,
    repeatedQuestion: true,
    priceNegotiation: true,
    humanRequest: true,
    stalled: false,
  },
  priceLimitPercent: 10,
  notifyCustomer: true,
  handoffMessage: "Percakapan Anda akan diteruskan ke Agent, mohon menunggu beberapa saat",
};

export const DEFAULT_FORM: PaForm = {
  agentName: "",
  roleTitle: "Sales Assistant",
  tagline: "Siap membantu kebutuhan bisnis Anda 24/7",
  companyDesc: "",
  tone: "santai",
  langId: true,
  langAuto: false,
  greetName: true,
  sop: "",
  escalation: DEFAULT_ESCALATION,
  sendSummary: true,
  aiResumes: true,
  distMode: "round-robin",
  capEnabled: true,
  capNum: 10,
  open24x7: true,
  jadwal: [
    { id: 1, hari: "Senin – Jumat", mulai: "08:00", selesai: "17:00", aktif: true },
    { id: 2, hari: "Sabtu", mulai: "09:00", selesai: "14:00", aktif: true },
    { id: 3, hari: "Minggu", mulai: "00:00", selesai: "00:00", aktif: false },
  ],
  timezone: "WIB",
  holidayDisable: true,
  brands: [],
  isolateBrand: true,
  sharedKb: true,
  require2fa: true,
  singleDevice: false,
  autoLogout: true,
  sessionTimeout: "1 jam",
};

export const TONE_PREVIEW: Record<ToneId, (company: string) => string> = {
  formal: (c) =>
    `Selamat pagi. Terima kasih telah menghubungi ${c}. Dengan senang hati kami siap membantu kebutuhan Anda. Mohon dapat menyampaikan pertanyaan Anda.`,
  santai: (c) =>
    `Halo! Makasih udah hubungi ${c} 😊 Ada yang bisa kami bantu hari ini? Langsung aja ceritain kebutuhannya ya!`,
  industri: (c) =>
    `Selamat datang di ${c}. Kami siap membantu pencarian material, spare part, dan peralatan industri. Silakan informasikan spesifikasi kebutuhan Anda.`,
  custom: () =>
    "Halo Mitra! Selamat datang. Silakan sampaikan kebutuhan bisnis Anda dan tim kami akan segera merespons.",
};

/** Singkatan otomatis dari nama brand (sama dengan paBrandNameInput di referensi). */
export function autoAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2
    ? words.slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : name.trim().slice(0, 2).toUpperCase();
}

export function makeBrand(partial: Partial<Brand> & { name: string }, id: number): Brand {
  return {
    id,
    cat: "Platform Utama",
    color: "#c8102e",
    abbr: autoAbbr(partial.name),
    conv: 0,
    agents: 0,
    active: false,
    desc: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    tone: "santai",
    greeting: "",
    ...partial,
  };
}
