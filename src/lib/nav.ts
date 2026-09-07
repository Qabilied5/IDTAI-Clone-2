import {
  IconAiAgent,
  IconAnalitik,
  IconAppointment,
  IconIntegrasi,
  IconKnowledgeBase,
  IconLeads,
  IconOverview,
  IconPengaturanAgent,
  IconPercakapan,
  IconPipeline,
  IconRevenue,
} from "@/components/layout/nav-icons";
import type { NavSection } from "@/types/nav";

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menu Utama",
    items: [
      { label: "Overview", href: "/overview", icon: IconOverview },
      { label: "Percakapan", href: "/percakapan", icon: IconPercakapan },
      { label: "AI Agent", href: "/ai-agent", icon: IconAiAgent },
      { label: "Analitik", href: "/analitik", icon: IconAnalitik },
    ],
  },
  {
    title: "CRM Menu",
    items: [
      { label: "Kontak / Leads", href: "/kontak-leads", icon: IconLeads },
      { label: "Revenue", href: "/revenue", icon: IconRevenue },
      { label: "Appointment", href: "/appointment", icon: IconAppointment },
      { label: "Pipeline", href: "/pipeline", icon: IconPipeline },
    ],
  },
  {
    title: "Konfigurasi",
    items: [
      { label: "Integrasi", href: "/integrasi", icon: IconIntegrasi },
      { label: "Pengaturan Agent", href: "/pengaturan-agent", icon: IconPengaturanAgent },
      { label: "Knowledge Base", href: "/knowledge-base", icon: IconKnowledgeBase },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_SECTIONS.flatMap((section) => section.items.map((item) => [item.href, item.label]))
);

export function getPageTitle(pathname: string): string {
  const match = Object.keys(PAGE_TITLES).find(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  return match ? PAGE_TITLES[match] : "Dashboard";
}

export interface Greeting {
  text: string;
  variant: "pagi" | "siang" | "sore" | "malam";
}

export function getGreeting(date: Date): Greeting {
  const h = date.getHours();
  if (h >= 5 && h < 12) return { text: "Selamat Pagi", variant: "pagi" };
  if (h >= 12 && h < 15) return { text: "Selamat Siang", variant: "siang" };
  if (h >= 15 && h < 19) return { text: "Selamat Sore", variant: "sore" };
  return { text: "Selamat Malam", variant: "malam" };
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateStr(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatTimeStr(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}