"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, Check, CloudUpload, File, FileSpreadsheet, FileText, Globe, Info, Loader2, Network, Pencil, Plus,
  Sparkles, Upload, X, RefreshCw,
} from "lucide-react";

import { kbApi } from "@/lib/knowledge-base-api";
import type { CrawlJob, KbDocFull } from "@/types/knowledge-base";
import { fmtSize } from "./kb-utils";

type Src = "file" | "url" | "teks";
type ToastFn = (msg: string, type?: "success" | "error") => void;

/** Interval polling crawl & langkah progres "1 halaman URL" (bisa diubah untuk pengujian). */
export const kbTiming = { crawlPollMs: 1500, urlStepMs: 900 };

const ALLOWED_EXT = ["pdf", "docx", "xlsx", "txt", "csv"];
const MAX_FILES = 10; // batas di server (upload/route.ts)

const CATEGORY_OPTIONS = [
  { v: "produk", l: "Produk & Layanan" },
  { v: "harga", l: "Harga & Promo" },
  { v: "faq", l: "FAQ Pelanggan" },
  { v: "sop", l: "SOP & Prosedur" },
  { v: "pengiriman", l: "Pengiriman" },
];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const FileIcon = ({ ext }: { ext: string }) =>
  ["xlsx", "xls", "csv"].includes(ext) ? <FileSpreadsheet aria-hidden /> : ["pdf", "docx", "txt"].includes(ext) ? <FileText aria-hidden /> : <File aria-hidden />;

interface CrawlView { label: string; count: string; pct: number; currentUrl: string }

interface Props {
  /** null = mode tambah; dokumen = mode edit (judul, isi, kategori). */
  editing: KbDocFull | null;
  onClose: () => void;
  /** Dipanggil setelah data berubah di server (muat ulang daftar). */
  onDone: () => Promise<void> | void;
  toast: ToastFn;
}

export function KbAddModal({ editing, onClose, onDone, toast }: Props) {
  const isEdit = !!editing;

  const [src, setSrc] = useState<Src>(isEdit ? "teks" : "file");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [tTitle, setTTitle] = useState(editing?.title ?? "");
  const [tContent, setTContent] = useState(editing?.content ?? "");
  const [url, setUrl] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [aiFilter, setAiFilter] = useState(true);
  const [crawlMode, setCrawlMode] = useState(false);
  const [maxPages, setMaxPages] = useState(20);
  const [maxDepth, setMaxDepth] = useState(2);
  const [sameDomain, setSameDomain] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);
  const [urlProg, setUrlProg] = useState<{ pct: number; label: string } | null>(null);
  const [crawl, setCrawl] = useState<CrawlView | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const urlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const crawlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const crawlJobId = useRef<string | null>(null);

  const stopTimers = useCallback(() => {
    if (urlTimer.current) clearInterval(urlTimer.current);
    if (crawlTimer.current) clearInterval(crawlTimer.current);
    urlTimer.current = crawlTimer.current = null;
  }, []);

  // Menutup modal TIDAK menghentikan crawl di server (sama seperti referensi), hanya polling-nya.
  useEffect(() => stopTimers, [stopTimers]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ── file ───────────────────────────────────────────────── */
  const addFiles = (list: File[]) => {
    const ok = list.filter((f) => ALLOWED_EXT.includes(extOf(f.name))).slice(0, MAX_FILES);
    setFiles(ok);
  };

  /* ── progres 1 halaman URL (bertahap berdasarkan waktu, bukan persen asli dari server) ── */
  const showUrlProgress = (withAi: boolean) => {
    const steps = withAi
      ? [{ pct: 20, msg: "Menghubungi halaman…" }, { pct: 45, msg: "Mengambil & membaca konten…" },
         { pct: 70, msg: "Membersihkan teks dengan AI (Ollama)…" }, { pct: 90, msg: "Menyimpan ke Knowledge Base…" }]
      : [{ pct: 25, msg: "Menghubungi halaman…" }, { pct: 60, msg: "Mengambil & membaca konten…" },
         { pct: 90, msg: "Menyimpan ke Knowledge Base…" }];
    setUrlProg({ pct: steps[0].pct, label: steps[0].msg });
    let i = 1;
    if (urlTimer.current) clearInterval(urlTimer.current);
    urlTimer.current = setInterval(() => {
      if (i >= steps.length) { if (urlTimer.current) clearInterval(urlTimer.current); return; } // tunggu respons asli
      setUrlProg({ pct: steps[i].pct, label: steps[i].msg });
      i++;
    }, kbTiming.urlStepMs);
  };

  /* ── crawl seluruh website ───────────────────────────────── */
  const startCrawl = async () => {
    const u = url.trim();
    const opts = { url: u, category, maxPages: maxPages || 20, maxDepth: maxDepth || 2, sameDomainOnly: sameDomain, aiFilter };
    try {
      setBusy("Crawling…");
      setCrawl({ label: "Memulai crawling…", count: `0/${opts.maxPages}`, pct: 0, currentUrl: "" });
      const { jobId } = await kbApi.startCrawl(opts);
      crawlJobId.current = jobId;
      toast("Crawling dimulai — proses berjalan di server, boleh ditinggal.", "success");

      if (crawlTimer.current) clearInterval(crawlTimer.current);
      crawlTimer.current = setInterval(async () => {
        try {
          const job: CrawlJob = await kbApi.crawlStatus(jobId);
          setCrawl({
            pct: Math.min(100, Math.round((job.pagesVisited / (job.maxPages || 1)) * 100)),
            count: `${job.pagesVisited}/${job.maxPages} halaman`,
            currentUrl: job.currentUrl || "",
            label:
              job.status === "running" ? `Mengambil halaman… (${job.docsCreated} dokumen tersimpan)`
              : job.status === "done" ? `Selesai — ${job.docsCreated} dokumen tersimpan`
              : job.status === "cancelled" ? `Dihentikan — ${job.docsCreated} dokumen tersimpan`
              : "Crawling gagal",
          });
          if (job.status === "running") return;

          stopTimers();
          crawlJobId.current = null;
          setBusy(null);
          if (job.status === "error") {
            toast(job.error || "Crawling gagal di tengah proses", "error");
            await onDone();
            return;
          }
          toast(`Crawling ${job.status === "cancelled" ? "dihentikan" : "selesai"} — ${job.docsCreated} halaman disimpan ke Knowledge Base.`, "success");
          if (job.aiFilterTotalPages > 0 && job.aiFilterFailedPages > 0) {
            const all = job.aiFilterFailedPages === job.aiFilterTotalPages;
            const msg = all
              ? `Filter AI (Ollama) gagal di semua ${job.aiFilterTotalPages} halaman — cek apakah Ollama sedang jalan. Konten tetap tersimpan tanpa filter.`
              : `Filter AI (Ollama) gagal di ${job.aiFilterFailedPages}/${job.aiFilterTotalPages} halaman — sisanya berhasil dibersihkan.`;
            setTimeout(() => toast(msg, "error"), 400);
          }
          await onDone();
          onClose();
        } catch (e) {
          stopTimers();
          crawlJobId.current = null;
          setBusy(null);
          toast(errMsg(e), "error");
        }
      }, kbTiming.crawlPollMs);
    } catch (e) {
      setBusy(null);
      setCrawl(null);
      toast(errMsg(e), "error");
    }
  };

  const cancelCrawl = () => {
    if (!crawlJobId.current) return;
    void kbApi.cancelCrawl(crawlJobId.current).catch(() => {});
    setCrawl((c) => (c ? { ...c, label: "Menghentikan…" } : c));
  };

  /* ── simpan ──────────────────────────────────────────────── */
  const save = async () => {
    // Mode crawl berjalan async & dipoll sendiri.
    if (!isEdit && src === "url" && crawlMode) {
      if (!url.trim()) return toast("Isi URL terlebih dahulu", "error");
      await startCrawl();
      return;
    }

    try {
      if (isEdit && editing) {
        if (!tTitle.trim() || !tContent.trim()) return toast("Judul & konten wajib diisi", "error");
        setBusy("Menyimpan…");
        await kbApi.update(editing.id, { title: tTitle.trim(), content: tContent.trim(), category });
        toast("Perubahan disimpan.", "success");
      } else if (src === "file") {
        if (!files.length) return toast("Pilih minimal 1 file terlebih dahulu", "error");
        setBusy("Mengunggah…");
        const { docs } = await kbApi.upload(files, category);
        setFiles([]);
        toast(`${docs.length} dokumen berhasil disimpan. AI sudah bisa menjawab dari isinya.`, "success");
      } else if (src === "url") {
        if (!url.trim()) return toast("Isi URL terlebih dahulu", "error");
        setBusy("Menyimpan…");
        showUrlProgress(aiFilter);
        try {
          const res = await kbApi.addUrl({ url: url.trim(), category, autoSync, aiFilter });
          stopTimers();
          setUrlProg({ pct: 100, label: "✓ Konten berhasil diambil & disimpan" });
          toast("Konten dari URL berhasil disimpan.", "success");
          // Dokumen tetap tersimpan; filter AI-nya saja yang tidak jalan penuh.
          if (res.aiFilterWarning) setTimeout(() => toast(res.aiFilterWarning as string, "error"), 400);
          await new Promise((r) => setTimeout(r, 500)); // beri waktu progres terlihat 100%
        } catch (e) {
          stopTimers();
          setUrlProg(null);
          throw e;
        }
      } else {
        if (!tTitle.trim() || !tContent.trim()) return toast("Judul & konten wajib diisi", "error");
        setBusy("Menyimpan…");
        await kbApi.addText({ title: tTitle.trim(), content: tContent.trim(), category });
        toast("Dokumen berhasil disimpan. AI sudah bisa menjawab dari isinya.", "success");
      }
      await onDone();
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const tabs: { id: Src; label: string; icon: React.ReactNode }[] = [
    { id: "file", label: "Upload File", icon: <Upload aria-hidden /> },
    { id: "url", label: "URL / Website", icon: <Globe aria-hidden /> },
    { id: "teks", label: "Teks Langsung", icon: <Pencil aria-hidden /> },
  ];

  return (
    <div className="kb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kb-add-title"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kb-modal">
        <div className="kb-modal-header">
          <div className="kb-modal-title">
            {isEdit ? <Pencil size={15} style={{ color: "var(--kb-red)" }} aria-hidden /> : <Plus size={15} style={{ color: "var(--kb-red)" }} aria-hidden />}
            <span id="kb-add-title">{isEdit ? "Edit Dokumen" : "Tambah Dokumen"}</span>
          </div>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </div>

        <div className="kb-modal-body">
          {!isEdit && (
            <div className="kb-source-tabs" role="tablist">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={src === t.id}
                        className={`kb-src-tab${src === t.id ? " active" : ""}`} onClick={() => setSrc(t.id)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Upload file ── */}
          {src === "file" && (
            <div className="kb-src-panel">
              <div
                className={`kb-dropzone${dragOver ? " drag-over" : ""}`}
                role="button" tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer?.files ?? [])); }}
              >
                <CloudUpload aria-hidden />
                <div className="kb-drop-title">Tarik &amp; lepas file di sini</div>
                <div className="kb-drop-sub">atau klik untuk memilih file</div>
                <div className="kb-drop-types">PDF, DOCX, XLSX, TXT, CSV — maks. 20 MB</div>
                <input ref={fileInput} type="file" multiple accept=".pdf,.docx,.xlsx,.txt,.csv" style={{ display: "none" }}
                       aria-label="Pilih file" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
              </div>
              <div className="kb-file-list">
                {files.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="kb-file-item">
                    <FileIcon ext={extOf(f.name)} />
                    <span className="kb-file-item-name">{f.name}</span>
                    <span className="kb-file-item-size">{fmtSize(f.size)}</span>
                    <X className="kb-file-item-remove" aria-label={`Hapus ${f.name}`} role="button"
                       onClick={() => setFiles((l) => l.filter((_, i) => i !== idx))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── URL / website ── */}
          {src === "url" && (
            <div className="kb-src-panel">
              <div className="kb-fd-group">
                <label className="kb-fd-label" htmlFor="kb-url-input">URL Halaman / Website</label>
                <input id="kb-url-input" type="url" className="kb-fd-input" placeholder="https://contoh.com/produk"
                       value={url} onChange={(e) => setUrl(e.target.value)} />
                <div className="kb-fd-hint"><Info aria-hidden /> AI akan melakukan crawl dan mengambil konten secara otomatis.</div>
              </div>

              <div className="kb-fd-group">
                <label className="kb-radio-row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
                  <span style={{ fontSize: 12 }}><RefreshCw size={13} className="kb-inline-svg" style={{ color: "var(--kb-red)" }} aria-hidden /> Aktifkan auto-sync setiap 24 jam</span>
                </label>
                <label className="kb-radio-row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={aiFilter} onChange={(e) => setAiFilter(e.target.checked)} />
                  <span style={{ fontSize: 12 }}><Sparkles size={13} className="kb-inline-svg" style={{ color: "var(--kb-red)" }} aria-hidden /> Bersihkan otomatis dengan AI (buang navbar, menu, footer, dll)</span>
                </label>
                <div className="kb-fd-hint"><Info aria-hidden /> Memakai Ollama lokal untuk menyaring teks yang tidak penting sebelum disimpan. Nonaktifkan kalau Ollama belum jalan atau ingin proses lebih cepat.</div>
                <label className="kb-radio-row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={crawlMode} onChange={(e) => setCrawlMode(e.target.checked)} />
                  <span style={{ fontSize: 12 }}><Network size={13} className="kb-inline-svg" style={{ color: "var(--kb-red)" }} aria-hidden /> Crawl seluruh website (ikuti tautan internal, bukan cuma 1 halaman)</span>
                </label>
              </div>

              {crawlMode && (
                <div>
                  <div className="kb-fd-group" style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                      <label className="kb-fd-label" htmlFor="kb-crawl-max-pages">Maks. halaman</label>
                      <input id="kb-crawl-max-pages" type="number" className="kb-fd-input" min={1} max={50} style={{ width: 84 }}
                             value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="kb-fd-label" htmlFor="kb-crawl-max-depth">Kedalaman tautan</label>
                      <input id="kb-crawl-max-depth" type="number" className="kb-fd-input" min={1} max={5} style={{ width: 84 }}
                             value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} />
                    </div>
                    <label className="kb-radio-row" style={{ gap: 6, paddingBottom: 9 }}>
                      <input type="checkbox" checked={sameDomain} onChange={(e) => setSameDomain(e.target.checked)} />
                      <span style={{ fontSize: 12 }}>Hanya domain yang sama</span>
                    </label>
                  </div>
                  <div className="kb-fd-hint"><Info aria-hidden /> Tiap halaman yang berhasil diambil disimpan sebagai dokumen KB terpisah.</div>

                  {crawl && (
                    <div style={{ marginTop: 10 }} aria-live="polite">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--kb-gray-400)", marginBottom: 4 }}>
                        <span>{crawl.label}</span><span>{crawl.count}</span>
                      </div>
                      <div className="kb-cov-track"><div className="kb-cov-fill" style={{ width: `${crawl.pct}%` }} /></div>
                      <div style={{ marginTop: 5, fontSize: 11, color: "var(--kb-gray-400)", wordBreak: "break-all" }}>{crawl.currentUrl}</div>
                      <button type="button" className="kb-btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: "4px 10px" }} onClick={cancelCrawl}>
                        Hentikan crawling
                      </button>
                    </div>
                  )}
                </div>
              )}

              {urlProg && !crawlMode && (
                <div style={{ marginTop: 10 }} aria-live="polite">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--kb-gray-400)", marginBottom: 6 }}>
                    <Loader2 size={14} className="kb-spin" style={{ color: "var(--kb-red)" }} aria-hidden />
                    <span>{urlProg.label}</span>
                  </div>
                  <div className="kb-train-bar-wrap"><div className="kb-train-bar" style={{ width: `${urlProg.pct}%` }} /></div>
                </div>
              )}
            </div>
          )}

          {/* ── Teks langsung (dan mode edit) ── */}
          {src === "teks" && (
            <div className="kb-src-panel">
              <div className="kb-fd-group">
                <label className="kb-fd-label" htmlFor="kb-teks-title">Judul Dokumen</label>
                <input id="kb-teks-title" type="text" className="kb-fd-input" placeholder="cth: Kebijakan Retur Produk"
                       value={tTitle} onChange={(e) => setTTitle(e.target.value)} />
              </div>
              <div className="kb-fd-group">
                <label className="kb-fd-label" htmlFor="kb-teks-content">Konten</label>
                <textarea id="kb-teks-content" className="kb-fd-textarea" rows={8} placeholder="Tuliskan konten pengetahuan di sini…"
                          value={tContent} onChange={(e) => setTContent(e.target.value)} />
              </div>
            </div>
          )}

          <div className="kb-fd-group">
            <label className="kb-fd-label" htmlFor="kb-add-cat">Kategori</label>
            <select id="kb-add-cat" className="kb-fd-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Pilih kategori…</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              {isEdit && category === "umum" && <option value="umum">Umum</option>}
            </select>
          </div>

          {!isEdit && (
            <div className="kb-fd-check-row">
              <input type="checkbox" id="kb-add-train" defaultChecked />
              <label htmlFor="kb-add-train" style={{ fontSize: 12, cursor: "pointer" }}>
                <Bot size={13} className="kb-inline-svg" style={{ color: "var(--kb-red)" }} aria-hidden /> Latih AI secara otomatis setelah disimpan
              </label>
            </div>
          )}
        </div>

        <div className="kb-modal-footer">
          <button type="button" className="kb-btn-ghost" onClick={onClose}>Batal</button>
          <button type="button" className="kb-btn-primary" onClick={() => void save()} disabled={busy !== null}>
            {busy ? <><Loader2 className="kb-spin" aria-hidden /> {busy}</> : <><Check aria-hidden /> {isEdit ? "Simpan Perubahan" : "Simpan & Latih AI"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
