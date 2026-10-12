"use client";

import { useEffect, useState } from "react";
import { Check, Kanban, X } from "lucide-react";

import { PlIcon } from "./PlIcon";

export function AddStageModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (label: string) => Promise<void> }) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!label.trim()) {
      setError("Nama stage wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(label.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah stage.");
      setSaving(false);
    }
  }

  return (
    <div className="pl-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal" style={{ maxWidth: 420 }} role="dialog" aria-modal="true" aria-label="Tambah Stage Baru">
        <div className="pl-modal-head">
          <div className="pl-modal-title">
            <PlIcon icon={Kanban} />
            <span>Tambah Stage Baru</span>
          </div>
          <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Tutup">
            <PlIcon icon={X} />
          </button>
        </div>

        <div className="pl-modal-body">
          <div className="pl-field">
            <label htmlFor="pl-stage-f-name">Nama Stage</label>
            <input
              id="pl-stage-f-name"
              type="text"
              value={label}
              maxLength={30}
              autoFocus
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="cth. Survey Lokasi, Follow Up, dll"
            />
          </div>
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
            <PlIcon icon={Check} /> {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
