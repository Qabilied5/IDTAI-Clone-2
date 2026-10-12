"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CirclePlus, RefreshCw, SquarePen, X } from "lucide-react";

import { TYPE_OPTIONS } from "@/lib/pipeline";
import type { DealType, NewPipelineDeal, PipelineDeal, PipelineStage } from "@/types/pipeline";

import { PlIcon } from "./PlIcon";

interface Props {
  stages: PipelineStage[];
  /** Deal yang diedit; null = tambah baru. */
  deal: PipelineDeal | null;
  defaultStage?: string;
  /** Pilihan PIC (daftar bawaan + PIC yang sudah dipakai deal). */
  picValues: string[];
  picLabelOf: (v: string) => string;
  onClose: () => void;
  onSubmit: (values: NewPipelineDeal) => Promise<void>;
}

/* Hanya dirender saat terbuka (dengan key) → state form otomatis ter-reset tiap dibuka. */
export function DealFormModal({ stages, deal, defaultStage, picValues, picLabelOf, onClose, onSubmit }: Props) {
  const isEdit = !!deal;
  const [company, setCompany] = useState(deal?.company ?? "");
  const [contactName, setContactName] = useState(deal?.contactName ?? "");
  const [product, setProduct] = useState(deal?.product ?? "");
  const [value, setValue] = useState(deal ? String(deal.value) : "");
  const [stage, setStage] = useState(deal?.stage ?? defaultStage ?? stages[0]?.id ?? "");
  const [type, setType] = useState<DealType>(deal?.type ?? "baru");
  const [pic, setPic] = useState(deal?.pic ?? "");
  const [recurring, setRecurring] = useState(deal?.recurring ?? false);
  const [interval, setInterval] = useState(deal?.interval ?? "bulanan");
  const [endDate, setEndDate] = useState(deal?.endDate ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!company.trim()) {
      setError("Nama perusahaan wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        company: company.trim(),
        contactName: contactName.trim(),
        product: product.trim(),
        value: Number(value.replace(/[^0-9]/g, "")) || 0,
        stage,
        type,
        pic,
        recurring,
        interval: recurring ? interval : null,
        endDate: recurring && endDate ? endDate : null,
        date: deal?.date ?? new Date().toISOString().slice(0, 10),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan deal.");
      setSaving(false);
    }
  }

  const toggleKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="pl-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit Deal" : "Tambah Deal Baru"}>
        <div className="pl-modal-head">
          <div className="pl-modal-title">
            <PlIcon icon={isEdit ? SquarePen : CirclePlus} />
            <span>{isEdit ? "Edit Deal" : "Tambah Deal Baru"}</span>
          </div>
          <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Tutup">
            <PlIcon icon={X} />
          </button>
        </div>

        <div className="pl-modal-body">
          <div className="pl-form-section-title">Informasi Deal</div>

          <div className="pl-form-row">
            <div className="pl-field">
              <label htmlFor="pl-f-company">Perusahaan *</label>
              <input id="pl-f-company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="cth. PT Sumber Makmur" autoFocus />
            </div>
            <div className="pl-field">
              <label htmlFor="pl-f-contact">Nama Kontak</label>
              <input id="pl-f-contact" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="cth. Budi Santoso" />
            </div>
          </div>

          <div className="pl-field">
            <label htmlFor="pl-f-product">Produk / Layanan</label>
            <input id="pl-f-product" type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="cth. Jasa Maintenance, Mesin Packing X200" />
          </div>

          <div className="pl-form-row">
            <div className="pl-field">
              <label htmlFor="pl-f-value">Nilai Deal (Rp)</label>
              <input id="pl-f-value" type="text" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </div>
            <div className="pl-field">
              <label htmlFor="pl-f-stage">Stage</label>
              <select id="pl-f-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pl-form-row">
            <div className="pl-field">
              <label htmlFor="pl-f-type">Tipe Deal</label>
              <select id="pl-f-type" value={type} onChange={(e) => setType(e.target.value as DealType)}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pl-field">
              <label htmlFor="pl-f-pic">PIC</label>
              <select id="pl-f-pic" value={pic} onChange={(e) => setPic(e.target.value)}>
                <option value="">Belum ditentukan</option>
                {picValues.map((v) => (
                  <option key={v} value={v}>
                    {picLabelOf(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pl-field">
            <label htmlFor="pl-f-notes">Catatan</label>
            <textarea id="pl-f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan tentang deal ini..." />
          </div>

          <div className="pl-form-divider" />

          <div
            className={`pl-toggle-row${recurring ? " active" : ""}`}
            role="switch"
            aria-checked={recurring}
            tabIndex={0}
            onClick={() => setRecurring((v) => !v)}
            onKeyDown={(e) => toggleKey(e, () => setRecurring((v) => !v))}
          >
            <div className="pl-toggle-info">
              <div className="pl-toggle-lbl">Ini kontrak berulang?</div>
              <div className="pl-toggle-sub">Aktifkan untuk bisnis jasa, SaaS, atau subscription</div>
            </div>
            <div className="pl-toggle-sw" />
          </div>

          {recurring && (
            <div className="pl-recurring-fields visible">
              <div className="pl-recurring-title">
                <PlIcon icon={RefreshCw} /> Detail Kontrak Berulang
              </div>
              <div className="pl-form-row">
                <div className="pl-field">
                  <label htmlFor="pl-f-interval">Interval</label>
                  <select id="pl-f-interval" value={interval} onChange={(e) => setInterval(e.target.value)}>
                    <option value="bulanan">Bulanan</option>
                    <option value="kuartalan">Kuartalan</option>
                    <option value="tahunan">Tahunan</option>
                  </select>
                </div>
                <div className="pl-field">
                  <label htmlFor="pl-f-end-date">Tanggal Berakhir Kontrak</label>
                  <input id="pl-f-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        <div className="pl-modal-foot">
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={submit} disabled={saving}>
            <PlIcon icon={CircleCheck} /> {saving ? "Menyimpan..." : "Simpan Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}
