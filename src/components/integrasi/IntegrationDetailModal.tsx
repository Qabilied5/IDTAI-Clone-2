"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { Integration } from "@/types/integration";

const STATUS_CFG: Record<Integration["status"], { label: string; className: string }> = {
  connected: { label: "Terhubung", className: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Menunggu", className: "bg-amber-50 text-amber-700" },
  disconnected: { label: "Belum Terhubung", className: "bg-neutral-100 text-neutral-500" },
};

const CATEGORY_LABEL: Record<Integration["category"], string> = {
  messaging: "Pesan",
  crm: "CRM",
  ecommerce: "E-Commerce",
  payment: "Pembayaran",
  tools: "Tools",
};

export function IntegrationDetailModal({
  integration,
  onClose,
  onConnect,
  onDisconnect,
  isBusy = false,
  errorMessage = null,
}: {
  integration: Integration;
  onClose: () => void;
  onConnect: (id: string, values: Record<string, string>) => void;
  onDisconnect: () => void;
  isBusy?: boolean;
  errorMessage?: string | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const status = STATUS_CFG[integration.status];
  const isConnected = integration.status === "connected";

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-xl">
              {integration.emoji}
            </span>
            <div>
              <div className="text-sm font-bold text-ink">{integration.name}</div>
              <div className="text-[11px] text-neutral-400">{CATEGORY_LABEL[integration.category]}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-ink">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Row label="Status">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
              {status.label}
            </span>
          </Row>

          <Row label="Tentang">
            <p className="text-xs leading-relaxed text-neutral-600">{integration.description}</p>
          </Row>

          {!isConnected && integration.configFields && (
            <div className="mb-4 rounded-xl border border-neutral-200 p-3.5">
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Konfigurasi
              </div>
              <div className="flex flex-col gap-2.5">
                {integration.configFields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-danger">
              {errorMessage}
            </div>
          )}

          {isConnected && integration.connectedInfo && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs">
              <InfoRow label="Akun" value={integration.connectedInfo.account} />
              <InfoRow label="Terhubung sejak" value={integration.connectedInfo.since} />
              <InfoRow label="Pesan terproses" value={integration.connectedInfo.messages} />
              <InfoRow label="Status terakhir" value={integration.connectedInfo.lastStatus} />
            </div>
          )}

          <Row label="Fitur">
            <div className="flex flex-wrap gap-1.5">
              {integration.features.map((f) => (
                <span key={f} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10.5px] text-neutral-600">
                  {f}
                </span>
              ))}
            </div>
          </Row>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
          >
            Tutup
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isBusy}
              className="rounded-lg bg-danger disabled:opacity-60 px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Putuskan Koneksi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConnect(integration.id, values)}
              disabled={isBusy}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
            >
              {isBusy ? "Memvalidasi..." : "Hubungkan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
