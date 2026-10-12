import type {
  AdvancedFilters, AiScore, AiUrgency, Lead, LeadFilters, LeadKategori,
  LeadNlFilter, LeadSumber, LeadStatus, LeadDataSource,
} from '@/types/lead';

/* ── Penyimpanan URL spreadsheet (localStorage) ───────────────── */
export const LEAD_STORAGE_KEY = 'lp_sheet_api_url';

export function getSheetUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(LEAD_STORAGE_KEY); } catch { return null; }
}
export function saveSheetUrl(url: string) {
  try { window.localStorage.setItem(LEAD_STORAGE_KEY, url); } catch { /* ignore */ }
}
export function clearSheetUrl() {
  try { window.localStorage.removeItem(LEAD_STORAGE_KEY); } catch { /* ignore */ }
}

/* ── Label & ikon ─────────────────────────────────────────────── */
export const KATEGORI_LABEL: Record<LeadKategori, string> = {
  real: 'Real Lead', potensi: 'Potensi', belum: 'Belum Dikualifikasi',
};
export const KATEGORI_ICON: Record<LeadKategori, string> = {
  real: 'ti-circle-check', potensi: 'ti-star', belum: 'ti-minus-circle',
};
export const STATUS_LABEL: Record<LeadStatus, string> = {
  belum: 'Belum dihubungi', dihubungi: 'Sudah dihubungi', followup: 'Follow-up',
  closed: 'Closed / Deal', nomor_tidak_ditemukan: 'Nomor Tidak ditemukan',
};
export const STATUS_CLASS: Record<LeadStatus, string> = {
  belum: '', dihubungi: 'dihubungi', followup: 'followup', closed: 'closed', nomor_tidak_ditemukan: 'not-found',
};
export const STATUS_ICON: Record<LeadStatus, string> = {
  belum: 'ti-circle', dihubungi: 'ti-circle-check', followup: 'ti-refresh',
  closed: 'ti-check-circle-2', nomor_tidak_ditemukan: 'ti-phone-off',
};
export const SUMBER_INFO: Record<LeadSumber, { name: string; tag: string; icon: string }> = {
  wa: { name: 'Kontak Langsung', tag: 'src-wa', icon: 'ti-message-circle' },
  msg: { name: 'Kirim Pesan', tag: 'src-msg', icon: 'ti-message-2' },
  profil: { name: 'Kunjungan Profil/Website', tag: 'src-profil', icon: 'ti-eye' },
};

/* ── Util ─────────────────────────────────────────────────────── */
export function initials(nama: string) {
  return nama.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/** Nomor lead → format internasional WhatsApp tanpa "+" (mis. 6281234567890). */
export function toWaNumber(phone: string) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  return '62' + d;
}

export function formatRupiah(v: number | string | undefined) {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
  agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

/** Parse "12 Jun 2026" (atau format Date standar). Null kalau tidak terbaca. */
export function parseLeadDate(s: string): Date | null {
  const m = String(s || '').trim().match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon !== undefined) return new Date(Number(m[3]), mon, Number(m[1]));
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Defensive: data dari Sheets bisa kekurangan field. */
export function normalizeLead(raw: Partial<Lead> & { id: number | string }): Lead {
  const s = (v: unknown) => (v == null ? '' : String(v));
  const kategori: LeadKategori = raw.kategori && raw.kategori in KATEGORI_LABEL ? raw.kategori : 'belum';
  const sumber: LeadSumber = raw.sumber && raw.sumber in SUMBER_INFO ? raw.sumber : 'wa';
  const status: LeadStatus = raw.status && raw.status in STATUS_LABEL ? raw.status : 'belum';
  return {
    ...raw,
    id: Number(raw.id),
    nama: s(raw.nama), perusahaan: s(raw.perusahaan), tanggal: s(raw.tanggal),
    email: s(raw.email), phone: s(raw.phone), kota: s(raw.kota),
    kategori, sumber, status,
    aktivitas: s(raw.aktivitas) || SUMBER_INFO[sumber].name,
  };
}

/* ── Data contoh (dipakai bila belum ada spreadsheet terhubung) ── */
type FB = [number, string, string, string, string, string, string, LeadKategori, LeadSumber, LeadStatus];
const FALLBACK_ROWS: FB[] = [
  [1, 'Meli', 'Gudang Tenda Muhamad Almer', '12 Jun 2026', 'gudangtendamuhamadalmer12@gmail.com', '82381272032', 'Jakarta', 'real', 'wa', 'belum'],
  [2, 'Dina', 'PT. Cika Inti Karya', '11 Jun 2026', 'dinadina@gmail.com', '87797508972', 'Jakarta', 'real', 'wa', 'belum'],
  [3, 'Adi Santoso', 'CV. Maju Bersama', '11 Jun 2026', 'adi.santoso@majubersama.id', '81234567890', 'Surabaya', 'potensi', 'msg', 'dihubungi'],
  [4, 'Rini Wijaya', 'PT. Sumber Makmur', '10 Jun 2026', 'rini@sumbermakmur.co.id', '85678901234', 'Bandung', 'real', 'wa', 'followup'],
  [5, 'Budi Hartono', 'UD. Karya Abadi', '10 Jun 2026', 'budi.hartono@gmail.com', '81398765432', 'Semarang', 'potensi', 'profil', 'belum'],
  [6, 'Susi Rahayu', 'PT. Indo Jaya', '09 Jun 2026', 'susi.rahayu@indojaya.com', '87712345678', 'Medan', 'belum', 'profil', 'belum'],
  [7, 'Hendra Kusuma', 'CV. Teknik Mandiri', '09 Jun 2026', 'hendra@teknikmandiri.id', '82298765001', 'Jakarta', 'real', 'wa', 'closed'],
  [8, 'Dewi Anggraeni', 'PT. Aneka Produk', '08 Jun 2026', 'dewi.a@anekaproduk.com', '89512345000', 'Yogyakarta', 'potensi', 'msg', 'dihubungi'],
  [9, 'Fajar Nugraha', 'UD. Fajar Tani', '08 Jun 2026', 'fajar@fajartani.id', '81111222333', 'Malang', 'belum', 'wa', 'belum'],
  [10, 'Lestari Wahyu', 'CV. Lestari Group', '07 Jun 2026', 'lestari.w@lestarigroup.com', '82233445566', 'Surabaya', 'real', 'wa', 'followup'],
  [11, 'Teguh Prabowo', 'PT. Prabowo Industri', '07 Jun 2026', 'teguh@prabowoindustri.co.id', '85544332211', 'Jakarta', 'real', 'msg', 'belum'],
  [12, 'Nita Sari', 'CV. Nita Kreatif', '06 Jun 2026', 'nita@nitakreatif.id', '87700998877', 'Bandung', 'potensi', 'profil', 'dihubungi'],
  [13, 'Arief Gunawan', 'PT. Gunawan Jaya', '06 Jun 2026', 'arief.g@gunawanjaya.id', '81234000111', 'Semarang', 'belum', 'wa', 'belum'],
  [14, 'Maya Putri', 'UD. Maya Sejahtera', '05 Jun 2026', 'maya.p@gmail.com', '82345123456', 'Medan', 'real', 'wa', 'closed'],
  [15, 'Rizky Firmansyah', 'CV. Rizky Maju', '05 Jun 2026', 'rizky.f@rizkymaju.id', '89912345678', 'Jakarta', 'potensi', 'msg', 'belum'],
];
export const FALLBACK_LEADS: Lead[] = FALLBACK_ROWS.map(
  ([id, nama, perusahaan, tanggal, email, phone, kota, kategori, sumber, status]) => ({
    id, nama, perusahaan, tanggal, email, phone, kota, kategori, sumber, status,
    aktivitas: SUMBER_INFO[sumber].name,
  }),
);

/* ── Import CSV ───────────────────────────────────────────────── */
const KATEGORI_MAP: Record<string, LeadKategori> = {
  'Real Lead': 'real', Potensi: 'potensi', 'Belum Dikualifikasi': 'belum',
};
const SUMBER_MAP: Record<string, LeadSumber> = {
  'Kontak Langsung': 'wa', 'Kirim Pesan': 'msg', 'Kunjungan Profil/Website': 'profil',
};
const STATUS_MAP: Record<string, LeadStatus> = {
  'Belum Dihubungi': 'belum', 'Sudah Dihubungi': 'dihubungi', 'Follow-up': 'followup',
  'Closed / Deal': 'closed', 'Nomor Tidak ditemukan': 'nomor_tidak_ditemukan',
};

// Harus sama dengan COLUMN_MAP di Code.gs (Apps Script).
const COLUMN_MAP: Record<string, string[]> = {
  tanggal: ['Tanggal Masuk Lead', 'Tanggal'],
  perusahaan: ['Nama Perusahaan', 'Perusahaan'],
  nama: ['Nama Kontak / PIC', 'Nama Kontak/PIC', 'Nama Kontak', 'PIC', 'Nama'],
  jabatan: ['Jabatan'],
  phone: ['Nomor HP', 'No. HP', 'No HP', 'Phone'],
  sumber: ['Sumber Lead', 'Sumber'],
  status: ['Status'],
  jumlahFollowup: ['Jumlah Follow-up', 'Jumlah Follow Up', 'Jumlah Followup'],
  aksiSelanjutnya: ['Aksi Selanjutnya'],
  pipelineStage: ['Pipeline Stage'],
  kategori: ['Status Lead', 'Kategori Lead', 'Kategori'],
  estimasi: ['Estimasi Nominal (Opsional)', 'Estimasi Nominal', 'Nominal'],
  tipeLayanan: ['Tipe Layanan', 'Jenis Layanan', 'Layanan / Produk', 'Produk', 'Layanan'],
  email: ['Email'],
  kota: ['Kota'],
  aktivitas: ['Aktivitas'],
};

const normHeader = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Parser CSV ringan (mendukung tanda kutip & koma di dalam field). */
export function parseCsvText(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => String(f).trim() !== ''));
}

export function leadsFromCsvRows(rows: string[][]): Lead[] {
  if (rows.length < 1) return [];
  const header = rows[0].map(normHeader);
  const colIndex: Record<string, number> = {};
  for (const field of Object.keys(COLUMN_MAP)) {
    colIndex[field] = -1;
    for (const alias of COLUMN_MAP[field]) {
      const idx = header.indexOf(normHeader(alias));
      if (idx !== -1) { colIndex[field] = idx; break; }
    }
  }
  const cell = (r: string[], f: string) => (colIndex[f] === -1 ? '' : String(r[colIndex[f]] ?? '').trim());

  const out: Lead[] = [];
  rows.slice(1).forEach((r, i) => {
    const nama = cell(r, 'nama');
    if (!nama) return;
    const sumberLabel = cell(r, 'sumber');
    out.push({
      id: i + 1,
      nama,
      perusahaan: cell(r, 'perusahaan'),
      tanggal: cell(r, 'tanggal'),
      email: cell(r, 'email'),
      phone: cell(r, 'phone').replace(/^0/, '').replace(/\D/g, ''),
      kota: cell(r, 'kota'),
      kategori: KATEGORI_MAP[cell(r, 'kategori')] || 'belum',
      sumber: SUMBER_MAP[sumberLabel] || 'wa',
      aktivitas: cell(r, 'aktivitas') || sumberLabel,
      status: STATUS_MAP[cell(r, 'status')] || 'belum',
      jabatan: cell(r, 'jabatan'),
      jumlahFollowup: cell(r, 'jumlahFollowup') || 0,
      aksiSelanjutnya: cell(r, 'aksiSelanjutnya'),
      pipelineStage: cell(r, 'pipelineStage'),
      estimasiNominal: cell(r, 'estimasi'),
      tipeLayanan: cell(r, 'tipeLayanan'),
    });
  });
  return out;
}

/* ── AI Score & Urgency ───────────────────────────────────────── */
// Data contoh punya skor hand-made agar demo tetap sama seperti original.
const DEMO_SCORES: Record<number, [AiScore['score'], string]> = {
  1: ['HOT', 'Kontak langsung 1 jam lalu — respons terbaik sekarang'],
  2: ['HOT', 'Real Lead, Jakarta, buka profil 3x hari ini'],
  3: ['WARM', 'Sudah dihubungi, tapi belum reply 2 hari'],
  4: ['HOT', 'Permintaan dikirim — intent sangat tinggi'],
  5: ['WARM', 'Kunjungi profil 2x, belum menghubungi'],
  6: ['COLD', 'Hanya lihat profil, tidak ada aksi lanjut'],
  7: ['HOT', 'Kontak masuk 30 menit lalu — sudah dihubungi ✓'],
  8: ['WARM', 'Pesan terkirim, masih menunggu balasan'],
  9: ['COLD', 'Permintaan lama, belum ada aktivitas 5+ hari'],
  10: ['WARM', 'Repeat kontak, follow-up sedang berjalan'],
  11: ['HOT', 'Pesan baru hari ini, belum dibalas'],
  12: ['WARM', 'Kunjungi profil, Bandung, potensi konversi'],
  13: ['COLD', 'Kontak masuk tapi tidak ada tindak lanjut'],
  14: ['HOT', 'Permintaan closed — kandidat repeat kontak'],
  15: ['WARM', 'Pesan terkirim, belum ada respons 1 hari'],
};
const DEMO_URGENCY: Record<number, [AiUrgency['cls'], string]> = {
  1: ['hot-time', '1 jam lalu — waktu terbaik!'], 2: ['hot-time', '2 jam lalu — segera hubungi'],
  3: ['warn-time', '2 hari belum dibalas'], 4: ['hot-time', 'Permintaan baru — follow-up sekarang'],
  5: ['warn-time', '3 hari belum dihubungi'], 6: ['neutral-time', '5 hari tidak ada aktivitas'],
  7: ['ok-time', 'Sudah dihubungi ✓'], 8: ['warn-time', 'Menunggu balas 1 hari'],
  9: ['neutral-time', 'Tidak aktif 6 hari'], 10: ['ok-time', 'Follow-up sedang berjalan'],
  11: ['hot-time', 'Pesan baru — belum dibalas!'], 12: ['warn-time', '2 hari sejak kunjungan'],
  13: ['neutral-time', '4 hari tidak ada kontak'], 14: ['ok-time', 'Closed ✓'],
  15: ['warn-time', '1 hari belum ada respons'],
};

/**
 * Skor AI. Original memakai tabel statis per-ID; untuk data live (Sheets/CSV)
 * dipakai aturan sederhana dari kategori + sumber + status. Ganti isi fungsi
 * ini dengan panggilan model scoring backend bila sudah ada.
 */
export function getAiScore(lead: Lead, source: LeadDataSource): AiScore {
  const demo = source === 'fallback' ? DEMO_SCORES[lead.id] : undefined;
  if (demo) return { score: demo[0], reason: demo[1] };

  if (lead.status === 'closed') return { score: 'HOT', reason: 'Sudah closed — kandidat repeat order' };
  if (lead.status === 'nomor_tidak_ditemukan') return { score: 'COLD', reason: 'Nomor tidak ditemukan — verifikasi kontak' };

  const unhandled = lead.status === 'belum';
  const direct = lead.sumber !== 'profil';
  if (lead.kategori === 'real' && direct && unhandled) return { score: 'HOT', reason: 'Real Lead kontak langsung, belum dihubungi' };
  if (lead.kategori === 'real') return { score: 'WARM', reason: unhandled ? 'Real Lead, baru mengunjungi profil' : 'Real Lead, follow-up sedang berjalan' };
  if (lead.kategori === 'potensi') return { score: 'WARM', reason: direct ? 'Potensi, sudah ada interaksi langsung' : 'Potensi, baru mengunjungi profil' };
  return { score: 'COLD', reason: 'Belum dikualifikasi, sinyal niat masih rendah' };
}

export function getAiUrgency(lead: Lead, source: LeadDataSource): AiUrgency {
  const demo = source === 'fallback' ? DEMO_URGENCY[lead.id] : undefined;
  if (demo) return { cls: demo[0], text: demo[1] };

  switch (lead.status) {
    case 'closed': return { cls: 'ok-time', text: 'Closed ✓' };
    case 'dihubungi': return { cls: 'ok-time', text: 'Sudah dihubungi ✓' };
    case 'followup': return { cls: 'ok-time', text: 'Follow-up sedang berjalan' };
    case 'nomor_tidak_ditemukan': return { cls: 'neutral-time', text: 'Nomor tidak ditemukan' };
    default:
      return lead.sumber === 'profil'
        ? { cls: 'warn-time', text: 'Belum dihubungi — prioritas rendah' }
        : { cls: 'hot-time', text: 'Belum dihubungi — segera follow-up' };
  }
}

export const SCORE_RANK = { HOT: 0, WARM: 1, COLD: 2 } as const;
export const SCORE_ICON = { HOT: '🔥', WARM: '🌤', COLD: '🧊' } as const;

/** Fallback bila endpoint /api/followup/generate (Ollama) gagal. */
export function generateFallbackMessage(lead: Lead) {
  const t: Record<LeadSumber, string> = {
    wa: `Halo ${lead.nama}! 👋\n\nKami lihat Anda tadi menghubungi kami — apakah ada yang bisa kami bantu atau informasi yang Anda butuhkan?\n\nKami siap membantu sesuai kebutuhan Anda. Boleh ceritakan apa yang sedang dicari? 🙏`,
    msg: `Halo ${lead.nama}! 😊\n\nTerima kasih sudah menghubungi kami. Kami ingin memastikan pesan Anda sudah kami terima dengan baik.\n\nAda yang bisa kami bantu lebih lanjut? Kami siap memberikan informasi atau penawaran terbaik untuk Anda!`,
    profil: `Halo ${lead.nama}! 👋\n\nKami perhatikan Anda baru saja mengunjungi halaman kami. Apakah ada hal yang menarik minat Anda atau informasi yang ingin Anda ketahui lebih lanjut?\n\nKami dengan senang hati siap membantu! 🙌`,
  };
  return t[lead.sumber];
}

/* ── Filter & sort ────────────────────────────────────────────── */
export const DEFAULT_ADVANCED: AdvancedFilters = {
  kategori: { real: true, potensi: true, belum: true },
  sumber: { wa: true, msg: true, profil: true },
  score: { HOT: true, WARM: true, COLD: true },
  sort: 'score',
};

function matchNl(lead: Lead, nl: LeadNlFilter, source: LeadDataSource) {
  switch (nl) {
    case 'belum-3-hari': return lead.status === 'belum';
    case 'real-belum-followup': return lead.kategori === 'real' && (lead.status === 'belum' || lead.status === 'dihubungi');
    case 'score-hot': return getAiScore(lead, source).score === 'HOT';
    case 'pesan-belum-dibalas': return lead.sumber === 'msg' && lead.status === 'belum';
  }
}

export function filterLeads(leads: Lead[], f: LeadFilters, source: LeadDataSource): Lead[] {
  const q = f.query.trim().toLowerCase();
  const now = new Date();
  const dayMs = 86400000;
  const maxAge = f.date === 'today' ? 1 : f.date === 'week' ? 7 : f.date === 'month' ? 30 : 0;

  const out = leads.filter((l) => {
    if (f.kat !== 'semua' && l.kategori !== f.kat) return false;
    if (!f.adv.kategori[l.kategori] || !f.adv.sumber[l.sumber]) return false;
    if (!f.adv.score[getAiScore(l, source).score]) return false;
    if (f.nl && !matchNl(l, f.nl, source)) return false;
    if (q) {
      const hay = [l.nama, l.perusahaan, l.email, l.phone, l.kota, l.tipeLayanan ?? ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (maxAge) {
      const d = parseLeadDate(l.tanggal);
      if (d) { // tanggal tak terbaca → jangan disembunyikan
        const age = (now.getTime() - d.getTime()) / dayMs;
        if (maxAge === 1 ? d.toDateString() !== now.toDateString() : age > maxAge) return false;
      }
    }
    return true;
  });

  const time = (l: Lead) => parseLeadDate(l.tanggal)?.getTime() ?? 0;
  return out.sort((a, b) => {
    switch (f.adv.sort) {
      case 'score': return SCORE_RANK[getAiScore(a, source).score] - SCORE_RANK[getAiScore(b, source).score];
      case 'newest': return time(b) - time(a);
      case 'belum': return Number(b.status === 'belum') - Number(a.status === 'belum');
      case 'nama': return a.nama.localeCompare(b.nama, 'id');
    }
  });
}