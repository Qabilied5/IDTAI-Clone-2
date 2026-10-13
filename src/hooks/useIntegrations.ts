"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import { INTEGRATIONS_CATALOG } from "@/lib/integrations";
import { calendlyClearStored, calendlySaveStored } from "@/lib/calendly-config";
import type {
  CalendlyConfigResponse, CalendlyStatus, Integration, TelegramStatus, WabaStatus,
} from "@/types/integration";

/** Integrasi yang punya backend sungguhan (Route Handler port dari server.js). */
const BACKEND_CONFIG_PATH: Record<string, string> = {
  telegram: "/telegram/config",
  whatsapp: "/waba/config",
  calendly: "/calendly/config",
};

/**
 * Status Telegram & WABA diambil dari GET /api/telegram/status dan
 * GET /api/waba/status; connect/disconnect memanggil POST/DELETE
 * /api/{telegram|waba}/config — port dari telegram-token.js & waba-token.js
 * versi vanilla. Integrasi lain di katalog masih ubah state lokal saja.
 */
export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_CATALOG);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [tg, wb, cal] = await Promise.all([
      apiFetch<TelegramStatus>("/telegram/status").catch(() => null),
      apiFetch<WabaStatus>("/waba/status").catch(() => null),
      apiFetch<CalendlyStatus>("/calendly/status").catch(() => null),
    ]);

    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === "telegram" && tg) {
          return {
            ...item,
            status: tg.configured && tg.polling ? "connected" : tg.configured ? "pending" : "disconnected",
            connectedInfo: tg.configured
              ? {
                  account: tg.bot?.username ? `@${tg.bot.username}` : "-",
                  since: "-",
                  messages: "-",
                  lastStatus: tg.polling ? "Polling aktif" : "Polling berhenti",
                }
              : undefined,
          };
        }
        if (item.id === "whatsapp" && wb) {
          return {
            ...item,
            status: wb.configured ? "connected" : "disconnected",
            connectedInfo: wb.configured
              ? {
                  account: wb.bot?.display_phone_number
                    ? `${wb.bot.display_phone_number}${wb.bot.verified_name ? ` (${wb.bot.verified_name})` : ""}`
                    : "-",
                  since: "-",
                  messages: "-",
                  lastStatus: "Aktif — webhook /api/waba/webhook",
                }
              : undefined,
          };
        }
        if (item.id === "calendly" && cal) {
          const et = cal.eventType;
          return {
            ...item,
            status: cal.configured ? "connected" : "disconnected",
            connectedInfo: cal.configured
              ? {
                  account: cal.user?.email ? `${cal.user.name || "-"} (${cal.user.email})` : cal.user?.name || "-",
                  since: "-",
                  messages: "-",
                  lastStatus: "Aktif \u2014 slot & booking via Calendly API",
                  extra: et?.name
                    ? [{ label: "Event type", value: `${et.name}${et.duration ? ` \u00b7 ${et.duration} menit` : ""}` }]
                    : undefined,
                }
              : undefined,
          };
        }
        return item;
      })
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Kembalikan pesan error (string) kalau gagal, null kalau sukses. */
  const connect = useCallback(
    async (id: string, values: Record<string, string>): Promise<string | null> => {
      const path = BACKEND_CONFIG_PATH[id];
      if (!path) {
        setIntegrations((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "connected" as const } : item))
        );
        return null;
      }
      try {
        const res = await apiFetch<CalendlyConfigResponse>(path, { method: "POST", body: JSON.stringify(values) });
        // Server menyimpan kredensial hanya di memori — simpan salinan di browser
        // supaya bisa dikirim ulang otomatis setelah server restart (lihat WabaAutoSync).
        if (id === "calendly" && res?.eventType?.uri) {
          calendlySaveStored({ token: (values.token || "").trim(), eventTypeUri: res.eventType.uri });
        }
        await refresh();
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : "Gagal menghubungkan integrasi.";
      }
    },
    [refresh]
  );

  const disconnect = useCallback(
    async (id: string): Promise<string | null> => {
      const path = BACKEND_CONFIG_PATH[id];
      if (!path) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "disconnected" as const, connectedInfo: undefined } : item
          )
        );
        return null;
      }
      try {
        await apiFetch(path, { method: "DELETE" });
        if (id === "calendly") calendlyClearStored();
        await refresh();
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : "Gagal memutuskan integrasi.";
      }
    },
    [refresh]
  );

  return { integrations, setIntegrations, isLoading, refresh, connect, disconnect };
}
