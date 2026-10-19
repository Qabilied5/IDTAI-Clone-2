"use client";

import { useCallback, useEffect, useState } from "react";

import { kbApi } from "@/lib/knowledge-base-api";
import type { KbDoc } from "@/types/knowledge-base";

/** Daftar dokumen Knowledge Base milik perusahaan yang sedang login. */
export function useKnowledgeBase() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocs(await kbApi.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { docs, loading, error, refresh };
}
