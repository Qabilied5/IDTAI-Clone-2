"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Play, Square, Trash2 } from "lucide-react";

import { kbApi } from "@/lib/knowledge-base-api";
import type { KbDocFull } from "@/types/knowledge-base";
import "./knowledge-base.css";
import { catLabel, coveragePct, fmtDate, fmtSize } from "./kb-utils";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const SRC_LABEL: Record<string, string> = { file: "File", url: "URL / Website", teks: "Teks langsung" };

/** Halaman detail satu dokumen: metadata + teks lengkap yang dipakai AI. */
export function KbDetail({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<KbDocFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDoc(await kbApi.get(documentId));
      setError(null);
    } catch (e) { setError(errMsg(e)); }
  }, [documentId]);

  useEffect(() => { void load(); }, [load]);

  const toggleStatus = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      await kbApi.setStatus(doc.id, doc.status === "aktif" ? "nonaktif" : "aktif");
      await load();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!doc || !window.confirm("Hapus dokumen ini secara permanen? AI tidak akan lagi menjawab dari isinya.")) return;
    setBusy(true);
    try {
      await kbApi.remove(doc.id);
      router.push("/knowledge-base");
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  };

  return (
    <div className="kb-root">
      <div className="kb-detail">
        <Link href="/knowledge-base" className="kb-detail-back"><ArrowLeft aria-hidden /> Kembali ke Knowledge Base</Link>

        {error && <div role="alert" style={{ color: "var(--kb-red)", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
        {!doc && !error && <div style={{ color: "var(--kb-gray-400)", fontSize: 12.5 }}>Memuat...</div>}

        {doc && (
          <>
            <div className="kb-detail-head">
              <div>
                <div className="kb-detail-title">{doc.title}</div>
                <div className="kb-detail-badges">
                  {doc.status === "aktif" ? (
                    <>
                      <span className="kb-badge kb-badge-aktif"><span className="kb-dot kb-dot-green" />Aktif</span>
                      {!doc.extractFailed && <span className="kb-badge kb-badge-ai"><Bot aria-hidden />Terlatih</span>}
                    </>
                  ) : (
                    <span className="kb-badge kb-badge-nonaktif">
                      <span className={`kb-dot ${doc.status === "draft" ? "kb-dot-amber" : "kb-dot-gray"}`} />{doc.status === "draft" ? "Draft" : "Nonaktif"}
                    </span>
                  )}
                </div>
              </div>
              <div className="kb-detail-actions">
                <button type="button" className="kb-btn-ghost" onClick={() => void toggleStatus()} disabled={busy}>
                  {doc.status === "aktif" ? <><Square aria-hidden /> Nonaktifkan</> : <><Play aria-hidden /> Aktifkan</>}
                </button>
                <button type="button" className="kb-btn-ghost" onClick={() => void remove()} disabled={busy} style={{ color: "var(--kb-red)" }}>
                  <Trash2 aria-hidden /> Hapus
                </button>
              </div>
            </div>

            <dl className="kb-detail-meta">
              <div><dt>Kategori</dt><dd>{catLabel(doc.category)}</dd></div>
              <div><dt>Sumber</dt><dd>{SRC_LABEL[doc.sourceType] ?? doc.sourceType}</dd></div>
              {doc.fileName && <div><dt>Nama file</dt><dd>{doc.fileName}</dd></div>}
              {doc.url && <div><dt>URL</dt><dd>{doc.url}</dd></div>}
              <div><dt>Ukuran</dt><dd>{fmtSize(doc.sizeBytes)}</dd></div>
              <div><dt>Cakupan AI</dt><dd>{doc.extractFailed ? "Gagal ekstrak" : `${coveragePct(doc)}%`}</dd></div>
              <div><dt>Diperbarui</dt><dd>{fmtDate(doc.updatedAt)}</dd></div>
              {doc.aiFilterNote && <div><dt>Catatan filter AI</dt><dd>{doc.aiFilterNote}</dd></div>}
            </dl>

            <div className="kb-detail-card">
              <h3>Isi yang dipakai AI</h3>
              <pre className="kb-pre" style={{ maxHeight: "none" }}>{doc.content || "(Tidak ada konten / gagal diekstrak)"}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
