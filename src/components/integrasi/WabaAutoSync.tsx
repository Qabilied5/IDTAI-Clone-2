"use client";

import { useEffect } from "react";

import { calendlyAutoSyncOnLoad } from "@/lib/calendly-config";
import { wabaAutoSyncOnLoad } from "@/lib/waba-config";

/**
 * Komponen tanpa UI — dipasang di layout dashboard supaya kredensial WABA
 * dan Calendly yang tersimpan di browser ini dikirim ulang ke backend tiap
 * kali app dimuat (sama seperti wbAutoSyncOnLoad() di versi vanilla).
 */
export function WabaAutoSync() {
  useEffect(() => {
    wabaAutoSyncOnLoad();
    calendlyAutoSyncOnLoad();
  }, []);
  return null;
}
