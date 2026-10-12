"use client";

import Link from "next/link";
import { Moon } from "lucide-react";

import type { Agent } from "@/types/agent";
import { getInitials } from "@/lib/overview";

interface AgentsOnlineProps {
  agents: Agent[];
  isLoading?: boolean;
  error?: string | null; 
}

export function AgentsOnline({ agents, isLoading, error }: AgentsOnlineProps) {
  const online = agents.filter((a) => a.status === "online");

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Agent Manusia Online</div>
        <Link
          href="/pengaturan-agent"
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Kelola
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted">Memuat agent…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-6 text-xs text-danger">{error}</div>
      ) : online.length === 0 ? (
        <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted">
          <Moon className="h-4 w-4" /> Tidak ada agent yang online saat ini.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {online.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
            >
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {agent.initials || getInitials(agent.nama)}
              </div>
              <div className="min-w-0 flex-1 text-xs font-semibold text-ink">
                {agent.nama}{" "}
                <span className="font-normal text-muted">&middot; {agent.role || "agent"}</span>
              </div>
              <div className="shrink-0 rounded-full border border-border bg-panel px-2 py-[3px] text-[10px] font-semibold text-muted">
                {agent.chat || 0} chat
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
