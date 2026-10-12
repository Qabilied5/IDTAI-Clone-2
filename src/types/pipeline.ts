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
}

export interface PipelineStage {
  id: string;
  label: string;
}

/** Field yang diisi lewat form "Tambah Deal" — id & activity di-generate backend. */
export type NewPipelineDeal = Omit<PipelineDeal, "id" | "activity">;

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
