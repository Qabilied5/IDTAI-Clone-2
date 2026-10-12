"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

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
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left hover:bg-neutral-50"
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            BW
          </div>
          <div>
            <div className="text-xs font-semibold text-ink">Budi Wicaksono</div>
            <div className="text-[10px] text-neutral-400">Super Admin</div>
          </div>
        </button>
      </div>
    </div>
  );
}