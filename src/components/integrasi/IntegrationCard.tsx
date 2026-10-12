import type { Integration } from "@/types/integration";

const STATUS_CFG: Record<Integration["status"], { label: string; className: string }> = {
  connected: { label: "Terhubung", className: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Menunggu", className: "bg-amber-50 text-amber-700" },
  disconnected: { label: "Belum Terhubung", className: "bg-neutral-100 text-neutral-500" },
};

export function IntegrationCard({
  integration,
  onOpen,
}: {
  integration: Integration;
  onOpen: (integration: Integration) => void;
}) {
  const status = STATUS_CFG[integration.status];

  return (
    <button
      type="button"
      onClick={() => onOpen(integration)}
      className="flex flex-col items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-xl">
          {integration.emoji}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div>
        <div className="text-sm font-semibold text-ink">{integration.name}</div>
        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-400">
          {integration.description}
        </div>
      </div>
    </button>
  );
}
