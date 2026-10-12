/* Penghubung Pipeline ⇄ Google Sheet "Kontak / Leads".
   Memakai URL Apps Script yang sama dengan halaman Kontak / Leads (localStorage `lp_sheet_api_url`),
   lewat proxy /api/leads — jadi tidak ada konfigurasi URL tambahan. */
import { getSheetUrl, normalizeLead, parseLeadDate } from "@/lib/leads";
import type { Lead } from "@/types/lead";
import type { LeadDealInput } from "@/types/pipeline";

export class SheetNotConnectedError extends Error {
  constructor() {
    super("Google Sheet belum terhubung. Hubungkan dulu di halaman Kontak / Leads.");
    this.name = "SheetNotConnectedError";
  }
}

/** Apps Script belum diperbarui (belum punya action `raw`). */
export class RawNotSupportedError extends Error {
  constructor() {
    super("Apps Script belum mendukung pembacaan kolom mentah. Tambahkan apps-script/PipelineRaw.gs lalu deploy ulang.");
    this.name = "RawNotSupportedError";
  }
}

/* ── Data ─────────────────────────────────────────────────────── */

/** Ambil semua lead dari Google Sheet yang sedang terhubung. */
export async function fetchLeadsFromSheet(): Promise<Lead[]> {
  const url = getSheetUrl();
  if (!url) throw new SheetNotConnectedError();
  const res = await fetch(`/api/leads?sheetUrl=${encodeURIComponent(url)}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `Gagal memuat spreadsheet (${res.status})`);
  return (data.leads as Lead[]).map(normalizeLead);
}

export interface RawSheet {
  headers: string[];
  /** `row` = nomor baris di Google Sheet (header = baris 1). */
  rows: { row: number; cells: string[] }[];
}

/** Header + isi mentah semua kolom, supaya kolom mana pun bisa dipakai sebagai Pipeline Stage. */
export async function fetchRawSheet(): Promise<RawSheet> {
  const url = getSheetUrl();
  if (!url) throw new SheetNotConnectedError();
  const res = await fetch(`/api/leads?sheetUrl=${encodeURIComponent(url)}&action=raw`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Gagal memuat kolom (${res.status})`);
  if (!Array.isArray(data.headers) || !Array.isArray(data.rows)) throw new RawNotSupportedError();
  return {
    headers: data.headers.map((h: unknown) => String(h ?? "")),
    rows: data.rows.map((r: { row: number; cells: unknown[] }) => ({ row: Number(r.row), cells: r.cells.map((c) => String(c ?? "")) })),
  };
}

/* ── Pilihan kolom Pipeline Stage (disimpan di browser) ───────── */

export interface StageColumnConfig {
  /** Posisi kolom (0 = A). */
  index: number;
  /** Teks header — dipakai untuk menemukan kolom lagi bila urutan kolom berubah. */
  header: string;
  /** Posisi kolom nama kontak, untuk verifikasi baris saat tulis balik. */
  keyIndex: number;
}

const STAGE_COL_KEY = "pl_stage_column";

export function getStageColumn(): StageColumnConfig | null {
  try {
    const raw = window.localStorage.getItem(STAGE_COL_KEY);
    return raw ? (JSON.parse(raw) as StageColumnConfig) : null;
  } catch {
    return null;
  }
}
export function saveStageColumn(cfg: StageColumnConfig | null) {
  try {
    if (cfg) window.localStorage.setItem(STAGE_COL_KEY, JSON.stringify(cfg));
    else window.localStorage.removeItem(STAGE_COL_KEY);
  } catch {
    /* abaikan */
  }
}

const norm = (s: string) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

/** 0 → A, 11 → L, 26 → AA */
export function colLetter(i: number): string {
  let n = i;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

const NAMA_ALIASES = ["nama kontak / pic", "nama kontak/pic", "nama kontak", "pic", "nama"];
const PERUSAHAAN_ALIASES = ["nama perusahaan", "perusahaan"];

function findHeader(headers: string[], aliases: string[]): number {
  const h = headers.map(norm);
  for (const a of aliases) {
    const i = h.indexOf(a);
    if (i !== -1) return i;
  }
  return -1;
}

/** Kolom yang dipakai untuk mencocokkan lead ↔ baris Sheet. */
export function findKeyColumns(headers: string[]) {
  return { nama: findHeader(headers, NAMA_ALIASES), perusahaan: findHeader(headers, PERUSAHAAN_ALIASES) };
}

/** Tebakan awal kolom stage: header "Pipeline Stage" / mengandung "stage" atau "tahap". */
export function guessStageColumn(headers: string[]): number {
  const h = headers.map(norm);
  const exact = h.indexOf("pipeline stage");
  if (exact !== -1) return exact;
  return h.findIndex((x) => x.includes("stage") || x.includes("tahap"));
}

/** Cari kolom tersimpan di header sekarang: cocokkan teks header dulu, baru posisi. */
export function resolveStageColumn(headers: string[], cfg: StageColumnConfig | null): number {
  if (!cfg) return -1;
  if (headers[cfg.index] === cfg.header) return cfg.index;
  const byName = headers.findIndex((h) => h === cfg.header);
  if (byName !== -1) return byName;
  return cfg.index < headers.length ? cfg.index : -1;
}

/* ── Lead ↔ baris Sheet ───────────────────────────────────────── */

export interface SheetStageInfo {
  stage: string;
  row: number;
}

/** Cocokkan tiap lead dengan barisnya lalu baca kolom stage.
 *  Apps Script memberi id = (nomor baris Sheet − 1), jadi baris lead = id + 1.
 *  Nama kontak di baris itu diperiksa dulu; bila tidak cocok (baris bergeser) lead dilewati. */
export function stageInfoByLead(leads: Lead[], raw: RawSheet, stageCol: number): Map<number, SheetStageInfo> {
  const out = new Map<number, SheetStageInfo>();
  if (stageCol < 0) return out;
  const { nama } = findKeyColumns(raw.headers);
  const byRow = new Map(raw.rows.map((r) => [r.row, r]));

  for (const l of leads) {
    const r = byRow.get(l.id + 1);
    if (!r) continue;
    if (nama !== -1 && norm(r.cells[nama] ?? "") !== norm(l.nama)) continue;
    out.set(l.id, { stage: (r.cells[stageCol] ?? "").trim(), row: r.row });
  }
  return out;
}

/** Nilai unik kolom + jumlahnya, urut kemunculan pertama. */
export function distinctColumnValues(raw: RawSheet, col: number): Array<[string, number]> {
  const counts = new Map<string, number>();
  if (col >= 0) {
    for (const r of raw.rows) {
      const v = (r.cells[col] ?? "").trim();
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return [...counts.entries()];
}

/* ── Lead → Deal ──────────────────────────────────────────────── */

function isoDate(tanggal: string): string {
  const d = parseLeadDate(tanggal) ?? new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `info` (dari kolom yang dipilih) menggantikan nilai "Pipeline Stage" bawaan lead. */
export function leadToDealInput(l: Lead, info?: SheetStageInfo): LeadDealInput {
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
    sheetRow: info?.row,
    company: (l.perusahaan || l.nama || "").trim(),
    contactName: l.nama || "",
    product: l.tipeLayanan || "",
    value: Number(l.estimasiNominal) || 0,
    stage: "", // diputuskan server dari stageHint / closed
    stageHint: info ? info.stage : l.pipelineStage || "",
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

/* ── Tulis balik ke Sheet ─────────────────────────────────────── */

interface SyncArgs {
  leadId: number;
  stageLabel: string;
  isWon: boolean;
  sheetRow?: number | null;
  /** Nama kontak deal — dipakai Apps Script untuk memastikan baris belum bergeser. */
  expectValue?: string;
}

/** Tulis stage ke kolom pilihan (atau "Pipeline Stage" bila belum dipilih). Won → status lead "Closed". */
export async function syncLeadStageToSheet(a: SyncArgs): Promise<void> {
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

  const cfg = getStageColumn();
  if (cfg && a.sheetRow) {
    await post({
      action: "setCell",
      row: a.sheetRow,
      col: cfg.index,
      value: a.stageLabel,
      expect: cfg.keyIndex >= 0 && a.expectValue ? { col: cfg.keyIndex, value: a.expectValue } : undefined,
    });
  } else {
    await post({ action: "updateLead", id: a.leadId, fields: { pipelineStage: a.stageLabel } });
  }
  if (a.isWon) await post({ action: "updateStatus", id: a.leadId, status: "closed" });
}
