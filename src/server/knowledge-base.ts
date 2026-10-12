/* =============================================================
   src/server/knowledge-base.ts
   Knowledge Base — dokumen yang dipakai AI sebagai SATU-SATUNYA sumber
   jawaban. Ekstraksi file (pdf/docx/xlsx/txt/csv), strip HTML, filter
   noise via Ollama, crawl multi-halaman (BFS), dan konteks untuk prompt.
   ============================================================= */
import fs from 'fs';
import path from 'path';
import {
  KB_CONTEXT_MAX_CHARS, KB_CRAWL_JOB_TTL_MS, KB_CRAWL_MAX_DEPTH_LIMIT, KB_CRAWL_MAX_PAGES_LIMIT,
  KB_CRAWL_TIME_BUDGET_MS, KB_FILTER_BATCH_MAX_CHARS, KB_FILTER_BATCH_MAX_LINES, KB_FILTER_MIN_LINES,
  KB_FILTER_MODEL, KB_FILTER_TIMEOUT_MS, KB_MAX_CONTENT_CHARS, KB_UPLOADS_DIR, OLLAMA_BASE_URL,
} from './config';
import { xfetch } from './fetch';
import { ollamaGenerateJson, ollamaReachableCached } from './ollama';
import { state } from './state';
import { ensureDataLoaded, kbSave } from './store';
import type { CrawlJob, KbDoc } from './types';

// Modul parser opsional — di-require lazily supaya server tetap jalan
// walau belum terinstall (sama seperti server.js).
/* eslint-disable */
function warnMissing(name: string) {
  console.warn(`[KB] Modul "${name}" belum terinstall — jalankan: npm install ${name}`);
  return null;
}
// require() ditulis literal (bukan variabel) supaya webpack tidak mengeluh
// "critical dependency"; paket-paketnya tetap eksternal lewat
// serverComponentsExternalPackages di next.config.js.
function loadPdfParse(): any { try { return require('pdf-parse'); } catch { return warnMissing('pdf-parse'); } }
function loadMammoth(): any { try { return require('mammoth'); } catch { return warnMissing('mammoth'); } }
function loadXlsx(): any { try { return require('xlsx'); } catch { return warnMissing('xlsx'); } }

export function kbNextId(): number {
  ensureDataLoaded();
  return state.knowledgeBase.reduce((max, d) => Math.max(max, d.id), 0) + 1;
}

export function kbFind(id: string | number): KbDoc | undefined {
  ensureDataLoaded();
  return state.knowledgeBase.find((d) => d.id === Number(id));
}

export function kbTrimContent(text: string): string {
  const t = (text || '').replace(/\r\n/g, '\n').trim();
  return t.length > KB_MAX_CONTENT_CHARS
    ? t.slice(0, KB_MAX_CONTENT_CHARS) + '\n[...dipotong, dokumen terlalu panjang...]'
    : t;
}

export function kbPublicDoc(d: KbDoc) {
  return {
    id: d.id,
    title: d.title,
    category: d.category || 'umum',
    status: d.status || 'aktif',
    sourceType: d.sourceType,
    fileName: d.fileName || null,
    fileExt: d.fileExt || null,
    sizeBytes: d.sizeBytes || Buffer.byteLength(d.content || '', 'utf8'),
    url: d.url || null,
    autoSync: !!d.autoSync,
    crawlBatchId: d.crawlBatchId || null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    contentLength: (d.content || '').length,
    contentPreview: (d.content || '').slice(0, 500),
    extractFailed: /^\[(Ekstraksi|Gagal)/.test(d.content || ''),
    aiFiltered: d.sourceType === 'url' ? !!d.aiFiltered : null,
    aiFilterNote: d.aiFilterNote || null,
  };
}

// ── EKSTRAKSI TEKS DARI FILE ──────────────────────────────────────
export async function kbExtractFileText(filePath: string, ext: string): Promise<string> {
  try {
    if (ext === 'txt' || ext === 'csv') return fs.readFileSync(filePath, 'utf8');
    if (ext === 'pdf') {
      const pdfParse = loadPdfParse();
      if (!pdfParse) return '[Ekstraksi PDF gagal: modul pdf-parse belum terinstall di server]';
      const buffer = fs.readFileSync(filePath);
      // pdf-parse v2 (class PDFParse) — fallback ke v1 (fungsi) kalau yang terinstall versi lama.
      if (pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const data = await parser.getText();
        return data.text || '';
      }
      const fn = pdfParse.default || pdfParse;
      const data = await fn(buffer);
      return data.text || '';
    }
    if (ext === 'docx') {
      const mammoth = loadMammoth();
      if (!mammoth) return '[Ekstraksi DOCX gagal: modul mammoth belum terinstall di server]';
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const xlsx = loadXlsx();
      if (!xlsx) return '[Ekstraksi XLSX gagal: modul xlsx belum terinstall di server]';
      const wb = xlsx.readFile(filePath);
      let out = '';
      wb.SheetNames.forEach((name: string) => {
        out += `\n--- Sheet: ${name} ---\n` + xlsx.utils.sheet_to_csv(wb.Sheets[name]);
      });
      return out;
    }
    return '';
  } catch (e) {
    console.error('[KB] Gagal ekstrak teks file:', (e as Error).message);
    return `[Gagal mengekstrak isi file: ${(e as Error).message}]`;
  }
}

/* Simpan file upload (dari req.formData()) ke data/kb-uploads/ — pengganti multer. */
export async function kbStoreUploadedFile(file: File): Promise<{ storedPath: string; ext: string; size: number }> {
  const ext = path.extname(file.name).slice(1).toLowerCase();
  fs.mkdirSync(KB_UPLOADS_DIR, { recursive: true });
  const storedPath = path.join(KB_UPLOADS_DIR, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.name)}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(storedPath, new Uint8Array(buffer));
  return { storedPath, ext, size: buffer.length };
}

// ── STRIP HTML ────────────────────────────────────────────────────
export function kbStripHtml(html: string): string {
  const raw = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ');

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

// ── LAPISAN 1: BLOKLIST BOILERPLATE UMUM (template Indotrading & sejenis) ──
const KB_NOISE_EXACT_LINES = new Set([
  'indonesia', 'english', 'id', 'en', 'kembali', 'search', 'menu', '×', '&times;',
  'login', 'register', 'masuk', 'masuk sales', 'masuk sebagai sales', 'masuk sebagai customer',
  'beranda', 'katalog produk', 'tentang kami', 'hubungi kami', 'blog', 'faq',
  'referensi projek', 'lihat semua',
  '&copy; -', 'powered by indotrading.', 'powered by indotrading',
  'chat dengan kami', 'mohon isi informasi dasar anda terlebih dahulu',
  'nama lengkap *', 'nama harus diisi', 'no. handphone *', '+62',
  'nomor telpon harus diisi', 'mohon isi nomor telepon dengan benar', 'mohon isi kode telepon',
  'email *', 'email harus diisi', 'mohon isi email dengan benar',
  'lengkapi informasi profil anda', 'negara *', 'negara harus diisi',
  'nama perusahaan *', 'saya mewakili perusahaan', 'saya personal', 'nama perusahaan harus diisi',
  'jabatan *', 'pilih departemen', 'director / ceo', 'sales manager', 'purchasing',
  'technical', 'administrative', 'marketing', 'lainnya', 'jabatan harus diisi',
  'jumlah & satuan *', 'jumlah & satuan harus diisi', 'catatan *', 'catatan harus diisi',
  'lanjut', 'chat whatsapp', 'kontak kami', 'hubungi dengan telepon', 'hubungi dengan email',
  'hubungi via whatsapp', 'lokasi', 'share', 'klik untuk chat',
]);

export function kbStripKnownBoilerplate(text: string): string {
  return String(text || '')
    .split('\n')
    .filter((line) => !KB_NOISE_EXACT_LINES.has(line.trim().toLowerCase()))
    .join('\n');
}

// ── LAPISAN 2: FILTER NOISE SISA VIA OLLAMA ──
function kbChunkLines(lines: string[]): string[][] {
  const batches: string[][] = [];
  let cur: string[] = [];
  let curChars = 0;
  for (const line of lines) {
    if (cur.length && (cur.length >= KB_FILTER_BATCH_MAX_LINES || curChars + line.length > KB_FILTER_BATCH_MAX_CHARS)) {
      batches.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(line);
    curChars += line.length;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

async function kbFilterNoiseBatch(lines: string[], attempt = 1): Promise<{ lines: string[]; ok: boolean; error: string | null }> {
  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const prompt = `Kamu membersihkan hasil crawling website dari teks yang TIDAK PENTING, seperti: menu navigasi, header/footer, breadcrumb, tombol (Login/Register/Search/Menu/Kembali/Share), copyright, pagination, cookie notice, dan daftar link kategori/menu yang berulang tanpa konteks kalimat.

JANGAN tandai baris yang merupakan KONTEN UTAMA halaman: paragraf deskripsi/profil perusahaan, alamat, nomor kontak, jam operasional, harga, spesifikasi produk, FAQ, kebijakan, visi & misi, dan sejenisnya — walau baris itu pendek.

Daftar baris (bernomor):
${numbered}

Balas HANYA dengan JSON valid, tanpa teks lain, format persis:
{"remove": [nomor baris yang harus dibuang karena noise]}
Kalau tidak ada yang perlu dibuang, balas {"remove": []}.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KB_FILTER_TIMEOUT_MS);
  try {
    const parsed = await ollamaGenerateJson<{ remove?: unknown[] }>(prompt, {
      model: KB_FILTER_MODEL, temperature: 0, num_ctx: 4096, signal: controller.signal,
    });
    const removeSet = new Set(
      Array.isArray(parsed.remove)
        ? parsed.remove.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= lines.length)
        : []
    );
    return { lines: lines.filter((_, i) => !removeSet.has(i + 1)), ok: true, error: null };
  } catch (err) {
    if (attempt < 2) return kbFilterNoiseBatch(lines, attempt + 1);
    console.error('[KB] Filter noise via Ollama gagal untuk 1 batch, baris dipertahankan apa adanya:', (err as Error).message);
    return { lines, ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

export async function kbFilterNoiseWithOllama(text: string) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < KB_FILTER_MIN_LINES) {
    return { text: lines.join('\n'), filtered: false, reason: null as string | null, totalBatches: 0, failedBatches: 0 };
  }

  const reachable = await ollamaReachableCached();
  if (!reachable) {
    return {
      text: lines.join('\n'),
      filtered: false,
      reason: `Ollama tidak terhubung di ${OLLAMA_BASE_URL} — jalankan "ollama serve" dan pastikan model "${KB_FILTER_MODEL}" sudah di-pull, atau nonaktifkan opsi "Bersihkan otomatis dengan AI"`,
      totalBatches: 0,
      failedBatches: 0,
    };
  }

  const batches = kbChunkLines(lines);
  const kept: string[] = [];
  let failedBatches = 0;
  let lastError: string | null = null;
  for (const batch of batches) {
    const result = await kbFilterNoiseBatch(batch);
    kept.push(...result.lines);
    if (!result.ok) { failedBatches++; lastError = result.error; }
  }
  return {
    text: kept.join('\n'),
    filtered: failedBatches === 0,
    reason: failedBatches > 0
      ? `Ollama gagal merespon untuk ${failedBatches}/${batches.length} bagian teks (${lastError}) — bagian itu disimpan apa adanya`
      : null,
    totalBatches: batches.length,
    failedBatches,
  };
}

// ── CRAWL WEBSITE MULTI-HALAMAN ──────
export function kbCrawlNextJobId(): string {
  return 'crawl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function kbNormalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return null;
  }
}

const KB_CRAWL_SKIP_EXT = /\.(jpe?g|png|gif|svg|webp|ico|css|js|pdf|zip|rar|7z|mp4|mp3|avi|mov|wav|woff2?|ttf|eot|xml|json|rss)(\?|#|$)/i;

export function kbExtractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const abs = new URL(m[1], baseUrl).toString();
      if (/^https?:/i.test(abs)) out.add(abs);
    } catch { /* href tidak valid */ }
  }
  return Array.from(out);
}

function kbFetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout mengambil halaman')), ms);
    xfetch(url, opts).then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export function kbCrawlScheduleCleanup(jobId: string) {
  setTimeout(() => { delete state.kbCrawlJobs[jobId]; }, KB_CRAWL_JOB_TTL_MS);
}

export function kbCreateCrawlJob(input: {
  url: string; category?: string; maxPages?: unknown; maxDepth?: unknown; sameDomainOnly?: unknown; aiFilter?: unknown;
}): CrawlJob {
  const job: CrawlJob = {
    id: kbCrawlNextJobId(),
    startUrl: input.url,
    category: (input.category || '').trim() || 'umum',
    maxPages: Math.max(1, Math.min(Number(input.maxPages) || 20, KB_CRAWL_MAX_PAGES_LIMIT)),
    maxDepth: Math.max(1, Math.min(Number(input.maxDepth) || 2, KB_CRAWL_MAX_DEPTH_LIMIT)),
    sameDomainOnly: input.sameDomainOnly !== false,
    aiFilter: input.aiFilter !== false,
    aiFilterTotalPages: 0,
    aiFilterFailedPages: 0,
    status: 'running',
    cancelled: false,
    pagesVisited: 0,
    currentUrl: input.url,
    docsCreated: [],
    errors: [],
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  state.kbCrawlJobs[job.id] = job;
  kbCrawlSite(job).catch((e) => {
    job.status = 'error';
    job.error = (e as Error).message;
    job.finishedAt = Date.now();
    kbCrawlScheduleCleanup(job.id);
  });
  return job;
}

export async function kbCrawlSite(job: CrawlJob) {
  ensureDataLoaded();
  let startHost: string;
  try { startHost = new URL(job.startUrl).hostname; } catch {
    job.status = 'error';
    job.error = 'URL awal tidak valid';
    kbCrawlScheduleCleanup(job.id);
    return;
  }

  const visited = new Set<string>();
  const queue: { url: string | null; depth: number }[] = [{ url: kbNormalizeUrl(job.startUrl), depth: 0 }];

  while (queue.length && visited.size < job.maxPages) {
    if (job.cancelled) { job.status = 'cancelled'; break; }
    if (Date.now() - job.startedAt > KB_CRAWL_TIME_BUDGET_MS) {
      job.errors.push('Dihentikan: batas waktu crawl (5 menit) tercapai');
      break;
    }

    const { url, depth } = queue.shift()!;
    if (!url || visited.has(url)) continue;
    let host: string;
    try { host = new URL(url).hostname; } catch { continue; }
    if (job.sameDomainOnly && host !== startHost) continue;
    if (KB_CRAWL_SKIP_EXT.test(url)) continue;

    visited.add(url);
    job.pagesVisited = visited.size;
    job.currentUrl = url;

    try {
      const r = await kbFetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 IndotradingKB/1.0' } }, 15000);
      const ctype = r.headers.get('content-type') || '';
      if (!r.ok || !ctype.includes('text/html')) continue;
      const html = await r.text();
      let text = kbStripKnownBoilerplate(kbStripHtml(html));
      let aiFiltered = false;
      let aiFilterNote: string | null = null;
      if (job.aiFilter) {
        job.currentUrl = `${url} (membersihkan dgn AI…)`;
        const filterInfo = await kbFilterNoiseWithOllama(text);
        text = filterInfo.text;
        aiFiltered = filterInfo.filtered;
        aiFilterNote = filterInfo.reason;
        job.currentUrl = url;
        job.aiFilterTotalPages = (job.aiFilterTotalPages || 0) + 1;
        if (!aiFiltered && aiFilterNote) {
          job.aiFilterFailedPages = (job.aiFilterFailedPages || 0) + 1;
          if (job.aiFilterFailedPages === 1) job.errors.push(`Filter AI (Ollama): ${aiFilterNote}`);
        }
      }
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = (titleMatch && titleMatch[1].trim()) || url;

      if (text && text.trim().length > 40) {
        const doc: KbDoc = {
          id: kbNextId(),
          title,
          category: job.category,
          status: 'aktif',
          sourceType: 'url',
          url,
          autoSync: false,
          crawlBatchId: job.id,
          content: kbTrimContent(text),
          aiFiltered,
          aiFilterNote,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.knowledgeBase.push(doc);
        job.docsCreated.push(kbPublicDoc(doc));
      }

      if (depth < job.maxDepth) {
        for (const link of kbExtractLinks(html, url)) {
          const norm = kbNormalizeUrl(link);
          if (norm && !visited.has(norm)) queue.push({ url: norm, depth: depth + 1 });
        }
      }
    } catch (e) {
      job.errors.push(`${url}: ${(e as Error).message}`);
    }

    await new Promise((res) => setTimeout(res, 300));
  }

  if (job.docsCreated.length) kbSave();
  if (job.status === 'running') job.status = 'done';
  job.finishedAt = Date.now();
  kbCrawlScheduleCleanup(job.id);
}

/* Tambah dokumen dari 1 URL (tanpa crawl). */
export async function kbAddFromUrl(input: { url: string; category?: string; autoSync?: unknown; aiFilter?: unknown }) {
  ensureDataLoaded();
  const r = await xfetch(input.url, { headers: { 'User-Agent': 'Mozilla/5.0 IndotradingKB/1.0' } });
  if (!r.ok) throw new Error(`Gagal mengambil URL (status ${r.status})`);
  const html = await r.text();
  let text = kbStripKnownBoilerplate(kbStripHtml(html));
  let aiFiltered = false;
  let aiFilterNote: string | null = null;
  if (input.aiFilter !== false) {
    const filterInfo = await kbFilterNoiseWithOllama(text);
    text = filterInfo.text;
    aiFiltered = filterInfo.filtered;
    aiFilterNote = filterInfo.reason;
  }
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const doc: KbDoc = {
    id: kbNextId(),
    title: (titleMatch && titleMatch[1].trim()) || input.url,
    category: (input.category || '').trim() || 'umum',
    status: 'aktif',
    sourceType: 'url',
    url: input.url,
    autoSync: !!input.autoSync,
    content: kbTrimContent(text),
    aiFiltered,
    aiFilterNote,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (!doc.content) throw new Error('Tidak ada teks yang bisa diambil dari halaman ini');
  state.knowledgeBase.push(doc);
  kbSave();
  return { doc, aiFilterNote };
}

// ── KONTEKS UNTUK PROMPT OLLAMA ───────────────────────────────────
export function kbActiveContext(): string {
  ensureDataLoaded();
  const active = state.knowledgeBase.filter((d) => d.status === 'aktif' && (d.content || '').trim());
  if (!active.length) return '';
  let out = '';
  let used = 0;
  for (const doc of active) {
    const block = `### ${doc.title} [kategori: ${doc.category || 'umum'}]\n${doc.content.trim()}\n\n`;
    if (used + block.length > KB_CONTEXT_MAX_CHARS) {
      const remaining = KB_CONTEXT_MAX_CHARS - used;
      if (remaining > 200) out += block.slice(0, remaining) + '\n[...dipotong...]\n\n';
      break;
    }
    out += block;
    used += block.length;
  }
  return out.trim();
}
