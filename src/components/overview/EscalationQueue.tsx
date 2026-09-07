"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";

import type { Conversation } from "@/types/conversation";
import {
  ESCALATION_REASON_CONFIG,
  classifyEscalationReason,
  getInitials,
  getWaitMinutes,
} from "@/lib/overview";
import { IconTelegram, IconWhatsapp } from "./channel-icons";

interface EscalationQueueProps {
  conversations: Conversation[];
  isLoading?: boolean;
}

export function EscalationQueue({ conversations, isLoading }: EscalationQueueProps) {
  const escalations = conversations
    .filter((c) => c.escalated)
    .map((c) => ({
      ...c,
      reason: classifyEscalationReason(c.escalationReason),
      waitMinutes: getWaitMinutes(c.escalatedAt),
    }))
    .sort((a, b) => b.waitMinutes - a.waitMinutes);

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Antrean Eskalasi ke Human Agent</div>
        <Link
          href="/percakapan"
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Lihat Semua
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted">
          Memuat antrean eskalasi…
        </div>
      ) : escalations.length === 0 ? (
        <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted">
          <CircleCheck className="h-4 w-4" /> Tidak ada antrean eskalasi saat ini.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {escalations.map((e) => {
            const cfg = ESCALATION_REASON_CONFIG[e.reason];
            const ChannelIcon = e.channel === "telegram" ? IconTelegram : IconWhatsapp;

            return (
              <div
                key={e.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
              >
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                  {getInitials(e.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    {e.name}
                    <ChannelIcon className="h-3 w-3 text-muted" />
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted">
                    Menunggu {e.waitMinutes} menit
                  </div>
                </div>
                <div
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-semibold ${cfg.className}`}
                  title={e.escalationReason || cfg.label}
                >
                  {cfg.label}
                </div>
                <Link
                  href="/percakapan"
                  className="shrink-0 rounded-[7px] bg-accent px-3 py-1.5 text-[11px] font-semibold text-canvas transition-colors hover:bg-accent-strong"
                >
                  Tangani
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
