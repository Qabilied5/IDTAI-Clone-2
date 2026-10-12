"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface InvoiceModalProps {
  contactName: string;
  invoiceNumber: string;
  product: string;
  subtotal: string;
  shipping: string;
  total: string;
  onClose: () => void;
  onSend: (channel: "whatsapp" | "email") => void;
}

export function InvoiceModal({
  contactName,
  invoiceNumber,
  product,
  subtotal,
  shipping,
  total,
  onClose,
  onSend,
}: InvoiceModalProps) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[10px] bg-canvas p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Kirim Invoice</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-panel p-3 text-xs">
          <div className="mb-2 font-semibold text-ink">Invoice #{invoiceNumber}</div>
          <dl className="flex flex-col gap-1.5 text-neutral-600">
            <div className="flex justify-between">
              <dt>Kepada</dt>
              <dd className="font-medium text-ink">{contactName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Produk</dt>
              <dd className="text-right font-medium text-ink">{product}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium text-ink">{subtotal}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ongkir</dt>
              <dd className="font-medium text-ink">{shipping}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1.5 text-sm font-bold text-ink">
              <dt>Total</dt>
              <dd>{total}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-ink">Kirim via</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 rounded-[7px] border px-3 py-2 text-xs font-semibold transition-colors ${
                channel === "whatsapp"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink hover:bg-panel"
              }`}
            >
              WhatsApp ({contactName})
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex-1 rounded-[7px] border px-3 py-2 text-xs font-semibold transition-colors ${
                channel === "email"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink hover:bg-panel"
              }`}
            >
              Email
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[7px] border border-border px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-panel"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSend(channel)}
            className="rounded-[7px] bg-accent px-3.5 py-1.5 text-xs font-semibold text-canvas hover:bg-accent-strong"
          >
            Kirim Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
