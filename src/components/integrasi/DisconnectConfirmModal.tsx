"use client";

import { AlertTriangle, PlugZap, X } from "lucide-react";

export function DisconnectConfirmModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-bold text-danger">
            <PlugZap className="h-4 w-4" /> Putuskan Koneksi
          </div>
          <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-ink">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-neutral-600">
            Apakah Anda yakin ingin memutuskan koneksi <strong className="text-ink">{name}</strong>?
            AI Agent tidak akan bisa menerima atau mengirim pesan melalui channel ini.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Semua konfigurasi akan dihapus dan harus diatur ulang jika ingin terhubung kembali.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <PlugZap className="h-3.5 w-3.5" /> Ya, Putuskan
          </button>
        </div>
      </div>
    </div>
  );
}
