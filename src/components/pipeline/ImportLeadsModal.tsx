"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search, Table2, X } from "lucide-react";

import { KATEGORI_LABEL, STATUS_LABEL } from "@/lib/leads";
import { formatRupiah } from "@/lib/pipeline";
import { SheetNotConnectedError, fetchLeadsFromSheet, leadToDealInput } from "@/lib/pipeline-sheet";
import type { Lead, LeadKategori } from "@/types/lead";
import type { LeadDealInput } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";
import "./pipeline-leads.css";

interface Props {
  /** leadId yang sudah punya deal di pipeline. */
  existingLeadIds: Set<number>;
  onClose: () => void;
  onImport: (inputs: LeadDealInput[]) => Promise<{ created: number; skipped: number }>;
}

type Load =
  | { state: "loading" }
  | { state: "no-sheet" }
  | { state: "error"; message: string }
  | { state: "ready"; leads: Lead[] };

type KatFilter = "semua" | LeadKategori;

export function ImportLeadsModal({ existingLeadIds, onClose, onImport }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [kat, setKat] = useState<KatFilter>("semua");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    fetchLeadsFromSheet()
      .then((leads) => alive && setLoad({ state: "ready", leads }))
      .catch((err) => {
        if (!alive) return;
        setLoad(err instanceof SheetNotConnectedError ? { state: "no-sheet" } : { state: "error", message: err instanceof Error ? err.message : "Gagal memuat leads." });
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    if (load.state !== "ready") return [];
    const q = query.trim().toLowerCase();
    return load.leads.filter((l) => {
      if (kat !== "semua" && l.kategori !== kat) return false;
      if (!q) return true;
      return [l.nama, l.perusahaan, l.tipeLayanan ?? "", l.kota].join(" ").toLowerCase().includes(q);
    });
  }, [load, kat, query]);

  const selectable = visible.filter((l) => !existingLeadIds.has(l.id));
  const allPicked = selectable.length > 0 && selectable.every((l) => picked.has(l.id));

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
    if (load.state !== "ready" || picked.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const inputs = load.leads.filter((l) => picked.has(l.id)).map(leadToDealInput);
      await onImport(inputs);
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
                  <span>Estimasi</span>
                </label>
                {visible.length === 0 && <div className="pl-imp-state">Tidak ada lead yang cocok.</div>}
                {visible.map((l) => {
                  const done = existingLeadIds.has(l.id);
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
                        {done ? <span className="pl-imp-done">Sudah di pipeline</span> : formatRupiah(Number(l.estimasiNominal) || 0)}
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
          <span className="pl-imp-foot-info">Stage mengikuti kolom “Pipeline Stage”; kosong → stage pertama.</span>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={submit} disabled={saving || picked.size === 0}>
            <PlIcon icon={Check} /> {saving ? "Mengimpor..." : `Import ${picked.size || ""} Lead`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
