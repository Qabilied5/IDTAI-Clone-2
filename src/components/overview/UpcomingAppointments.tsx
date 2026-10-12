"use client";

import Link from "next/link";
import { CalendarOff } from "lucide-react";

import type { Appointment } from "@/types/appointment";
import {
  APPOINTMENT_STATUS_CONFIG,
  formatDayLabel,
  formatTimeHM,
  sameDay,
  toAppointmentDate,
} from "@/lib/overview";

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  selectedDay: Date | null;
  isLoading?: boolean;
}

export function UpcomingAppointments({
  appointments,
  selectedDay,
  isLoading,
}: UpcomingAppointmentsProps) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const items = appointments
    .map((appt) => ({ appt, date: toAppointmentDate(appt) }))
    .filter(({ date }) => (selectedDay ? sameDay(date, selectedDay) : date >= todayStart))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Jadwal Terdekat</div>
        <Link
          href="/appointment"
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-muted">
            Memuat jadwal…
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-muted">
            <CalendarOff className="h-4 w-4" />
            Tidak ada jadwal {selectedDay ? "di tanggal ini." : "mendatang."}
          </div>
        ) : (
          items.map(({ appt, date }) => {
            const cfg = APPOINTMENT_STATUS_CONFIG[appt.status];
            return (
              <Link
                key={appt.id}
                href="/appointment"
                className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 transition-colors hover:bg-panel"
              >
                <div className="w-14 shrink-0 text-center">
                  <div className="text-[13px] font-bold text-ink">{formatTimeHM(date)}</div>
                  <div className="text-[9px] text-muted">{formatDayLabel(date)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-ink">{appt.nama}</div>
                  <div className="truncate text-[10px] text-muted">
                    {appt.company || "-"} &middot; {appt.typeLabel || appt.type}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
                  <span className={`h-[7px] w-[7px] rounded-full ${cfg.dotClassName}`} />
                  {cfg.label}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
