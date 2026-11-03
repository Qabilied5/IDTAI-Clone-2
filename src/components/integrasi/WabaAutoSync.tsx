"use client";

import { useEffect } from "react";

import { calendlyMigrateLegacyOnLoad } from "@/lib/calendly-migrate";
import { wabaAutoSyncOnLoad } from "@/lib/waba-config";

/**
 * Komponen tanpa UI — dipasang di layout dashboard. Kredensial WABA yang tersimpan di
 * browser ini dikirim ulang ke backend tiap kali app dimuat. Calendly kini disimpan di
 * database: komponen ini hanya memindahkan sisa data lama dari localStorage (sekali jalan).
 */
export function WabaAutoSync() {
  useEffect(() => {
    wabaAutoSyncOnLoad();
    calendlyMigrateLegacyOnLoad();
  }, []);
  return null;
}
