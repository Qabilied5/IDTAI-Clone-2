"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock, Moon, Sun, Sunset } from "lucide-react";

import { formatDateStr, formatTimeStr, getGreeting, getPageTitle } from "@/lib/nav";

import { NotificationBell } from "./NotificationBell";

const GREETING_ICON = { pagi: Sun, siang: Sun, sore: Sunset, malam: Moon };
const GREETING_STYLE: Record<string, string> = {
  pagi: "bg-amber-50 text-amber-700",
  siang: "bg-accent-soft text-accent",
  sore: "bg-orange-50 text-orange-700",
  malam: "bg-indigo-50 text-indigo-800",
};

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = getGreeting(now ?? new Date());
  const GreetingIcon = GREETING_ICON[greeting.variant];

  return (
    <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-neutral-200 bg-white pl-6 pr-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${GREETING_STYLE[greeting.variant]}`}
        >
          <GreetingIcon className="h-3 w-3" />
          {greeting.text}
        </span>
        <span className="h-[18px] w-px shrink-0 bg-neutral-200" />
        <div className="truncate text-[15px] font-bold text-ink">{title}</div>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-neutral-50 px-3 py-1.5">
          <CalendarClock className="h-[13px] w-[13px] text-neutral-400" />
          <span className="text-[11.5px] font-medium text-neutral-600">
            {now ? formatDateStr(now) : "—"}
          </span>
          <span className="mx-0.5 h-3.5 w-px bg-neutral-200" />
          <Clock className="h-[13px] w-[13px] text-neutral-400" />
          <span className="min-w-[52px] text-xs font-bold tracking-wide text-ink [font-variant-numeric:tabular-nums]">
            {now ? formatTimeStr(now) : "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <NotificationBell />
      </div>
    </div>
  );
}