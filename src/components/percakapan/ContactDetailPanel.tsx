"use client";

import { useState } from "react";
import { Building2, Mail, MapPin, Phone, Plus } from "lucide-react";

import type { Conversation, ContactProfile } from "@/types/conversation";
import { getInitials } from "@/lib/overview";

interface ContactDetailPanelProps {
  conversation: Conversation;
  profile: ContactProfile;
}

const LEAD_TEMPERATURE_CONFIG: Record<ContactProfile["leadTemperature"], { label: string; className: string }> = {
  hot: { label: "Lead Hot", className: "bg-accent-soft text-accent" },
  warm: { label: "Lead Warm", className: "bg-amber-50 text-amber-700" },
  cold: { label: "Lead Cold", className: "bg-neutral-100 text-neutral-600" },
};

export function ContactDetailPanel({ conversation, profile }: ContactDetailPanelProps) {
  const [notes, setNotes] = useState(profile.agentNotes ?? "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const leadCfg = LEAD_TEMPERATURE_CONFIG[profile.leadTemperature];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded-[10px] border border-border bg-canvas p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {getInitials(conversation.name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{conversation.name}</div>
          <div className="truncate text-[11px] text-muted">{profile.company}</div>
        </div>
      </div>

      <span
        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${leadCfg.className}`}
      >
        {leadCfg.label}
      </span>

      <div className="border-t border-border pt-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Informasi Kontak
        </div>
        <div className="flex flex-col gap-2 text-xs text-ink">
          {conversation.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
              {conversation.phone}
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate">{profile.email}</span>
            </div>
          )}
          {profile.company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate">{profile.company}</span>
            </div>
          )}
          {profile.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
              {profile.city}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Statistik Interaksi
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-panel px-2 py-2">
            <div className="text-sm font-bold text-ink">{profile.stats.conversationCount}</div>
            <div className="text-[10px] text-muted">Percakapan</div>
          </div>
          <div className="rounded-lg bg-panel px-2 py-2">
            <div className="text-sm font-bold text-ink">{profile.stats.orderCount}</div>
            <div className="text-[10px] text-muted">Order</div>
          </div>
          <div className="rounded-lg bg-panel px-2 py-2">
            <div className="text-sm font-bold text-ink">{profile.stats.totalSpend}</div>
            <div className="text-[10px] text-muted">Total Belanja</div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Riwayat Percakapan
        </div>
        <div className="flex flex-col gap-2">
          {profile.history.map((h, i) => (
            <div key={i} className="text-xs">
              <div className="text-ink">{h.label}</div>
              <div className="text-[10.5px] text-muted">
                {h.date} · {h.by}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Catatan Agen
          </span>
          {!isEditingNotes && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
            >
              <Plus className="h-3 w-3" /> Tambah
            </button>
          )}
        </div>
        {isEditingNotes ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border p-2 text-xs text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setIsEditingNotes(false)}
              className="self-end rounded-[7px] bg-accent px-3 py-1 text-[11px] font-semibold text-canvas hover:bg-accent-strong"
            >
              Simpan
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink">{notes || "Belum ada catatan."}</p>
        )}
      </div>
    </div>
  );
}
