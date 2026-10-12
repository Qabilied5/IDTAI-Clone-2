import { Search } from "lucide-react";

import { CATEGORY_LABELS } from "@/lib/integrations";

type CategoryKey = keyof typeof CATEGORY_LABELS;

export function CategoryFilterTabs({
  active,
  onChange,
  search,
  onSearchChange,
}: {
  active: CategoryKey;
  onChange: (cat: CategoryKey) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const tabs = Object.keys(CATEGORY_LABELS) as CategoryKey[];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (active === tab
                ? "bg-accent text-white"
                : "border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50")
            }
          >
            {CATEGORY_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="relative sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari integrasi…"
          className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-ink placeholder:text-neutral-400 outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
