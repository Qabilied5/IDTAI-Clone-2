"use client";

import { useRouter } from "next/navigation";
import {
  Bot,
  Clock,
  MessagesSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

/**
 * Angka-angka di kartu metrik ini statis di versi vanilla juga (hardcoded
 * langsung di overview.html, bukan hasil fetch API) -- dipertahankan apa
 * adanya di sini. Kalau nanti ada endpoint ringkasan metrik, tinggal ganti
 * array ini jadi hasil sebuah hook (mis. useOverviewMetrics()).
 */
const METRICS = [
  {
    key: "percakapan",
    label: "Total Percakapan",
    icon: MessagesSquare,
    value: "1,284",
    change: "+18% vs minggu lalu",
    trend: "up" as const,
    accent: true,
  },
  {
    key: "ai",
    label: "Ditangani AI",
    icon: Bot,
    value: "91%",
    change: "+4% vs minggu lalu",
    trend: "up" as const,
  },
  {
    key: "respons",
    label: "Waktu Respons",
    icon: Clock,
    value: "2.4",
    unit: "dtk",
    change: "-0.8 dtk lebih cepat",
    trend: "up" as const,
  },
  {
    key: "revenue",
    label: "Revenue dari AI",
    icon: Wallet,
    value: "48,2",
    unit: "jt",
    change: "+23% vs minggu lalu",
    trend: "up" as const,
    href: "/revenue",
  },
];

interface SummaryCardsProps {
  appointmentsToday: number;
  escalatedCount: number;
  onlineAgentCount: number;
  connectedChannelCount: number;
  isSummaryLoading?: boolean;
}

export function SummaryCards({
  appointmentsToday,
  escalatedCount,
  onlineAgentCount,
  connectedChannelCount,
  isSummaryLoading,
}: SummaryCardsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;

          return (
            <button
              key={metric.key}
              type="button"
              onClick={metric.href ? () => router.push(metric.href!) : undefined}
              className={
                "flex flex-col rounded-[10px] border border-border bg-canvas p-4 text-left transition-colors " +
                (metric.accent ? "border-l-[3px] border-l-accent " : "") +
                (metric.href ? "cursor-pointer hover:border-accent-mid" : "cursor-default")
              }
            >
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Icon className="h-[13px] w-[13px]" />
                {metric.label}
              </div>
              <div className="mb-1 text-[22px] font-bold leading-none text-ink">
                {metric.value}
                {metric.unit && (
                  <span className="text-[13px] font-medium text-muted"> {metric.unit}</span>
                )}
              </div>
              <div
                className={
                  "flex items-center gap-1 text-[11px] " +
                  (metric.trend === "up" ? "text-success" : "text-danger")
                }
              >
                <TrendIcon className="h-[11px] w-[11px]" />
                {metric.change}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 rounded-[10px] border border-accent-mid bg-accent-soft px-3.5 py-3">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-canvas text-accent">
          <Sparkles className="h-[15px] w-[15px]" />
        </div>
        <div className="text-[12.5px] leading-relaxed text-ink">
          {isSummaryLoading ? (
            "Memuat ringkasan hari ini…"
          ) : (
            <>
              Hari ini: <strong className="text-accent">{appointmentsToday} appointment</strong>{" "}
              terjadwal hari ini,{" "}
              {escalatedCount > 0 ? (
                <>
                  <strong className="text-accent">{escalatedCount} percakapan</strong> menunggu
                  ditangani agent
                </>
              ) : (
                "tidak ada antrean eskalasi"
              )}
              , <strong className="text-accent">{onlineAgentCount} agent</strong> online,{" "}
              <strong className="text-accent">{connectedChannelCount}/2 channel</strong> terhubung.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
