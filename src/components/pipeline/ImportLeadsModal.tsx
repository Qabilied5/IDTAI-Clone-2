"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search, Table2, X } from "lucide-react";

import { KATEGORI_LABEL, STATUS_LABEL } from "@/lib/leads";
import { formatRupiah } from "@/lib/pipeline";
import {
  RawNotSupportedError,
  SheetNotConnectedError,
  colLetter,
  distinctColumnValues,
  fetchLeadsFromSheet,
  fetchRawSheet,
  findKeyColumns,
  getStageColumn,
  guessStageColumn,
  leadToDealInput,
  resolveStageColumn,
  saveStageColumn,
  stageInfoByLead,
  type RawSheet,
} from "@/lib/pipeline-sheet";
import type { Lead, LeadKategori } from "@/types/lead";
import type { ImportLeadsOptions, ImportLeadsResult, LeadDealInput, PipelineStage } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";
import "./pipeline-leads.css";

interface Props {
  stages: PipelineStage[];
  /** leadId yang sudah punya deal di pipeline. */
  existingLeadIds: Set<number>;
  onClose: () => void;
  onImport: (inputs: LeadDealInput[], options: ImportLeadsOptions) => Promise<ImportLeadsResult>;
}

type Load =
  | { state: "loading" }
  | { state: "no-sheet" }
  | { state: "error"; message: string }
  | { state: "ready"; leads: Lead[]; raw: RawSheet | null; rawError: string | null };

type KatFilter = "semua" | LeadKategori;

export function ImportLeadsModal({ stages, existingLeadIds, onClose, onImport }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [kat, setKat] = useState<KatFilter>("semua");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [stageCol, setStageCol] = useState(-1);
  const [createMissing, setCreateMissing] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const leads = await fetchLeadsFromSheet();
        let raw: RawSheet | null = null;
        let rawError: string | null = null;
        try {
          raw = await fetchRawSheet();
        } catch (err) {
          rawError = err instanceof RawNotSupportedError || err instanceof Error ? err.message : "Gagal membaca kolom Sheet.";
        }
        if (!alive) return;
        if (raw) {
          const saved = resolveStageColumn(raw.headers, getStageColumn());
          setStageCol(saved !== -1 ? saved : guessStageColumn(raw.headers));
        }
        setLoad({ state: "ready", leads, raw, rawError });
      } catch (err) {
        if (!alive) return;
        setLoad(err instanceof SheetNotConnectedError ? { state: "no-sheet" } : { state: "error", message: err instanceof Error ? err.message : "Gagal memuat leads." });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const leads = load.state === "ready" ? load.leads : [];
  const raw = load.state === "ready" ? load.raw : null;

  const pickColumn = (idx: number) => {
    setStageCol(idx);
    if (!raw) return;
    saveStageColumn(idx === -1 ? null : { index: idx, header: raw.headers[idx], keyIndex: findKeyColumns(raw.headers).nama });
  };

  /** Stage tiap lead menurut kolom terpilih (atau kolom "Pipeline Stage" bawaan bila kolom belum dipilih). */
  const stageInfo = useMemo(() => (raw ? stageInfoByLead(leads, raw, stageCol) : new Map()), [leads, raw, stageCol]);
  const stageOf = (l: Lead) => (stageCol !== -1 && raw ? stageInfo.get(l.id)?.stage ?? "" : l.pipelineStage ?? "");

  const values = useMemo(() => (raw ? distinctColumnValues(raw, stageCol) : []), [raw, stageCol]);
  const isKnownStage = (v: string) => stages.some((s) => s.id.toLowerCase() === v.toLowerCase() || s.label.toLowerCase() === v.toLowerCase());
  const newStageCount = values.filter(([v]) => !isKnownStage(v)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (kat !== "semua" && l.kategori !== kat) return false;
      if (!q) return true;
      return [l.nama, l.perusahaan, l.tipeLayanan ?? "", l.kota].join(" ").toLowerCase().includes(q);
    });
  }, [leads, kat, query]);

  const selectable = visible.filter((l) => !existingLeadIds.has(l.id));
  const allPicked = selectable.length > 0 && selectable.every((l) => picked.has(l.id));
  const linkedCount = leads.filter((l) => existingLeadIds.has(l.id)).length;
  const canSync = updateExisting && linkedCount > 0;
  const canSubmit = picked.size > 0 || canSync;

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      selectable.forEach((l) => (allPicked ? next.delete(l.id) : next.add(l.id)));
      return next;
    });

  async function submit() {
    if (load.state !== "ready" || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const chosen = leads.filter((l) => picked.has(l.id) || (updateExisting && existingLeadIds.has(l.id)));
      const inputs = chosen.map((l) => leadToDealInput(l, stageCol !== -1 && raw ? stageInfo.get(l.id) : undefined));
      await onImport(inputs, { createMissingStages: createMissing, updateExisting });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengimpor lead.");
      setSaving(false);
    }
  }

  return (
    <div className="pl-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal pl-imp-modal" role="dialog" aria-modal="true" aria-label="Import dari Leads">
        <div className="pl-modal-head">
          <div className="pl-modal-title">
            <PlIcon icon={Table2} />
            <span>Import dari Kontak / Leads</span>
          </div>
          <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Tutup">
            <PlIcon icon={X} />
          </button>
        </div>

        <div className="pl-modal-body">
          {load.state === "loading" && <div className="pl-imp-state">Memuat leads dari Google Sheet...</div>}

          {load.state === "no-sheet" && (
            <div className="pl-imp-state">
              Google Sheet belum terhubung.
              <br />
              Hubungkan dulu lewat tombol <b>Import Data</b> di halaman <Link href="/kontak-leads">Kontak / Leads</Link>, lalu kembali ke sini.
            </div>
          )}

          {load.state === "error" && <div className="pl-imp-state">{load.message}</div>}

          {load.state === "ready" && (
            <>
              <div className="pl-imp-config">
                <div className="pl-field">
                  <label htmlFor="pl-imp-col">Kolom Sheet untuk Pipeline Stage</label>
                  <select id="pl-imp-col" value={stageCol} onChange={(e) => pickColumn(Number(e.target.value))} disabled={!raw}>
                    <option value={-1}>— Pakai kolom “Pipeline Stage” bawaan —</option>
                    {raw?.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {colLetter(i)} — {h || "(tanpa judul)"}
                      </option>
                    ))}
                  </select>
                </div>

                {load.rawError && <div className="pl-imp-warn">{load.rawError}</div>}

                {raw && stageCol !== -1 && (
                  <div className="pl-imp-values" aria-label="Nilai unik kolom">
                    {values.length === 0 && <span className="pl-imp-sub">Kolom ini masih kosong.</span>}
                    {values.map(([v, n]) => (
                      <span key={v} className={`pl-imp-val${isKnownStage(v) ? "" : " new"}`} title={isKnownStage(v) ? "Stage sudah ada" : "Stage baru"}>
                        {v} <b>{n}</b>
                      </span>
                    ))}
                  </div>
                )}

                <label className="pl-imp-check">
                  <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
                  <span>
                    Buat stage otomatis dari nilai kolom{newStageCount > 0 ? ` (${newStageCount} stage baru)` : ""}
                  </span>
                </label>
                <label className="pl-imp-check">
                  <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} disabled={linkedCount === 0} />
                  <span>Sinkronkan stage {linkedCount} deal yang sudah ada dari Sheet</span>
                </label>
              </div>

              <div className="pl-imp-tools">
                <div className="pl-search-wrap">
                  <PlIcon icon={Search} />
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, perusahaan, layanan..." aria-label="Cari lead" />
                </div>
                <div className="pl-imp-chips">
                  {(["semua", "real", "potensi", "belum"] as KatFilter[]).map((k) => (
                    <button key={k} type="button" className={`pl-imp-chip${kat === k ? " active" : ""}`} onClick={() => setKat(k)}>
                      {k === "semua" ? "Semua" : KATEGORI_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pl-imp-list">
                <label className="pl-imp-head">
                  <input type="checkbox" checked={allPicked} onChange={toggleAll} disabled={selectable.length === 0} aria-label="Pilih semua" />
                  <span>{visible.length} lead</span>
                  <span>Stage · Estimasi</span>
                </label>
                {visible.length === 0 && <div className="pl-imp-state">Tidak ada lead yang cocok.</div>}
                {visible.map((l) => {
                  const done = existingLeadIds.has(l.id);
                  const st = stageOf(l);
                  return (
                    <label key={l.id} className={`pl-imp-row${done ? " disabled" : ""}`}>
                      <input type="checkbox" checked={done || picked.has(l.id)} disabled={done} onChange={() => toggle(l.id)} />
                      <div>
                        <div className="pl-imp-name">{l.perusahaan || l.nama}</div>
                        <div className="pl-imp-sub">
                          {l.perusahaan ? `${l.nama} · ` : ""}
                          {l.tipeLayanan || "—"} · {STATUS_LABEL[l.status]}
                        </div>
                      </div>
                      <div className="pl-imp-meta">
                        {done && <div className="pl-imp-done">Sudah di pipeline</div>}
                        <div>
                          <span className="pl-imp-stage">{st || "—"}</span> · {formatRupiah(Number(l.estimasiNominal) || 0)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {error && (
            <div role="alert" style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        <div className="pl-modal-foot">
          <span className="pl-imp-foot-info">Stage kosong di Sheet → masuk stage pertama.</span>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={submit} disabled={saving || !canSubmit}>
            <PlIcon icon={Check} />{" "}
            {saving ? "Memproses..." : picked.size > 0 ? `Import ${picked.size} Lead` : `Sinkronkan ${linkedCount} Deal`}
          </button>
        </div>
      </div>
    </div>
  );
}
