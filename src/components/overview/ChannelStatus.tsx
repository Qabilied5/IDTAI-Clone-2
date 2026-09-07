"use client";

import type { TelegramStatus, WabaStatus } from "@/types/integration";
import { IconTelegram, IconWhatsapp } from "./channel-icons";

interface ChannelStatusProps {
  telegram: TelegramStatus | null;
  waba: WabaStatus | null;
  telegramError: boolean;
  wabaError: boolean;
  isLoading?: boolean;
}

type ChannelState = "on" | "warn" | "off";

const STATE_STYLE: Record<ChannelState, string> = {
  on: "text-success",
  warn: "text-amber-600",
  off: "text-muted",
};

const STATE_DOT: Record<ChannelState, string> = {
  on: "bg-success",
  warn: "bg-amber-500",
  off: "bg-neutral-400",
};

function ChannelRow({
  icon,
  name,
  sub,
  state,
  stateLabel,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
  state: ChannelState;
  stateLabel: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-panel text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-ink">{name}</div>
        <div className="truncate text-[10.5px] text-muted">{sub}</div>
      </div>
      <div className={`flex shrink-0 items-center gap-1.5 text-[10.5px] font-semibold ${STATE_STYLE[state]}`}>
        <span className={`h-[7px] w-[7px] rounded-full ${STATE_DOT[state]}`} />
        {stateLabel}
      </div>
    </div>
  );
}

export function ChannelStatus({
  telegram,
  waba,
  telegramError,
  wabaError,
  isLoading,
}: ChannelStatusProps) {
  const isTelegramOn = Boolean(telegram?.configured && telegram?.polling);
  const isWabaOn = Boolean(waba?.configured);

  return (
    <div className="rounded-[10px] border border-border bg-canvas p-4">
      <div className="mb-2.5 text-[13px] font-semibold text-ink">Status Koneksi Channel</div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted">Memuat status…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {telegramError ? (
            <ChannelRow
              icon={<IconTelegram className="h-[15px] w-[15px]" />}
              name="Telegram Bot"
              sub="Tidak dapat memuat status"
              state="off"
              stateLabel="Error"
            />
          ) : (
            <ChannelRow
              icon={<IconTelegram className="h-[15px] w-[15px]" />}
              name="Telegram Bot"
              sub={
                telegram?.bot?.username
                  ? `@${telegram.bot.username}`
                  : telegram?.configured
                    ? "Terhubung"
                    : "Belum dikonfigurasi"
              }
              state={isTelegramOn ? "on" : telegram?.configured ? "warn" : "off"}
              stateLabel={isTelegramOn ? "Aktif" : telegram?.configured ? "Polling Berhenti" : "Terputus"}
            />
          )}

          {wabaError ? (
            <ChannelRow
              icon={<IconWhatsapp className="h-[15px] w-[15px]" />}
              name="WhatsApp Business API"
              sub="Tidak dapat memuat status"
              state="off"
              stateLabel="Error"
            />
          ) : (
            <ChannelRow
              icon={<IconWhatsapp className="h-[15px] w-[15px]" />}
              name="WhatsApp Business API"
              sub={waba?.bot?.display_phone_number || (isWabaOn ? "Terhubung" : "Belum dikonfigurasi")}
              state={isWabaOn ? "on" : "off"}
              stateLabel={isWabaOn ? "Aktif" : "Terputus"}
            />
          )}
        </div>
      )}
    </div>
  );
}
