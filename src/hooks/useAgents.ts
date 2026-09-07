"use client";

import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import type { Agent } from "@/types/agent";

interface AgentsResponse {
  ok: boolean;
  agents: Agent[];
}

interface UseAgentsOptions {
  pollIntervalMs?: number;
}

export function useAgents({ pollIntervalMs = 8000 }: UseAgentsOptions = {}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<AgentsResponse>("/agents");
        if (cancelled) return;
        setAgents(data.ok ? data.agents : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Gagal memuat data agent.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const id = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  return { agents, isLoading, error, onlineCount: agents.filter((a) => a.status === "online").length };
}
