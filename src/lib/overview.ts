import type { Appointment, AppointmentStatus } from "@/types/appointment";
import type { Conversation, ConversationStatus } from "@/types/conversation";

export const CONVERSATION_STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; dotClassName: string }
> = {
  open: { label: "Aktif", dotClassName: "bg-success" },
  waiting: { label: "Menunggu", dotClassName: "bg-amber-500" },
  closed: { label: "Selesai", dotClassName: "bg-neutral-400" },
};

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; dotClassName: string }
> = {
  terkonfirmasi: { label: "Terkonfirmasi", dotClassName: "bg-success" },
  menunggu: { label: "Menunggu", dotClassName: "bg-amber-500" },
  selesai: { label: "Selesai", dotClassName: "bg-neutral-400" },
  dibatalkan: { label: "Dibatalkan", dotClassName: "bg-accent" },
};

export type EscalationReasonCode = "keyword" | "human" | "repeat" | "stall";

export const ESCALATION_REASON_CONFIG: Record<
  EscalationReasonCode,
  { label: string; className: string }
> = {
  keyword: { label: "Kata Kunci Sensitif", className: "bg-accent-soft text-accent" },
  human: { label: "Minta Agent Manusia", className: "bg-indigo-50 text-indigo-700" },
  repeat: { label: "Pertanyaan Diulang", className: "bg-amber-50 text-amber-700" },
  stall: { label: "Tidak Ada Respons AI", className: "bg-neutral-100 text-neutral-600" },
};

/**
 * Cocokkan kalimat lengkap `escalationReason` dari server ke satu kategori,
 * supaya warna/label badge tetap konsisten walau server hanya mengirim teks
 * bebas (lihat escAssignToAgent() di server.js versi lama).
 */
export function classifyEscalationReason(reasonText?: string): EscalationReasonCode {
  const text = (reasonText ?? "").toLowerCase();
  if (text.includes("bicara dengan manusia")) return "human";
  if (text.includes("kata kunci sensitif")) return "keyword";
  if (text.includes("diulang")) return "repeat";
  if (text.includes("tidak ada respons")) return "stall";
  return "keyword";
}

export function getWaitMinutes(escalatedAt?: number): number {
  if (!escalatedAt) return 0;
  return Math.max(0, Math.round((Date.now() - escalatedAt) / 60000));
}

export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Gabungkan Appointment.date ("YYYY-MM-DD") + time ("HH.MM") jadi satu Date. */
export function toAppointmentDate(appt: Appointment): Date {
  const [hh, mm] = String(appt.time || "0.0").split(".");
  const date = new Date(`${appt.date}T00:00:00`);
  date.setHours(parseInt(hh ?? "0", 10) || 0, parseInt(mm ?? "0", 10) || 0, 0, 0);
  return date;
}

export function formatTimeHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (sameDay(date, today)) return "Hari Ini";
  if (sameDay(date, tomorrow)) return "Besok";
  return `${DAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function countEscalated(conversations: Conversation[]): number {
  return conversations.filter((c) => c.escalated).length;
}

export function countAppointmentsToday(appointments: Appointment[]): number {
  const today = new Date();
  return appointments.filter((a) => sameDay(toAppointmentDate(a), today)).length;
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} hari lalu`;
}

export function countOnlineAgentsFromChannels(
  telegramOn: boolean,
  wabaOn: boolean
): number {
  return (telegramOn ? 1 : 0) + (wabaOn ? 1 : 0);
}
