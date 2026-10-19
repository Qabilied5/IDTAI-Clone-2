/* =============================================================
   src/server/appointments.ts
   Appointment internal (slot tetap Senin–Sabtu, 4 jendela jam) dan
   record appointment hasil percakapan AI / booking Calendly.
   ============================================================= */
import {
  APPT_DEFAULT_DURATION, APPT_DEFAULT_STAFF, APPT_TIME_SLOTS, APPT_TYPE_LABELS, APPT_WORKING_DAYS,
} from './config';
import { state } from './state';
import { apptSave } from './store';
import type { AiAppointment, Conversation, DateChoice, TimeSlot } from './types';

export function apptPad(n: number): string { return String(n).padStart(2, '0'); }

export function apptTypeLabel(typeValue: string | null | undefined): string {
  return APPT_TYPE_LABELS[typeValue || ''] || APPT_TYPE_LABELS.konsultasi;
}

function apptIsSlotTaken(dateStr: string, timeStr: string): boolean {
  return state.aiAppointments.some((a) => a.date === dateStr && a.time === timeStr && a.status !== 'dibatalkan');
}

function apptTimeSlotIsPast(now: Date, timeSlot: { start: string }): boolean {
  const [h, m] = timeSlot.start.split('.').map(Number);
  const slotMinutes = h * 60 + (m || 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

function apptDateHasOpenSlot(dateStr: string, isToday: boolean, now: Date): boolean {
  return APPT_TIME_SLOTS.some((ts) => {
    if (isToday && apptTimeSlotIsPast(now, ts)) return false;
    return !apptIsSlotTaken(dateStr, ts.start);
  });
}

export function apptGetAvailableDatesInRange(startDate: Date, endDate: Date): DateChoice[] {
  const dates: DateChoice[] = [];
  const now = new Date();
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cursor <= endDay) {
    if (APPT_WORKING_DAYS.includes(cursor.getDay())) {
      const isToday = cursor.toDateString() === now.toDateString();
      const dateStr = `${cursor.getFullYear()}-${apptPad(cursor.getMonth() + 1)}-${apptPad(cursor.getDate())}`;
      if (apptDateHasOpenSlot(dateStr, isToday, now)) dates.push({ date: dateStr, source: 'internal' });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return dates;
}

export function apptGetAvailableTimesForDate(dateStr: string): TimeSlot[] {
  const now = new Date();
  const isToday = new Date(dateStr + 'T00:00:00').toDateString() === now.toDateString();
  return APPT_TIME_SLOTS.filter((ts) => {
    if (isToday && apptTimeSlotIsPast(now, ts)) return false;
    return !apptIsSlotTaken(dateStr, ts.start);
  }).map((ts) => ({ date: dateStr, time: ts.start, endTime: ts.end, source: 'internal' as const }));
}

export function apptFormatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  return `${dayName}, ${dateLabel}`;
}

export function apptFormatTimeLabel(slot: TimeSlot): string {
  return `${slot.time} - ${slot.endTime} WIB`;
}

export function apptFormatSlotLabel(slot: TimeSlot): string {
  return `${apptFormatDateLabel(slot.date)} jam ${slot.time} WIB`;
}

/* Appointment dari percakapan chat (status "menunggu" sampai admin konfirmasi). */
export function apptCreateFromChat(conv: Conversation, slot: TimeSlot, meetingType: string): AiAppointment {
  const typeLabel = apptTypeLabel(meetingType);
  const record: AiAppointment = {
    id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nama: conv.name,
    company: conv.username ? '@' + conv.username : '-',
    phone: conv.username ? '@' + conv.username : `Telegram ${conv.chatId}`,
    email: '',
    date: slot.date,
    time: slot.time || '',
    duration: APPT_DEFAULT_DURATION,
    type: meetingType,
    typeLabel,
    sales: APPT_DEFAULT_STAFF,
    status: 'menunggu',
    createdBy: 'ai',
    location: '',
    notes: `Dibuat otomatis dari percakapan Telegram (chat ID ${conv.chatId}).`,
    aiNote: 'Appointment ini dijadwalkan otomatis oleh AI berdasarkan pilihan slot customer lewat chat Telegram. Mohon konfirmasi, lengkapi lokasi/link meeting, lalu kirim follow-up.',
    chatId: conv.chatId,
    leadId: null,
    timeline: [
      { type: 'ai', event: 'AI menawarkan jam jadwal', sub: `Menawarkan ${conv.scheduling?.offeredTimes.length || 0} jam kosong via Telegram`, time: 'Baru saja' },
      { type: 'success', event: 'Customer memilih jadwal', sub: apptFormatSlotLabel(slot), time: 'Baru saja' },
      { type: 'ai', event: 'AI membuat appointment otomatis', sub: `Menunggu konfirmasi admin — PIC sementara: ${APPT_DEFAULT_STAFF}`, time: 'Baru saja' },
    ],
  };
  state.aiAppointments.push(record);
  apptSave();
  return record;
}

export function apptConfirm(id: string): AiAppointment | null {
  const record = state.aiAppointments.find((a) => String(a.id) === String(id));
  if (!record) return null;
  record.status = 'terkonfirmasi';
  record.timeline.push({ type: 'success', event: 'Admin mengonfirmasi appointment', sub: 'Dikonfirmasi lewat halaman Appointment', time: 'Baru saja' });
  apptSave();
  return record;
}
