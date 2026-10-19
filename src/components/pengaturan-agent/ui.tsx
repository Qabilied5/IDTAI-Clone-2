"use client";

import type { ReactNode } from "react";
import { Check, Loader2, Save, X } from "lucide-react";

import { usePengaturanAgent } from "@/hooks/usePengaturanAgent";

/* ── Switch (toggle) ─────────────────────────────────────────── */
export function PaSwitch({
  checked,
  onChange,
  label,
  className = "",
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`pa-switch ${className}`.trim()}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pa-switch-track" />
      <span className="pa-switch-thumb" />
    </label>
  );
}

/* ── Baris toggle: judul + deskripsi + switch ─────────────────── */
export function PaToggleRow({
  label,
  desc,
  checked,
  onChange,
  children,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="pa-toggle-row">
      <div className="pa-toggle-info">
        <div className="pa-toggle-label">{label}</div>
        {desc && <div className="pa-toggle-desc">{desc}</div>}
        {children}
      </div>
      <PaSwitch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */
export function PaCard({
  icon,
  title,
  subtitle,
  action,
  children,
  flush,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** true = tanpa padding body (untuk tabel) */
  flush?: boolean;
}) {
  return (
    <div className="pa-card">
      <div className="pa-card-header">
        <div className="pa-card-title">
          {icon} {title}
          {subtitle && <span className="pa-card-subtitle">— {subtitle}</span>}
        </div>
        {action}
      </div>
      {flush ? children : <div className="pa-card-body">{children}</div>}
    </div>
  );
}

/* ── Header halaman + tombol Batal/Simpan ─────────────────────── */
export function PaPageHeader({
  title,
  desc,
  showDiscard,
  actions,
}: {
  title: string;
  desc: string;
  /** tampilkan tombol Batal (hanya halaman Persona di referensi) */
  showDiscard?: boolean;
  /** tombol khusus halaman (mis. Undang Agent). Jika diisi, tombol Simpan bawaan tidak ditampilkan. */
  actions?: ReactNode;
}) {
  const { save, discard, dirty, saving, justSaved } = usePengaturanAgent();
  return (
    <div className="pa-page-header">
      <div>
        <div className="pa-page-title">{title}</div>
        <div className="pa-page-desc">{desc}</div>
      </div>
      <div className="pa-page-actions">
        {actions ?? (
          <>
            {showDiscard && (
              <button type="button" className="pa-btn pa-btn-ghost" onClick={discard} disabled={!dirty || saving}>
                <X /> Batal
              </button>
            )}
            <button type="button" className="pa-btn pa-btn-primary" onClick={save} disabled={saving}>
              {saving ? (
                <><Loader2 className="pa-spin" /> Menyimpan...</>
              ) : justSaved ? (
                <><Check /> Tersimpan</>
              ) : (
                <><Save /> {showDiscard ? "Simpan Perubahan" : "Simpan"}</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Bar "ada perubahan belum disimpan" (sticky di bawah konten) ── */
export function PaSaveBar() {
  const { dirty, discard, save, saving } = usePengaturanAgent();
  if (!dirty) return null;
  return (
    <div className="pa-save-bar" role="status">
      <div className="pa-save-info">Ada perubahan yang belum disimpan</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="pa-btn pa-btn-ghost" onClick={discard} disabled={saving}>
          Batalkan
        </button>
        <button type="button" className="pa-btn pa-btn-primary" onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="pa-spin" /> Menyimpan...</> : <><Save /> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  );
}

/* ── Toast ────────────────────────────────────────────────────── */
export function PaToast() {
  const { toastState } = usePengaturanAgent();
  if (!toastState) return null;
  return (
    <div key={toastState.id} className={`pa-toast${toastState.type ? " " + toastState.type : ""}`} role="status">
      {toastState.msg}
    </div>
  );
}
