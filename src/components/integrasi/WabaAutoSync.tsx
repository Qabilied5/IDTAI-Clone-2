"use client";

import { useEffect } from "react";

import { wabaAutoSyncOnLoad } from "@/lib/waba-config";

/**
 * Komponen tanpa UI — dipasang di layout dashboard supaya kredensial WABA
 * yang tersimpan di browser ini dikirim ulang ke backend tiap kali app
 * dimuat (sama seperti wbAutoSyncOnLoad() di versi vanilla).
 */
export function WabaAutoSync() {
  useEffect(() => {
    wabaAutoSyncOnLoad();
  }, []);
  return null;
}
