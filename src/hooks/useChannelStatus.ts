"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { TelegramStatus, WabaStatus } from "@/types/integration";

interface UseChannelStatusOptions {
  pollIntervalMs?: number;
}

/**
 * Gabungan dari GET /api/telegram/status dan GET /api/waba/status pada
 * backend Express (server.js) yang sudah ada -- dulunya loadChannelStatus()
 * di overview.js. Dipakai oleh widget "Status Koneksi Channel" dan ikut
 * menghitung berapa channel yang terhubung untuk banner "Ringkasan Hari Ini".
 */
export function useChannelStatus({ pollIntervalMs = 8000 }: UseChannelStatusOptions = {}) {
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [waba, setWaba] = useState<WabaStatus | null>(null);
  const [telegramError, setTelegramError] = useState(false);
  const [wabaError, setWabaError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [tgRes, wbRes] = await Promise.allSettled([
        apiFetch<TelegramStatus>("/telegram/status"),
        apiFetch<WabaStatus>("/waba/status"),
      ]);

      if (cancelled) return;

      if (tgRes.status === "fulfilled") {
        setTelegram(tgRes.value);
        setTelegramError(false);
      } else {
        setTelegramError(true);
      }

      if (wbRes.status === "fulfilled") {
        setWaba(wbRes.value);
        setWabaError(false);
      } else {
        setWabaError(true);
      }

      setIsLoading(false);
    }

    load();
    const id = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  const isTelegramOnline = Boolean(telegram?.configured && telegram?.polling);
  const isWabaOnline = Boolean(waba?.configured);
  const onlineCount = (isTelegramOnline ? 1 : 0) + (isWabaOnline ? 1 : 0);

  return {
    telegram,
    waba,
    telegramError,
    wabaError,
    isLoading,
    isTelegramOnline,
    isWabaOnline,
    onlineCount,
  };
}
