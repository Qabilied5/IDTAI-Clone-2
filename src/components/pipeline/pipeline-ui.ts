/* Helper khusus tampilan Pipeline (warna stage, tanggal, renewal, avatar PIC).
   Sengaja terpisah dari src/lib/pipeline.ts supaya logika data Anda tidak tersentuh. */
import type { DealType, PipelineStage } from "@/types/pipeline";

/* ── Warna & ikon stage (stage dari backend tidak punya warna → diturunkan dari id) ── */
const STAGE_COLORS: Record<string, string> = {
  prospek: "#818cf8",
  kualifikasi: "#60a5fa",
  proposal: "#f59e0b",
  penawaran: "#f59e0b",
  negosiasi: "#f97316",
  closing: "#ef4444",
  won: "#16a34a",
};
const FALLBACK_COLORS = ["#2dd4bf", "#a855f7", "#fb7185", "#38bdf8", "#34d399", "#facc15", "#8b5cf6", "#64748b"];

export function stageColor(stage: PipelineStage): string {
  if (STAGE_COLORS[stage.id]) return STAGE_COLORS[stage.id];
  let h = 0;
  for (const ch of stage.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

export function colorToBg(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "rgba(129,140,248,0.12)";
  return `rgba(${r},${g},${b},0.12)`;
}

export const FLOW_ICON_DEFAULT =
  "M12 12c2.7 0 4-1.34 4-4s-1.3-4-4-4-4 1.34-4 4 1.3 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";
const PENAWARAN_ICON =
  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
export const FLOW_ICONS: Record<string, string> = {
  prospek: "M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z",
  kualifikasi: "M3 4h18v2.172a2 2 0 01-.586 1.414L14 14v5.764a1 1 0 01-.553.894l-4 2A1 1 0 018 21.764V14L3.586 7.586A2 2 0 013 6.172V4z",
  penawaran: PENAWARAN_ICON,
  proposal: PENAWARAN_ICON,
  negosiasi: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  closing: "M9 12l2 2 4-4M7 2h10a2 2 0 012 2v18l-7-3-7 3V4a2 2 0 012-2z",
  won: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

/** Stage "menang": id "won" kalau ada, kalau tidak stage paling kanan. */
export function wonStageId(stages: PipelineStage[]): string {
  if (stages.some((s) => s.id === "won")) return "won";
  return stages.length ? stages[stages.length - 1].id : "won";
}

/* ── Tipe & interval ── */
export const TYPE_NAMES: Record<DealType, string> = { baru: "Baru", upsell: "Upsell", renewal: "Renewal" };
export const TYPE_TAG_CLASS: Record<DealType, string> = {
  baru: "pl-tag-new",
  upsell: "pl-tag-upsell",
  renewal: "pl-tag-renewal",
};

export function intervalLabel(v?: string | null): string {
  if (!v) return "—";
  const map: Record<string, string> = {
    bulanan: "Bulanan", monthly: "Bulanan",
    kuartalan: "Kuartalan", quarterly: "Kuartalan",
    tahunan: "Tahunan", yearly: "Tahunan",
  };
  return map[v.toLowerCase()] ?? v;
}

/* ── PIC ── */
const PIC_COLORS = ["#818cf8", "#60a5fa", "#f97316", "#16a34a", "#a855f7", "#f59e0b", "#2dd4bf", "#fb7185"];

export function picAvatar(pic: string): { initials: string; color: string } {
  const clean = (pic || "").trim();
  if (!clean) return { initials: "?", color: "var(--gray-400)" };
  const words = clean.split(/\s+/);
  const initials =
    clean.length <= 3 && words.length === 1
      ? clean.toUpperCase()
      : words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  let h = 0;
  for (const ch of clean) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { initials: initials || "?", color: PIC_COLORS[h % PIC_COLORS.length] };
}

/* ── Tanggal ── */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatActivityTime(time: string): string {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return time;
  if (Date.now() - d.getTime() < 60_000 && Date.now() >= d.getTime()) return "Baru saja";
  const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const hm = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  return `${date}, ${hm}`;
}

/* ── Renewal ── */
export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 864e5);
}

export function renewalClass(days: number | null): "" | "urgent" | "warn" | "safe" {
  if (days === null) return "";
  if (days <= 14) return "urgent";
  if (days <= 45) return "warn";
  return "safe";
}

export function renewalWidth(days: number | null): number {
  if (days === null) return 0;
  if (days <= 0) return 100;
  if (days >= 365) return 10;
  return Math.max(10, Math.min(99, ((365 - days) / 365) * 100));
}
