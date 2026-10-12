export type DealType = "baru" | "upsell" | "renewal";

export interface PipelineActivity {
  text: string;
  time: string;
}

export interface PipelineDeal {
  id: string;
  company: string;
  contactName: string;
  product: string;
  value: number;
  stage: string;
  type: DealType;
  pic: string;
  recurring: boolean;
  interval: string | null;
  endDate: string | null;
  date: string;
  notes: string;
  activity: PipelineActivity[];
  /** ID baris di Google Sheet Kontak / Leads (null/undefined = deal manual). */
  leadId?: number | null;
  /** Nomor baris di Google Sheet saat deal diimpor (untuk tulis balik stage). */
  sheetRow?: number | null;
}

export interface PipelineStage {
  id: string;
  label: string;
}

/** Field yang diisi lewat form "Tambah Deal" — id & activity di-generate backend. */
export type NewPipelineDeal = Omit<PipelineDeal, "id" | "activity" | "leadId">;

/** Deal hasil konversi lead — dikirim ke /api/pipeline/import-leads. */
export interface LeadDealInput extends NewPipelineDeal {
  leadId: number;
  sheetRow?: number;
  /** Nama/ID stage dari kolom "Pipeline Stage" di sheet (opsional). */
  stageHint?: string;
  /** Lead berstatus Closed → masuk stage Won. */
  closed?: boolean;
}

export interface ImportLeadsOptions {
  /** Buat stage baru otomatis dari nilai kolom yang belum ada di board. */
  createMissingStages: boolean;
  /** Pindahkan deal yang sudah ada ke stage sesuai nilai kolom di Sheet. */
  updateExisting: boolean;
}

export interface ImportLeadsResult {
  created: number;
  updated: number;
  skipped: number;
  stagesAdded: string[];
}

export interface PipelineInsightItem {
  type?: string;
  title?: string;
  text?: string;
  dealId?: string;
}

export interface PipelineInsights {
  summary: string;
  insights: PipelineInsightItem[];
  forecast: {
    likely_close_value: number;
    at_risk_value: number;
  };
}
