"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, Plus, RefreshCw, SquareCheck, Trash2 } from "lucide-react";

import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { kbApi } from "@/lib/knowledge-base-api";
import type { KbDocFull, KbStatus } from "@/types/knowledge-base";
import "./knowledge-base.css";
import { KbAddModal } from "./KbAddModal";
import { KbDocCard } from "./KbDocCard";
import { KbSidebar, type StatusFilter } from "./KbSidebar";
import { KbPreviewModal, KbToast, KbTrainModal, type ToastData } from "./KbSmallModals";
import { KbStatsBar, KbToolbar } from "./KbToolbar";
import { catLabel, sortDocs, type SortKey } from "./kb-utils";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const WEEK_MS = 7 * 24 * 3600 * 1000;

type Modal =
  | { kind: "none" }
  | { kind: "add"; editing: KbDocFull | null }
  | { kind: "train" }
  | { kind: "preview"; title: string; content: string };

export function KnowledgeBaseContent() {
  const { docs, loading, error, refresh } = useKnowledgeBase();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("semua");
  const [status, setStatus] = useState<StatusFilter>("semua");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("newest");
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToastState] = useState<ToastData | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" | "" = "") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ id: Date.now() + Math.random(), msg, type });
    toastTimer.current = setTimeout(() => setToastState(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (error) showToast(`Gagal memuat Knowledge Base: ${error}`, "error");
  }, [error, showToast]);

  // Pintasan ⌘K / Ctrl+K memfokuskan kolom cari.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── daftar yang tampil: filter + urutan ── */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = docs.filter((d) => {
      const hay = `${d.title} ${catLabel(d.category)} ${d.fileName ?? ""}`.toLowerCase();
      return (!q || hay.includes(q)) && (cat === "semua" || d.category === cat) && (status === "semua" || d.status === status);
    });
    return sortDocs(filtered, sort);
  }, [docs, query, cat, status, sort]);

  const activeCount = docs.filter((d) => d.status === "aktif").length;
  const recentCount = docs.filter((d) => d.status === "aktif" && Date.now() - d.updatedAt < WEEK_MS).length;
  const listTitle = cat === "semua" ? "Semua Dokumen" : catLabel(cat);

  /* ── aksi ── */
  const openPreview = async (id: number) => {
    try {
      const doc = await kbApi.get(id);
      setModal({ kind: "preview", title: doc.title, content: doc.content });
    } catch (e) { showToast(errMsg(e), "error"); }
  };

  const openEdit = async (id: number) => {
    try {
      setModal({ kind: "add", editing: await kbApi.get(id) });
    } catch (e) { showToast(errMsg(e), "error"); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Hapus dokumen ini secara permanen? AI tidak akan lagi menjawab dari isinya.")) return;
    try {
      await kbApi.remove(id);
      showToast("Dokumen dihapus.", "error");
      await refresh();
    } catch (e) { showToast(errMsg(e), "error"); }
  };

  const setDocStatus = async (id: number, next: KbStatus) => {
    try {
      await kbApi.setStatus(id, next);
      showToast(next === "aktif" ? "Dokumen diaktifkan kembali — AI akan mulai memakainya." : "Dokumen dinonaktifkan — AI berhenti memakainya.", "success");
      await refresh();
    } catch (e) { showToast(errMsg(e), "error"); }
  };

  const toggleSelectMode = () => {
    setSelectMode((m) => !m);
    setSelected(new Set());
  };

  const selectDoc = (id: number, checked: boolean) =>
    setSelected((s) => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n; });

  const allVisibleSelected = visible.length > 0 && visible.every((d) => selected.has(d.id));
  const selectAllVisible = (checked: boolean) =>
    setSelected((s) => { const n = new Set(s); visible.forEach((d) => (checked ? n.add(d.id) : n.delete(d.id))); return n; });

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(`Hapus ${ids.length} dokumen terpilih secara permanen? AI tidak akan lagi menjawab dari isinya.`)) return;
    try {
      const { deletedCount } = await kbApi.bulkRemove(ids);
      showToast(`${deletedCount} dokumen dihapus.`, "error");
      setSelected(new Set());
      setSelectMode(false);
      await refresh();
    } catch (e) { showToast(errMsg(e), "error"); }
  };

  const resetFilter = () => { setCat("semua"); setStatus("semua"); setQuery(""); };

  return (
    <div className="kb-root">
      <KbToolbar ref={searchRef} query={query} onQuery={setQuery} activeCount={activeCount}
                 onTrain={() => setModal({ kind: "train" })} onAdd={() => setModal({ kind: "add", editing: null })} />
      <KbStatsBar docs={docs} />

      <div className="kb-body">
        <KbSidebar docs={docs} cat={cat} onCat={setCat} status={status} onStatus={setStatus} />

        <div className="kb-main">
          <div className="kb-list-head">
            <div className="kb-list-title">{listTitle} <span className="kb-count-badge">{visible.length}</span></div>
            <div className="kb-list-actions">
              <button type="button" className={`kb-view-btn kb-select-toggle-btn${selectMode ? " active" : ""}`}
                      onClick={toggleSelectMode} title="Pilih beberapa dokumen untuk dihapus sekaligus" aria-pressed={selectMode} aria-label="Mode pilih">
                <SquareCheck aria-hidden />
              </button>
              <div className="kb-view-toggle">
                <button type="button" className={`kb-view-btn${view === "grid" ? " active" : ""}`} onClick={() => setView("grid")} title="Grid view" aria-label="Tampilan grid">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" /><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                    <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" /><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                  </svg>
                </button>
                <button type="button" className={`kb-view-btn${view === "list" ? " active" : ""}`} onClick={() => setView("list")} title="List view" aria-label="Tampilan daftar">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <rect x="1" y="2" width="13" height="2.8" rx="1.2" fill="currentColor" /><rect x="1" y="6.1" width="13" height="2.8" rx="1.2" fill="currentColor" />
                    <rect x="1" y="10.2" width="13" height="2.8" rx="1.2" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <select className="kb-sort-select" value={sort} aria-label="Urutkan" onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="alpha">A–Z</option>
                <option value="coverage">Cakupan AI</option>
              </select>
            </div>
          </div>

          {selectMode && (
          <div className="kb-bulk-bar open">
            <label className="kb-bulk-select-all">
              <input type="checkbox" checked={allVisibleSelected} onChange={(e) => selectAllVisible(e.target.checked)} /> Pilih semua
            </label>
            <span className="kb-bulk-count">{selected.size > 0 ? `${selected.size} dokumen dipilih` : "Belum ada dokumen dipilih"}</span>
            <button type="button" className="kb-btn-ghost" onClick={toggleSelectMode}>Batal</button>
            <button type="button" className="kb-btn-danger" onClick={() => void bulkDelete()} disabled={selected.size === 0}>
              <Trash2 aria-hidden /> Hapus Terpilih
            </button>
          </div>
          )}

          {visible.length > 0 && (
            <div className={`kb-grid${view === "list" ? " list-view" : ""}`}>
              {visible.map((d) => (
                <KbDocCard key={d.id} doc={d} selectMode={selectMode} selected={selected.has(d.id)} onSelect={selectDoc}
                           onPreview={(id) => void openPreview(id)} onEdit={(id) => void openEdit(id)}
                           onDelete={(id) => void remove(id)} onActivate={(id) => void setDocStatus(id, "aktif")} />
              ))}
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="kb-empty">
              <FileSearch aria-hidden />
              {docs.length === 0 ? (
                <>
                  <div>Belum ada dokumen</div>
                  <span>Tambahkan file, URL website, atau teks agar AI bisa menjawab dari isinya</span>
                  <button type="button" className="kb-btn-primary" style={{ marginTop: 8 }} onClick={() => setModal({ kind: "add", editing: null })}>
                    <Plus aria-hidden /> Tambah Dokumen
                  </button>
                </>
              ) : (
                <>
                  <div>Tidak ada dokumen ditemukan</div>
                  <span>Coba ubah filter atau kata kunci pencarian Anda</span>
                  <button type="button" className="kb-btn-primary" style={{ marginTop: 8 }} onClick={resetFilter}>
                    <RefreshCw aria-hidden /> Reset Filter
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {modal.kind === "add" && (
        <KbAddModal key={modal.editing?.id ?? "new"} editing={modal.editing} onClose={() => setModal({ kind: "none" })} onDone={refresh} toast={showToast} />
      )}
      {modal.kind === "train" && (
        <KbTrainModal activeCount={activeCount} recentCount={recentCount} onClose={() => setModal({ kind: "none" })}
                      onDone={() => { setModal({ kind: "none" }); showToast("Knowledge Base sudah diperbarui & langsung dipakai AI", "success"); }} />
      )}
      {modal.kind === "preview" && (
        <KbPreviewModal title={modal.title} content={modal.content} onClose={() => setModal({ kind: "none" })} />
      )}
      <KbToast toast={toast} />
    </div>
  );
}
