import { CircleCheck, Clock, PlugZap } from "lucide-react";

export function IntegrationStatsBanner({
  connected,
  pending,
  disconnected,
}: {
  connected: number;
  pending: number;
  disconnected: number;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <PlugZap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-bold text-ink">Integrasi Channel &amp; Platform</div>
          <div className="mt-0.5 max-w-md text-xs leading-relaxed text-neutral-400">
            Hubungkan Indotrading AI ke saluran komunikasi, CRM, dan platform bisnis Anda —
            semua terpusat dalam satu dashboard.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatPill icon={CircleCheck} label="Terhubung" value={connected} className="bg-emerald-50 text-emerald-700" />
        <StatPill icon={Clock} label="Menunggu" value={pending} className="bg-amber-50 text-amber-700" />
        <StatPill icon={PlugZap} label="Belum Terhubung" value={disconnected} className="bg-neutral-100 text-neutral-500" />
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof CircleCheck;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{value}</span> {label}
    </div>
  );
}
