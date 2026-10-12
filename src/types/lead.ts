export type LeadKategori = 'real' | 'potensi' | 'belum';
export type LeadSumber = 'wa' | 'msg' | 'profil';
export type LeadStatus = 'belum' | 'dihubungi' | 'followup' | 'closed' | 'nomor_tidak_ditemukan';
export type AiScoreLevel = 'HOT' | 'WARM' | 'COLD';
export type LeadDataSource = 'sheet' | 'csv' | 'fallback';
export type LeadDateRange = 'semua' | 'today' | 'week' | 'month';
export type LeadNlFilter = 'belum-3-hari' | 'real-belum-followup' | 'score-hot' | 'pesan-belum-dibalas';
export type LeadSortKey = 'score' | 'newest' | 'belum' | 'nama';
export type ChatProvider = 'whatsapp' | 'telegram' | null;

export interface Lead {
  id: number;
  nama: string;
  perusahaan: string;
  tanggal: string;
  email: string;
  phone: string;
  kota: string;
  kategori: LeadKategori;
  sumber: LeadSumber;
  aktivitas: string;
  status: LeadStatus;
  jabatan?: string;
  jumlahFollowup?: number | string;
  aksiSelanjutnya?: string;
  pipelineStage?: string;
  estimasiNominal?: number | string;
  tipeLayanan?: string;
}

export type LeadEditableFields = Partial<Omit<Lead, 'id'>>;

export interface AiScore {
  score: AiScoreLevel;
  reason: string;
}

export interface AiUrgency {
  cls: 'hot-time' | 'warn-time' | 'ok-time' | 'neutral-time';
  text: string;
}

export interface AdvancedFilters {
  kategori: Record<LeadKategori, boolean>;
  sumber: Record<LeadSumber, boolean>;
  score: Record<AiScoreLevel, boolean>;
  sort: LeadSortKey;
}

export interface LeadFilters {
  kat: 'semua' | LeadKategori;
  query: string;
  date: LeadDateRange;
  nl: LeadNlFilter | null;
  adv: AdvancedFilters;
}