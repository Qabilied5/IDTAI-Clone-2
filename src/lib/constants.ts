export const APP_NAME = "Indotrading AI";
export const APP_SUBTITLE = "Admin Dashboard";

/**
 * Icon keys map to the SVG components defined in
 * src/components/layout/Sidebar.tsx (NAV_ICONS).
 * Keeping this file plain/data-only makes it easy to later
 * fetch this config from an API or a role-based access map.
 */
export type NavIconKey =
  | "overview"
  | "percakapan"
  | "aiAgent"
  | "aiVoice"
  | "analitik"
  | "leads"
  | "revenue"
  | "appointment"
  | "pipeline"
  | "integrasi"
  | "settings"
  | "knowledge";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconKey;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Mirrors the sidebar from the legacy IDT-AI vanilla dashboard.
 * NOTE: "AI Voice" was not wired up in the old sidebar markup
 * (it existed only as an isolated page), but the required route
 * structure includes (dashboard)/ai-voice, so it's added here.
 * Remove it if AI Voice shouldn't be user-facing yet.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menu Utama",
    items: [
      { label: "Overview", href: "/overview", icon: "overview" },
      { label: "Percakapan", href: "/percakapan", icon: "percakapan" },
      { label: "AI Agent", href: "/ai-agent", icon: "aiAgent" },
      { label: "AI Voice", href: "/ai-voice", icon: "aiVoice" },
      { label: "Analitik", href: "/analitik", icon: "analitik" },
    ],
  },
  {
    title: "CRM Menu",
    items: [
      { label: "Kontak / Leads", href: "/kontak-leads", icon: "leads" },
      { label: "Revenue", href: "/revenue", icon: "revenue" },
      { label: "Appointment", href: "/appointment", icon: "appointment" },
      { label: "Pipeline", href: "/pipeline", icon: "pipeline" },
    ],
  },
  {
    title: "Konfigurasi",
    items: [
      { label: "Integrasi", href: "/integrasi", icon: "integrasi" },
      { label: "Pengaturan Agent", href: "/pengaturan-agent", icon: "settings" },
      { label: "Knowledge Base", href: "/knowledge-base", icon: "knowledge" },
    ],
  },
];

export const CURRENT_USER = {
  name: "Budi Wicaksono",
  role: "Super Admin",
  initials: "BW",
};