"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconSun,
  IconSunHigh,
  IconSunset2,
  IconMoonStars,
  IconCalendarEvent,
  IconClock,
} from "@tabler/icons-react";
import NotificationPanel from "./NotificationPanel";
import { getPageTitle } from "@/lib/utils";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Greeting = {
  text: string;
  Icon: typeof IconSun;
  cls: "greeting-pagi" | "greeting-siang" | "greeting-sore" | "greeting-malam";
};

function getGreeting(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return { text: "Selamat Pagi", Icon: IconSun, cls: "greeting-pagi" };
  if (hour >= 12 && hour < 15) return { text: "Selamat Siang", Icon: IconSunHigh, cls: "greeting-siang" };
  if (hour >= 15 && hour < 19) return { text: "Selamat Sore", Icon: IconSunset2, cls: "greeting-sore" };
  return { text: "Selamat Malam", Icon: IconMoonStars, cls: "greeting-malam" };
}

export default function Topbar() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  // now starts null so the server-rendered markup and first client render
  // match exactly (avoids a hydration mismatch); the clock fills in on mount.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}` : "";
  const timeStr = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "";
  const greeting = getGreeting(now ? now.getHours() : 8);
  const GreetingIcon = greeting.Icon;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span className={`tb-greeting-chip ${greeting.cls}`}>
            <GreetingIcon size={12} stroke={2} />
            <span>{greeting.text}</span>
          </span>
          <span className="tb-sep" />
          <div className="topbar-title">{pageTitle}</div>
        </div>
      </div>

      <div className="topbar-center">
        <div className="tb-datetime">
          <IconCalendarEvent className="tb-dt-icon" size={13} stroke={2} />
          <span className="tb-date-str">{dateStr}</span>
          <span className="tb-dt-divider" />
          <IconClock className="tb-dt-icon" size={13} stroke={2} />
          <span className="tb-time-str">{timeStr}</span>
        </div>
      </div>

      <div className="topbar-right">
        <NotificationPanel />
      </div>
    </div>
  );
}