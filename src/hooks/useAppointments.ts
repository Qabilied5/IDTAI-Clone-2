"use client";

import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import type { Appointment } from "@/types/appointment";

interface AppointmentsResponse {
  ok: boolean;
  appointments: Appointment[];
}

interface UseAppointmentsOptions {
  /**
   * Selaras dengan polling AI/Telegram/Calendly di appointment.js versi
   * vanilla (tiap 5 detik), supaya kalender & "Jadwal Terdekat" di Overview
   * selalu sinkron tanpa reload halaman.
   */
  pollIntervalMs?: number;
}

export function useAppointments({ pollIntervalMs = 5000 }: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<AppointmentsResponse>("/appointments");
        if (cancelled) return;
        setAppointments(data.ok ? data.appointments : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Gagal memuat jadwal.");
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

  return { appointments, isLoading, error };
}
