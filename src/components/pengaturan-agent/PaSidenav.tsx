"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = "/pengaturan-agent";

function NavSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="pa-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

interface NavItem { href: string; label: string; icon: ReactNode; dot?: boolean }
interface NavGroup { title: string; items: NavItem[] }

/* Ikon = SVG yang sama dengan index.html referensi. */
const GROUPS: NavGroup[] = [
  {
    title: "Persona & Gaya",
    items: [
      {
        href: `${BASE}/persona`,
        label: "Gaya Bahasa & Persona",
        icon: (
          <NavSvg>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01" />
            <path d="M15 10h.01" />
            <path d="M8.5 14.5a4 4 0 0 0 7 0" />
          </NavSvg>
        ),
      },
    ],
  },
  {
    title: "Manajemen Agent",
    items: [
      {
        href: `${BASE}/human-agent`,
        label: "Human Agent",
        icon: (
          <NavSvg>
            <circle cx="8" cy="8" r="3" />
            <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M14.5 19a3.5 3.5 0 0 1 7 0" />
          </NavSvg>
        ),
      },
      {
        href: `${BASE}/takeover`,
        label: "Aturan Takeover",
        dot: true,
        icon: (
          <NavSvg>
            <path d="M4 8h12" />
            <path d="M13 5l3 3-3 3" />
            <path d="M20 16H8" />
            <path d="M11 13l-3 3 3 3" />
          </NavSvg>
        ),
      },
      {
        href: `${BASE}/jadwal`,
        label: "Jam Kerja & Jadwal",
        icon: (
          <NavSvg>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </NavSvg>
        ),
      },
    ],
  },
  {
    title: "Multi-Brand",
    items: [
      {
        href: `${BASE}/multi-brand`,
        label: "Konfigurasi Brand",
        icon: (
          <NavSvg>
            <path d="M4 21V10" />
            <path d="M20 21V10" />
            <path d="M3 10l2.5-6h13L21 10" />
            <path d="M3 10h18" />
            <path d="M9 21v-5a3 3 0 0 1 6 0v5" />
          </NavSvg>
        ),
      },
    ],
  },
  {
    title: "Keamanan",
    items: [
      {
        href: `${BASE}/akses-peran`,
        label: "Kontrol Akses & Peran",
        icon: (
          <NavSvg>
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
            <rect x="9.5" y="11" width="5" height="4" rx="0.8" />
            <path d="M10.3 11v-1.2a1.7 1.7 0 0 1 3.4 0V11" />
          </NavSvg>
        ),
      },
      {
        href: `${BASE}/log-audit`,
        label: "Log Audit",
        icon: (
          <NavSvg>
            <path d="M4 12a8 8 0 1 0 2.4-5.7" />
            <path d="M4 4v4h4" />
            <path d="M12 8v4l3 2" />
          </NavSvg>
        ),
      },
    ],
  },
];

export function PaSidenav() {
  const pathname = usePathname();
  return (
    <nav className="pa-sidenav" aria-label="Navigasi Pengaturan Agent">
      {GROUPS.map((g) => (
        <div key={g.title} style={{ display: "contents" }}>
          <div className="pa-nav-section">{g.title}</div>
          {g.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`pa-nav-item${pathname === it.href ? " active" : ""}`}
              aria-current={pathname === it.href ? "page" : undefined}
            >
              {it.icon}
              {it.label}
              {it.dot && <span className="pa-nav-dot" />}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
