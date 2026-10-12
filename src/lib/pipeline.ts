import type { DealType, PipelineDeal, PipelineStage } from "@/types/pipeline";

export const PIC_OPTIONS = [
  { value: "BW", label: "Budi W." },
  { value: "RS", label: "Rina S." },
  { value: "DK", label: "Dika K." },
];

export const TYPE_OPTIONS: Array<{ value: DealType; label: string }> = [
  { value: "baru", label: "Baru" },
  { value: "upsell", label: "Upsell" },
  { value: "renewal", label: "Renewal" },
];

export const TYPE_BADGE_CLASS: Record<DealType, string> = {
  baru: "bg-blue-50 text-blue-700",
  upsell: "bg-violet-50 text-violet-700",
  renewal: "bg-amber-50 text-amber-700",
};

export function picLabel(value: string): string {
  return PIC_OPTIONS.find((p) => p.value === value)?.label || value || "-";
}

export function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} jt`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export interface PipelineFilters {
  search: string;
  pic: string;
  type: string;
}

export function filterDeals(deals: PipelineDeal[], filters: PipelineFilters): PipelineDeal[] {
  const q = filters.search.trim().toLowerCase();

  return deals.filter((d) => {
    const matchesSearch =
      q === "" ||
      d.company.toLowerCase().includes(q) ||
      d.contactName.toLowerCase().includes(q) ||
      d.product.toLowerCase().includes(q);
    const matchesPic = !filters.pic || d.pic === filters.pic;
    const matchesType = !filters.type || d.type === filters.type;
    return matchesSearch && matchesPic && matchesType;
  });
}

export interface StageColumn {
  stage: PipelineStage;
  deals: PipelineDeal[];
  totalValue: number;
}

export function groupByStage(deals: PipelineDeal[], stages: PipelineStage[]): StageColumn[] {
  return stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    return {
      stage,
      deals: stageDeals,
      totalValue: stageDeals.reduce((sum, d) => sum + d.value, 0),
    };
  });
}

export function isRenewalSoon(deal: PipelineDeal, withinDays = 30): boolean {
  if (!deal.recurring || !deal.endDate) return false;
  const diffDays = (new Date(deal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export function countRenewalSoon(deals: PipelineDeal[], withinDays = 30): number {
  return deals.filter((d) => isRenewalSoon(d, withinDays)).length;
}

export function totalPipelineValue(deals: PipelineDeal[]): number {
  return deals.reduce((sum, d) => sum + d.value, 0);
}

export function lastActivityLabel(deal: PipelineDeal): string {
  const latest = deal.activity[0];
  if (!latest) return "Belum ada aktivitas";
  return latest.text;
}
