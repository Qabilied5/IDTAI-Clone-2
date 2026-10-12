/* Penghubung Pipeline ⇄ Google Sheet "Kontak / Leads".
   Memakai URL Apps Script yang sama dengan halaman Kontak / Leads (localStorage `lp_sheet_api_url`),
   lewat proxy /api/leads — jadi tidak ada konfigurasi tambahan. */
import { getSheetUrl, normalizeLead, parseLeadDate } from "@/lib/leads";
import type { Lead } from "@/types/lead";
import type { LeadDealInput } from "@/types/pipeline";

export class SheetNotConnectedError extends Error {
  constructor() {
    super("Google Sheet belum terhubung. Hubungkan dulu di halaman Kontak / Leads.");
    this.name = "SheetNotConnectedError";
  }
}

/** Ambil semua lead dari Google Sheet yang sedang terhubung. */
export async function fetchLeadsFromSheet(): Promise<Lead[]> {
  const url = getSheetUrl();
  if (!url) throw new SheetNotConnectedError();
  const res = await fetch(`/api/leads?sheetUrl=${encodeURIComponent(url)}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `Gagal memuat spreadsheet (${res.status})`);
  return (data.leads as Lead[]).map(normalizeLead);
}

function isoDate(tanggal: string): string {
  const d = parseLeadDate(tanggal) ?? new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Lead → payload deal. Kolom Sheet: Perusahaan, Nama, Tipe Layanan, Estimasi, Pipeline Stage, dst. */
export function leadToDealInput(l: Lead): LeadDealInput {
  const notes = [
    l.phone && `Telepon: ${l.phone}`,
    l.email && `Email: ${l.email}`,
    l.kota && `Kota: ${l.kota}`,
    l.aksiSelanjutnya && `Aksi selanjutnya: ${l.aksiSelanjutnya}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    leadId: l.id,
    company: (l.perusahaan || l.nama || "").trim(),
    contactName: l.nama || "",
    product: l.tipeLayanan || "",
    value: Number(l.estimasiNominal) || 0,
    stage: "", // diputuskan server dari stageHint / closed
    stageHint: l.pipelineStage || "",
    closed: l.status === "closed",
    type: "baru",
    pic: "",
    recurring: false,
    interval: null,
    endDate: null,
    date: isoDate(l.tanggal),
    notes,
  };
}

/** Tulis balik stage deal ke Sheet. Won → status lead "Closed". Hanya jalan bila Sheet terhubung. */
export async function syncLeadStageToSheet(leadId: number, stageLabel: string, isWon: boolean): Promise<void> {
  const sheetUrl = getSheetUrl();
  if (!sheetUrl) throw new SheetNotConnectedError();

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl, payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Gagal sync ke Google Sheet");
  };

  await post({ action: "updateLead", id: leadId, fields: { pipelineStage: stageLabel } });
  if (isWon) await post({ action: "updateStatus", id: leadId, status: "closed" });
}
