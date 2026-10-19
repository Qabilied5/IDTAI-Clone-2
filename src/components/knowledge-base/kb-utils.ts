import type { KbDoc } from "@/types/knowledge-base";

/** Kategori — urutan & label sama dengan sidebar referensi. */
export const CATEGORIES: { id: string; label: string }[] = [
  { id: "produk", label: "Produk & Layanan" },
  { id: "harga", label: "Harga & Promo" },
  { id: "faq", label: "FAQ Pelanggan" },
  { id: "sop", label: "SOP & Prosedur" },
  { id: "pengiriman", label: "Pengiriman" },
  { id: "umum", label: "Umum" },
];

export const catLabel = (id: string): string =>
  CATEGORIES.find((c) => c.id === id)?.label ?? "Umum";

export function fmtSize(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

export function fmtDate(ts: number, now = Date.now()): string {
  if (!ts) return "-";
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** "Cakupan AI" = proporsi kesiapan konten (proxy dari panjang teks yang berhasil diekstrak),
    BUKAN skor akurasi model sungguhan. Rumus sama dengan referensi. */
export function coveragePct(doc: Pick<KbDoc, "extractFailed" | "contentLength">): number {
  if (doc.extractFailed || !doc.contentLength) return 0;
  return Math.max(15, Math.min(98, Math.round(30 + doc.contentLength / 40)));
}

export type SortKey = "newest" | "oldest" | "alpha" | "coverage";

export function sortDocs(docs: KbDoc[], key: SortKey): KbDoc[] {
  const list = [...docs];
  switch (key) {
    case "oldest": return list.sort((a, b) => a.updatedAt - b.updatedAt);
    case "alpha": return list.sort((a, b) => a.title.localeCompare(b.title, "id"));
    case "coverage": return list.sort((a, b) => coveragePct(b) - coveragePct(a));
    default: return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
