"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";

import type { Appointment } from "@/types/appointment";
import { DAY_SHORT, MONTH_NAMES, sameDay, toAppointmentDate } from "@/lib/overview";

interface CalendarWidgetProps {
  appointments: Appointment[];
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}

export function CalendarWidget({ appointments, selectedDay, onSelectDay }: CalendarWidgetProps) {
  const [refDate, setRefDate] = useState(() => new Date());

  const appointmentDates = useMemo(() => appointments.map(toAppointmentDate), [appointments]);

  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const today = new Date();

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  function goToToday() {
    setRefDate(new Date());
    onSelectDay(null);
  }

  function handleSelectDay(day: Date) {
    onSelectDay(selectedDay && sameDay(day, selectedDay) ? null : day);
  }

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">Kalender</div>
        <button
          type="button"
          onClick={goToToday}
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <CalendarCheck className="h-[11px] w-[11px]" /> Hari Ini
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => setRefDate(new Date(year, month - 1, 1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-border text-muted hover:border-neutral-400 hover:bg-panel"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <div className="text-xs font-semibold text-ink">
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => setRefDate(new Date(year, month + 1, 1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-border text-muted hover:border-neutral-400 hover:bg-panel"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold text-muted">
        {DAY_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;

          const isToday = sameDay(day, today);
          const isSelected = Boolean(selectedDay && sameDay(day, selectedDay));
          const hasAppt = appointmentDates.some((d) => sameDay(d, day));

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={
                "relative flex h-7 items-center justify-center rounded-[7px] text-[11px] " +
                (isSelected
                  ? "bg-accent font-bold text-canvas"
                  : isToday
                    ? "bg-accent-soft font-bold text-accent"
                    : "text-ink hover:bg-panel")
              }
            >
              {day.getDate()}
              {hasAppt && (
                <span
                  className={
                    "absolute bottom-[3px] h-1 w-1 rounded-full " +
                    (isSelected ? "bg-canvas" : "bg-accent")
                  }
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
