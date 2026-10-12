"use client";

import { useState } from "react";

import { useAgents } from "@/hooks/useAgents";
import { useAppointments } from "@/hooks/useAppointments";
import { useChannelStatus } from "@/hooks/useChannelStatus";
import { useConversations } from "@/hooks/useConversations";
import { countAppointmentsToday, countEscalated } from "@/lib/overview";

import { AgentsOnline } from "./AgentsOnline";
import { CalendarWidget } from "./CalendarWidget";
import { ChannelStatus } from "./ChannelStatus";
import { EscalationQueue } from "./EscalationQueue";
import { RecentConversationsTable } from "./RecentConversationsTable";
import { SummaryCards } from "./SummaryCards";
import { UpcomingAppointments } from "./UpcomingAppointments";

/**
 * Menggabungkan semua widget halaman Overview. Dulunya (versi vanilla)
 * tiap widget di overview.js melakukan fetch sendiri-sendiri ke backend;
 * di sini datanya diambil sekali per hook lalu dibagi ke komponen anak
 * lewat props, supaya tidak ada request duplikat dan supaya banner
 * "Ringkasan Hari Ini" bisa dihitung dari data yang sama persis dengan
 * yang ditampilkan widget lain.
 */
export function OverviewContent() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { appointments, isLoading: isLoadingAppointments } = useAppointments();
  const { conversations, isLoading: isLoadingConversations } = useConversations();
  const { agents, isLoading: isLoadingAgents, error: agentsError, onlineCount: onlineAgentCount } =
    useAgents();
  const channelStatus = useChannelStatus();

  const isSummaryLoading =
    isLoadingAppointments || isLoadingConversations || isLoadingAgents || channelStatus.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards
        appointmentsToday={countAppointmentsToday(appointments)}
        escalatedCount={countEscalated(conversations)}
        onlineAgentCount={onlineAgentCount}
        connectedChannelCount={channelStatus.onlineCount}
        isSummaryLoading={isSummaryLoading}
      />

      <EscalationQueue conversations={conversations} isLoading={isLoadingConversations} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CalendarWidget
          appointments={appointments}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
        <UpcomingAppointments
          appointments={appointments}
          selectedDay={selectedDay}
          isLoading={isLoadingAppointments}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChannelStatus
          telegram={channelStatus.telegram}
          waba={channelStatus.waba}
          telegramError={channelStatus.telegramError}
          wabaError={channelStatus.wabaError}
          isLoading={channelStatus.isLoading}
        />
        <AgentsOnline agents={agents} isLoading={isLoadingAgents} error={agentsError} />
      </div>

      <RecentConversationsTable conversations={conversations} isLoading={isLoadingConversations} />
    </div>
  );
}
