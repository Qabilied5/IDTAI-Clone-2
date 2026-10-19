"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Brain, Check, Eye, Info, Play, X } from "lucide-react";

/* ── Toast ─────────────────────────────────────────────────── */
export interface ToastData { id: number; msg: string; type: "" | "success" | "error" }

export function KbToast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className={`kb-toast${toast.type ? " " + toast.type : ""}`} role="status">
      {toast.type === "error" ? <AlertTriangle aria-hidden /> : <Check aria-hidden />}
      <span>{toast.msg}</span>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/* ── Pratinjau: persis teks yang dipakai AI ─────────────────── */
export function KbPreviewModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="kb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kb-preview-title"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kb-modal">
        <div className="kb-modal-header">
          <div className="kb-modal-title">
            <Eye size={15} style={{ color: "var(--kb-red)" }} aria-hidden />
            <span id="kb-preview-title">{title}</span>
          </div>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </div>
        <div className="kb-modal-body">
          <div className="kb-fd-hint" style={{ marginBottom: 10 }}>
            <Info aria-hidden /> Ini persis teks yang dipakai AI untuk menjawab customer — bukan tampilan file aslinya.
          </div>
          <pre className="kb-pre">{content || "(Tidak ada konten / gagal diekstrak)"}</pre>
        </div>
        <div className="kb-modal-footer">
          <button type="button" className="kb-btn-ghost" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

/* ── Latih ulang AI ─────────────────────────────────────────────
   Sama seperti referensi: KOSMETIK. Dokumen "Aktif" sudah langsung dipakai AI saat itu juga
   (lihat kbActiveContext di server); tombol ini hanya memberi umpan balik visual. */
export const TRAIN_STEP_MS = 700;
const TRAIN_STEPS = [
  { pct: 25, msg: "Memuat dokumen aktif dari Knowledge Base…" },
  { pct: 55, msg: "Menyusun konteks untuk model Ollama…" },
  { pct: 85, msg: "Memvalidasi isi konteks…" },
  { pct: 100, msg: "✓ Knowledge Base siap dipakai AI!" },
];

export function KbTrainModal({
  activeCount,
  recentCount,
  onClose,
  onDone,
}: {
  activeCount: number;
  recentCount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  useEscape(onClose);
  const [scope, setScope] = useState<"semua" | "baru">("semua");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const closer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (closer.current) clearTimeout(closer.current);
  }, []);

  const start = () => {
    setRunning(true);
    let i = 0;
    setStep(0);
    timer.current = setInterval(() => {
      i++;
      if (i >= TRAIN_STEPS.length) {
        if (timer.current) clearInterval(timer.current);
        closer.current = setTimeout(onDone, 600);
        return;
      }
      setStep(i);
    }, TRAIN_STEP_MS);
  };

  const cur = step >= 0 ? TRAIN_STEPS[step] : null;
  return (
    <div className="kb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kb-train-title"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kb-modal kb-modal-sm">
        <div className="kb-modal-header">
          <div className="kb-modal-title"><Brain size={15} style={{ color: "var(--kb-red)" }} aria-hidden /><span id="kb-train-title">Latih Ulang AI</span></div>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        </div>
        <div className="kb-modal-body">
          <div className="kb-train-info">
            <Info size={15} style={{ color: "var(--kb-red)", flexShrink: 0 }} aria-hidden />
            <span>AI akan mempelajari ulang seluruh dokumen aktif. Proses ini memakan waktu sekitar <strong>2–5 menit</strong> dan tidak akan mempengaruhi layanan yang sedang berjalan.</span>
          </div>
          <div className="kb-train-scope">
            <label className="kb-radio-row" style={{ fontSize: 12 }}>
              <input type="radio" name="kb-train-scope" checked={scope === "semua"} onChange={() => setScope("semua")} disabled={running} />
              <span>Latih ulang semua dokumen aktif ({activeCount} file)</span>
            </label>
            <label className="kb-radio-row" style={{ fontSize: 12 }}>
              <input type="radio" name="kb-train-scope" checked={scope === "baru"} onChange={() => setScope("baru")} disabled={running} />
              <span>Hanya dokumen baru / diperbarui 7 hari terakhir ({recentCount} file)</span>
            </label>
          </div>
          {running && cur && (
            <div className="kb-train-progress" style={{ display: "flex" }}>
              <div className="kb-train-bar-wrap"><div className="kb-train-bar" style={{ width: `${cur.pct}%` }} /></div>
              <div className="kb-train-status">{cur.msg}</div>
            </div>
          )}
        </div>
        <div className="kb-modal-footer">
          <button type="button" className="kb-btn-ghost" onClick={onClose}>{running ? "Tutup" : "Batal"}</button>
          {!running && (
            <button type="button" className="kb-btn-primary" onClick={start}><Play aria-hidden /> Mulai Pelatihan</button>
          )}
        </div>
      </div>
    </div>
  );
}
