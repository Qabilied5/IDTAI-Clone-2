"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { NAV_SECTIONS } from "@/lib/nav";
import { useAuthStore } from "@/store/useAuthStore";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Store dibaca dari localStorage di browser; tunggu mount agar tidak hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName = mounted && user ? user.name : "—";
  const displayRole = mounted && user ? ROLE_LABEL[user.role] ?? user.role : "";
  const displayInitials = mounted && user ? user.avatarInitials : "";

  const handleLogout = () => {
    logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 pb-4 pt-[18px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          IT
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Indotrading AI</div>
          <div className="text-[10px] font-normal tracking-wide text-neutral-400">
            Admin Dashboard
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-1 pt-3.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-neutral-400">
              {section.title}
            </div>

            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "relative mx-2 my-px flex items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 py-2 text-[12.5px] font-medium no-underline transition-colors " +
                    (isActive
                      ? "bg-accent-soft text-accent"
                      : "text-neutral-400 hover:bg-neutral-50 hover:text-ink")
                  }
                >
                  {isActive && (
                    <span className="absolute inset-y-[20%] left-0 w-[3px] rounded-r-[3px] bg-accent" />
                  )}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-neutral-100 px-2 py-3">
        <div className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {displayInitials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-ink">{displayName}</div>
            <div className="text-[10px] text-neutral-400">{displayRole}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[12.5px] font-medium text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[17px] w-[17px]" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}