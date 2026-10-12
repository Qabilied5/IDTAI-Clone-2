/* =============================================================
   src/server/scheduling.ts
   State machine penjadwalan in-chat (generic untuk Telegram & WABA):
   idle → pilih minggu → pilih tanggal → pilih jam → link booking Calendly.
   ============================================================= */
import { OLLAMA_MODEL, APPT_TYPE_LABELS } from './config';
import { apptFormatDateLabel, apptFormatTimeLabel, apptTypeLabel } from './appointments';
import {
  calendlyFormatSlotLabel, calendlyFormatTimeLabel, calendlyGetAvailableDatesInRange, calendlyGetAvailableTimesForDate,
} from './calendly';
import { ollamaGenerate, ollamaGenerateJson } from './ollama';
import { buildConversationPrompt, buildSchedulingIntentPrompt } from './prompts';
import { calendlyConfigured } from './state';
import type { Conversation, DateChoice, ReplyResult, SchedOption, SchedulingState, TimeSlot } from './types';

export function schedFreshState(): SchedulingState {
  return { stage: 'idle', offeredDates: [], offeredTimes: [], meetingType: null, rangeKey: null };
}

export function schedFormatDateLabel(item: DateChoice): string {
  return apptFormatDateLabel(item.date);
}

export function schedFormatTimeLabel(slot: TimeSlot): string {
  return slot.source === 'calendly' ? calendlyFormatTimeLabel(slot.startTime!) : apptFormatTimeLabel(slot);
}

export function schedWeekRange(rangeKey: string | null) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const thisSaturday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 5, 23, 59, 59);

  if (rangeKey === 'next_week') {
    const nextMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);
    const nextSaturday = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 5, 23, 59, 59);
    return { start: nextMonday, end: nextSaturday, label: 'minggu depan' };
  }
  const bufferedNow = new Date(now.getTime() + 2 * 60 * 1000);
  return { start: bufferedNow, end: thisSaturday, label: 'minggu ini' };
}

export function schedParseRangeChoice(text: string): 'next_week' | 'this_week' {
  return /depan|minggu\s*(depan|dpn)|next\s*week/i.test(text || '') ? 'next_week' : 'this_week';
}

export function schedBuildRangeQuestion(meetingType: string | null) {
  return {
    text: `Baik! Untuk jadwal ${apptTypeLabel(meetingType)}, Anda maunya di minggu ini atau minggu depan?`,
    options: [
      { id: 'range:this_week', label: 'Minggu Ini' },
      { id: 'range:next_week', label: 'Minggu Depan' },
    ] as SchedOption[],
  };
}

export async function schedBuildDateOffer(meetingType: string | null, rangeKey: string | null) {
  const { start, end, label: rangeLabel } = schedWeekRange(rangeKey);
  const typeLabel = apptTypeLabel(meetingType);

  if (!calendlyConfigured()) {
    console.error('[Calendly] schedBuildDateOffer dipanggil tapi Calendly belum dikonfigurasi (token/Event Type URI kosong).');
    return {
      text: `Mohon maaf, penjadwalan otomatis belum aktif saat ini. Silakan hubungi tim kami langsung ya.`,
      options: [] as SchedOption[],
      offeredDates: [] as DateChoice[],
    };
  }

  try {
    const dates = await calendlyGetAvailableDatesInRange(start, end);
    if (!dates.length) {
      return {
        text: `Mohon maaf, tidak ada tanggal kosong untuk ${typeLabel} di ${rangeLabel}. Silakan coba rentang lain atau hubungi tim kami langsung ya.`,
        options: [] as SchedOption[],
        offeredDates: [] as DateChoice[],
      };
    }
    return {
      text: `Berikut tanggal kosong untuk ${typeLabel} di ${rangeLabel}. Silakan pilih salah satu:`,
      options: dates.map((d) => ({ id: `date:${d.date}`, label: `📅 ${schedFormatDateLabel(d)}` })),
      offeredDates: dates,
    };
  } catch (e) {
    console.error('[Calendly] Gagal ambil tanggal available_times (schedBuildDateOffer):', (e as Error).message);
    return {
      text: `Mohon maaf, sedang ada kendala teknis mengambil jadwal dari sistem kami. Boleh dicoba lagi sebentar, atau hubungi tim kami langsung ya.`,
      options: [] as SchedOption[],
      offeredDates: [] as DateChoice[],
    };
  }
}

export async function schedBuildTimeOffer(meetingType: string | null, dateStr: string) {
  const typeLabel = apptTypeLabel(meetingType);
  const dateLabel = apptFormatDateLabel(dateStr);

  try {
    const times = await calendlyGetAvailableTimesForDate(dateStr);
    if (!times.length) {
      return {
        text: `Mohon maaf, jam untuk ${dateLabel} sudah penuh. Silakan pilih tanggal lain ya.`,
        options: [] as SchedOption[],
        offeredTimes: [] as TimeSlot[],
      };
    }
    return {
      text: `Baik, untuk ${typeLabel} di ${dateLabel}. Berikut jam yang tersedia, silakan pilih salah satu:`,
      options: times.map((t, i) => ({ id: `time:${i}`, label: `⏰ ${calendlyFormatTimeLabel(t.startTime!)}` })),
      offeredTimes: times,
    };
  } catch (e) {
    console.error('[Calendly] Gagal ambil jam available_times (schedBuildTimeOffer):', (e as Error).message);
    return {
      text: `Mohon maaf, sedang ada kendala teknis mengambil jam untuk ${dateLabel}. Boleh dicoba lagi sebentar ya.`,
      options: [] as SchedOption[],
      offeredTimes: [] as TimeSlot[],
    };
  }
}

export async function schedConfirmTime(conv: Conversation, index: number) {
  const slot = conv.scheduling?.offeredTimes && conv.scheduling.offeredTimes[index];
  if (!slot) return null;
  const firstName = (conv.name || '').split(' ')[0] || '';
  const label = calendlyFormatSlotLabel(slot.startTime!);
  conv.scheduling = schedFreshState();

  return {
    text: `Baik${firstName ? ' ' + firstName : ''}, untuk ${label}, silakan konfirmasi & selesaikan booking lewat tombol di bawah ya:`,
    options: [{ id: 'noop', label: 'Konfirmasi & Booking Sekarang', url: slot.schedulingUrl }] as SchedOption[],
  };
}

export interface ButtonResolveResult {
  text: string;
  options: SchedOption[];
  chosenLabel: string;
}

export async function schedResolveButtonId(conv: Conversation, id: string): Promise<ButtonResolveResult | null> {
  if (!conv.scheduling) conv.scheduling = schedFreshState();
  const [kind, val] = String(id).split(':');

  if (kind === 'range') {
    if (conv.scheduling.stage !== 'awaiting_range') return null;
    const offer = await schedBuildDateOffer(conv.scheduling.meetingType, val);
    conv.scheduling = {
      stage: offer.offeredDates.length ? 'awaiting_date' : 'idle',
      offeredDates: offer.offeredDates,
      offeredTimes: [],
      meetingType: conv.scheduling.meetingType,
      rangeKey: val,
    };
    return { text: offer.text, options: offer.options, chosenLabel: val === 'next_week' ? 'Minggu Depan' : 'Minggu Ini' };
  }

  if (kind === 'date') {
    if (conv.scheduling.stage !== 'awaiting_date') return null;
    const dateStr = val;
    const matched = conv.scheduling.offeredDates.find((d) => d.date === dateStr);
    if (!matched) return null;
    const offer = await schedBuildTimeOffer(conv.scheduling.meetingType, dateStr);
    conv.scheduling = {
      stage: offer.offeredTimes.length ? 'awaiting_time' : 'idle',
      offeredDates: conv.scheduling.offeredDates,
      offeredTimes: offer.offeredTimes,
      meetingType: conv.scheduling.meetingType,
      rangeKey: conv.scheduling.rangeKey,
    };
    return { text: offer.text, options: offer.options, chosenLabel: schedFormatDateLabel(matched) };
  }

  if (kind === 'time') {
    if (conv.scheduling.stage !== 'awaiting_time') return null;
    const idx = Number(val);
    const slot = conv.scheduling.offeredTimes[idx];
    const chosenLabel = slot ? schedFormatTimeLabel(slot) : `pilihan #${idx}`;
    const result = await schedConfirmTime(conv, idx);
    if (!result) return null;
    return { text: result.text, options: result.options, chosenLabel };
  }

  return null;
}

/* options generik → inline keyboard Telegram. */
export function tgOptionsToKeyboard(options: SchedOption[] | null | undefined) {
  if (!options || !options.length) return null;
  const rows = options.map((o) => [o.url ? { text: o.label, url: o.url } : { text: o.label, callback_data: o.id }]);
  return { inline_keyboard: rows };
}

/* options generik → teks polos bernomor (fallback kalau interactive gagal). */
export function schedOptionsToPlainText(text: string, options: SchedOption[]): string {
  if (!options || !options.length) return text;
  const lines = options.map((o, i) => `${i + 1}. ${o.label}${o.url ? `\n   ${o.url}` : ''}`);
  return `${text}\n\n${lines.join('\n')}\n\nBalas dengan angka pilihan Anda ya.`;
}

// ── Klasifikasi niat via Ollama ──
export async function classifySchedulingIntent(conv: Conversation, incomingText: string, offeredLabels: string[]) {
  const prompt = buildSchedulingIntentPrompt(conv, incomingText, offeredLabels);
  try {
    const parsed = await ollamaGenerateJson<any>(prompt, { model: OLLAMA_MODEL, temperature: 0.1 });
    const idx = Number(parsed.picks_slot_index);
    return {
      wantsSchedule: !!parsed.wants_schedule,
      picksSlotIndex: Number.isInteger(idx) && idx > 0 ? idx : null,
      meetingTypeGuess: APPT_TYPE_LABELS[parsed.meeting_type_guess] ? String(parsed.meeting_type_guess) : 'konsultasi',
    };
  } catch (err) {
    console.error('[Scheduling] Gagal klasifikasi intent, lewati penawaran jadwal:', (err as Error).message);
    return { wantsSchedule: false, picksSlotIndex: null as number | null, meetingTypeGuess: 'konsultasi' };
  }
}

export async function generateConversationReply(conv: Conversation, incomingText: string): Promise<string> {
  return ollamaGenerate(buildConversationPrompt(conv, incomingText), { model: OLLAMA_MODEL, temperature: 0.7 });
}

/* Handler utama pesan masuk — dipakai Telegram & WhatsApp. */
export async function handleMessageAndMaybeSchedule(conv: Conversation, incomingText: string): Promise<ReplyResult> {
  if (!conv.scheduling) conv.scheduling = schedFreshState();

  if (conv.scheduling.stage === 'awaiting_range') {
    const rangeKey = schedParseRangeChoice(incomingText);
    const offer = await schedBuildDateOffer(conv.scheduling.meetingType, rangeKey);
    conv.scheduling = {
      stage: offer.offeredDates.length ? 'awaiting_date' : 'idle',
      offeredDates: offer.offeredDates,
      offeredTimes: [],
      meetingType: conv.scheduling.meetingType,
      rangeKey,
    };
    return { text: offer.text, replyMarkup: tgOptionsToKeyboard(offer.options), options: offer.options };
  }

  if (conv.scheduling.stage === 'awaiting_date') {
    const dateLabels = conv.scheduling.offeredDates.map((d) => schedFormatDateLabel(d));
    const intent = await classifySchedulingIntent(conv, incomingText, dateLabels);
    if (intent.picksSlotIndex) {
      const picked = conv.scheduling.offeredDates[intent.picksSlotIndex - 1];
      if (picked) {
        const offer = await schedBuildTimeOffer(conv.scheduling.meetingType, picked.date);
        conv.scheduling = {
          stage: offer.offeredTimes.length ? 'awaiting_time' : 'idle',
          offeredDates: conv.scheduling.offeredDates,
          offeredTimes: offer.offeredTimes,
          meetingType: conv.scheduling.meetingType,
          rangeKey: conv.scheduling.rangeKey,
        };
        return { text: offer.text, replyMarkup: tgOptionsToKeyboard(offer.options), options: offer.options };
      }
    }
  }

  if (conv.scheduling.stage === 'awaiting_time') {
    const timeLabels = conv.scheduling.offeredTimes.map((t) => schedFormatTimeLabel(t));
    const intent = await classifySchedulingIntent(conv, incomingText, timeLabels);
    if (intent.picksSlotIndex) {
      const result = await schedConfirmTime(conv, intent.picksSlotIndex - 1);
      if (result) return { text: result.text, replyMarkup: tgOptionsToKeyboard(result.options), options: result.options };
    }
  }

  if (conv.scheduling.stage === 'idle') {
    const intent = await classifySchedulingIntent(conv, incomingText, []);
    if (intent.wantsSchedule) {
      conv.scheduling = { stage: 'awaiting_range', offeredDates: [], offeredTimes: [], meetingType: intent.meetingTypeGuess, rangeKey: null };
      const q = schedBuildRangeQuestion(intent.meetingTypeGuess);
      return { text: q.text, replyMarkup: tgOptionsToKeyboard(q.options), options: q.options };
    }
  }

  const freeText = await generateConversationReply(conv, incomingText);
  return { text: freeText, replyMarkup: null, options: [] };
}
