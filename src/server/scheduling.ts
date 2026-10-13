/* =============================================================
   src/server/scheduling.ts
   State machine penjadwalan in-chat (generic untuk Telegram & WABA).

   Alur (customer cukup menekan tombol; satu-satunya teks bebas = email,
   dan itu pun hanya sekali — dipakai ulang di booking berikutnya):

     idle ─(niat jadwal)→ awaiting_range ─→ awaiting_date ─→ awaiting_time
        ─→ awaiting_email (dilewati bila email sudah diketahui)
        ─→ awaiting_confirm ─(✅)→ booking LANGSUNG di Calendly → idle

   Kalau booking langsung ditolak (mis. plan Calendly Free → 403), alur
   jatuh ke perilaku lama: kirim tombol link booking Calendly.
   ============================================================= */
import { OLLAMA_MODEL, APPT_TYPE_LABELS } from './config';
import { apptFormatDateLabel, apptFormatTimeLabel, apptTypeLabel } from './appointments';
import {
  CalendlyApiError, apptAttachMeetingLink, apptCreateFromAutoBooking, calendlyCreateBooking,
  calendlyFormatSlotLabel, calendlyFormatTimeLabel, calendlyGetAvailableDatesInRange,
  calendlyGetAvailableTimesForDate, calendlyGetFreshEventInfo,
} from './calendly';
import { ollamaGenerate, ollamaGenerateJson } from './ollama';
import { buildConversationPrompt, buildSchedulingIntentPrompt } from './prompts';
import { calendlyConfigured } from './state';
import type { Conversation, DateChoice, ReplyResult, SchedOption, SchedulingState, TimeSlot } from './types';

/* Satu "langkah" percakapan: teks + tombol yang menyertainya. */
interface Step {
  text: string;
  options: SchedOption[];
}

/* WhatsApp list maksimal 10 baris: 9 jam + 1 baris "Ganti Tanggal". */
const MAX_TIME_ROWS = 9;

const OPT_BACK_RANGE: SchedOption = { id: 'back:range', label: '↩ Ganti Minggu' };
const OPT_BACK_DATE: SchedOption = { id: 'back:date', label: '↩ Ganti Tanggal' };
const OPT_CANCEL: SchedOption = { id: 'confirm:cancel', label: '❌ Batalkan' };

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const CANCEL_RE = /\b(batal|batalkan|cancel|tidak jadi|ga jadi|gak jadi|nggak jadi|enggak jadi)\b/i;
const YES_RE = /^\s*(ya|iya|y|ok|oke|okay|konfirmasi|setuju|betul|benar|lanjut|sip|siap)\b/i;
const CHANGE_RE = /\b(ganti|ubah|reschedule|jadwal lain|tanggal lain)\b/i;
const EXPLICIT_SCHEDULE_RE = /^\s*\/?(jadwal|jadwalkan|booking|book)\s*$/i;
/* Hanya dipakai bila Ollama gagal — supaya fitur jadwal tetap hidup. */
const SCHEDULE_KEYWORD_RE = /\b(jadwal|jadwalkan|meeting|demo|konsultasi|appointment|janji|ketemu|bertemu|zoom|presentasi)\b/i;

export function schedExtractEmail(text: string): string | null {
  const m = String(text || '').match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

export function schedFreshState(): SchedulingState {
  return {
    stage: 'idle', offeredDates: [], offeredTimes: [], meetingType: null, rangeKey: null,
    chosenSlot: null, lastPrompt: null, booking: false,
  };
}

function sch(conv: Conversation): SchedulingState {
  if (!conv.scheduling || !conv.scheduling.offeredDates) conv.scheduling = schedFreshState();
  return conv.scheduling;
}

function setPrompt(conv: Conversation, step: Step): Step {
  sch(conv).lastPrompt = { text: step.text, options: step.options };
  return step;
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

/* Dipertahankan untuk kompatibilitas (default 'this_week'). */
export function schedParseRangeChoice(text: string): 'next_week' | 'this_week' {
  return /depan|dpn|next\s*week/i.test(text || '') ? 'next_week' : 'this_week';
}

/* Versi ketat: null bila teks tidak jelas menyebut minggu mana. */
function schedMatchRange(text: string): 'next_week' | 'this_week' | null {
  if (/depan|dpn|next\s*week/i.test(text)) return 'next_week';
  if (/\bini\b|this\s*week|sekarang/i.test(text)) return 'this_week';
  return null;
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

function startRange(conv: Conversation, meetingType: string | null): Step {
  const type = meetingType || 'konsultasi';
  conv.scheduling = { ...schedFreshState(), stage: 'awaiting_range', meetingType: type };
  return setPrompt(conv, schedBuildRangeQuestion(type));
}

function dateOptions(dates: DateChoice[]): SchedOption[] {
  return [...dates.map((d) => ({ id: `date:${d.date}`, label: `📅 ${schedFormatDateLabel(d)}` })), OPT_BACK_RANGE];
}

export async function schedBuildDateOffer(meetingType: string | null, rangeKey: string | null) {
  const { start, end, label: rangeLabel } = schedWeekRange(rangeKey);
  const typeLabel = apptTypeLabel(meetingType);

  if (!calendlyConfigured()) {
    console.error('[Calendly] schedBuildDateOffer dipanggil tapi Calendly belum dikonfigurasi (token/Event Type URI kosong).');
    return {
      text: 'Mohon maaf, penjadwalan otomatis belum aktif saat ini. Silakan hubungi tim kami langsung ya.',
      options: [] as SchedOption[],
      offeredDates: [] as DateChoice[],
    };
  }

  try {
    const dates = await calendlyGetAvailableDatesInRange(start, end);
    if (!dates.length) {
      return {
        text: `Mohon maaf, tidak ada tanggal kosong untuk ${typeLabel} di ${rangeLabel}. Mau coba rentang lain?`,
        options: schedBuildRangeQuestion(meetingType).options,
        offeredDates: [] as DateChoice[],
      };
    }
    return {
      text: `Berikut tanggal kosong untuk ${typeLabel} di ${rangeLabel}. Silakan pilih salah satu:`,
      options: dateOptions(dates),
      offeredDates: dates,
    };
  } catch (e) {
    console.error('[Calendly] Gagal ambil tanggal available_times (schedBuildDateOffer):', (e as Error).message);
    return {
      text: 'Mohon maaf, sedang ada kendala teknis mengambil jadwal dari sistem kami. Mau coba lagi?',
      options: [{ id: `range:${rangeKey || 'this_week'}`, label: '🔁 Coba Lagi' }, OPT_CANCEL],
      offeredDates: [] as DateChoice[],
    };
  }
}

export async function schedBuildTimeOffer(meetingType: string | null, dateStr: string) {
  const typeLabel = apptTypeLabel(meetingType);
  const dateLabel = apptFormatDateLabel(dateStr);

  try {
    const times = (await calendlyGetAvailableTimesForDate(dateStr)).slice(0, MAX_TIME_ROWS);
    if (!times.length) {
      return {
        text: `Mohon maaf, jam untuk ${dateLabel} sudah penuh. Silakan pilih tanggal lain ya.`,
        options: [OPT_BACK_DATE],
        offeredTimes: [] as TimeSlot[],
      };
    }
    return {
      text: `Baik, untuk ${typeLabel} di ${dateLabel}. Berikut jam yang tersedia, silakan pilih salah satu:`,
      options: [...times.map((t, i) => ({ id: `time:${i}`, label: `⏰ ${calendlyFormatTimeLabel(t.startTime!)}` })), OPT_BACK_DATE],
      offeredTimes: times,
    };
  } catch (e) {
    console.error('[Calendly] Gagal ambil jam available_times (schedBuildTimeOffer):', (e as Error).message);
    return {
      text: `Mohon maaf, sedang ada kendala teknis mengambil jam untuk ${dateLabel}. Mau coba lagi?`,
      options: [{ id: `date:${dateStr}`, label: '🔁 Coba Lagi' }, OPT_BACK_DATE],
      offeredTimes: [] as TimeSlot[],
    };
  }
}

function applyDateOffer(conv: Conversation, offer: { text: string; options: SchedOption[]; offeredDates: DateChoice[] }, rangeKey: string): Step {
  const s = sch(conv);
  s.offeredDates = offer.offeredDates;
  s.offeredTimes = [];
  s.chosenSlot = null;
  s.rangeKey = rangeKey;
  s.stage = offer.offeredDates.length ? 'awaiting_date' : offer.options.length ? 'awaiting_range' : 'idle';
  return setPrompt(conv, { text: offer.text, options: offer.options });
}

function applyTimeOffer(conv: Conversation, offer: { text: string; options: SchedOption[]; offeredTimes: TimeSlot[] }): Step {
  const s = sch(conv);
  s.offeredTimes = offer.offeredTimes;
  s.chosenSlot = null;
  // Tidak ada jam / error → tetap di pilih-tanggal supaya customer bisa ganti tanggal.
  s.stage = offer.offeredTimes.length ? 'awaiting_time' : 'awaiting_date';
  return setPrompt(conv, { text: offer.text, options: offer.options });
}

function displayName(conv: Conversation): string {
  const n = (conv.name || '').trim();
  if (n && !/^\+?\d+$/.test(n)) return n;
  return `Customer ${conv.phone || conv.chatId}`;
}

function buildEmailStep(slot: TimeSlot): Step {
  return {
    text:
      `Jadwal dipilih: ${calendlyFormatSlotLabel(slot.startTime!)}.\n\n` +
      'Supaya undangan kalender bisa dikirim, mohon ketik alamat email Anda (contoh: nama@perusahaan.com).',
    options: [OPT_CANCEL],
  };
}

function buildConfirmStep(conv: Conversation): Step {
  const s = sch(conv);
  const slot = s.chosenSlot!;
  return {
    text:
      'Mohon cek detail jadwal Anda:\n\n' +
      `📌 ${apptTypeLabel(s.meetingType)}\n` +
      `🗓 ${calendlyFormatSlotLabel(slot.startTime!)}\n` +
      `👤 ${displayName(conv)}\n` +
      `📧 ${conv.email}\n\n` +
      'Sudah benar? (Untuk mengganti email, cukup ketik email yang baru.)',
    options: [
      { id: 'confirm:yes', label: '✅ Konfirmasi' },
      { id: 'confirm:change', label: '🔄 Ganti Jadwal' },
      OPT_CANCEL,
    ],
  };
}

/* Setelah customer memilih jam: minta email (kalau belum ada) atau langsung konfirmasi. */
export async function schedConfirmTime(conv: Conversation, index: number): Promise<Step | null> {
  const s = sch(conv);
  const slot = s.offeredTimes[index];
  if (!slot || !slot.startTime) return null;
  s.chosenSlot = slot;
  if (conv.email) {
    s.stage = 'awaiting_confirm';
    return setPrompt(conv, buildConfirmStep(conv));
  }
  s.stage = 'awaiting_email';
  return setPrompt(conv, buildEmailStep(slot));
}

function cancelFlow(conv: Conversation): Step {
  conv.scheduling = schedFreshState();
  return {
    text: 'Baik, penjadwalan dibatalkan. Kalau ingin menjadwalkan lagi, cukup ketik "jadwal" kapan saja ya 😊',
    options: [],
  };
}

/* Pilihan lama / sesi sudah berakhir → ulangi langkah yang sedang berjalan. */
function staleStep(conv: Conversation): Step {
  const s = sch(conv);
  if (s.stage !== 'idle' && s.lastPrompt) {
    return { text: `Pilihan tersebut sudah tidak berlaku. ${s.lastPrompt.text}`, options: s.lastPrompt.options };
  }
  const q = startRange(conv, s.meetingType);
  return { text: `Sesi penjadwalan sebelumnya sudah berakhir. ${q.text}`, options: q.options };
}

async function bookNow(conv: Conversation): Promise<Step> {
  const s = sch(conv);
  const slot = s.chosenSlot;
  const email = conv.email;
  if (!slot || !slot.startTime || !email) {
    const q = startRange(conv, s.meetingType);
    return { text: `Data jadwal belum lengkap, mari kita ulang dari awal ya. ${q.text}`, options: q.options };
  }
  if (s.booking) return { text: 'Permintaan Anda sedang diproses, mohon tunggu sebentar ya 🙏', options: [] };

  s.booking = true;
  const meetingType = s.meetingType || 'konsultasi';
  const provider = conv.provider || 'whatsapp';
  const waPhone = provider === 'whatsapp' && conv.phone ? `+${conv.phone.replace(/\D/g, '')}` : '';
  const slotLabel = calendlyFormatSlotLabel(slot.startTime);

  try {
    const { eventUri, inviteeUri } = await calendlyCreateBooking({
      startTime: slot.startTime, name: displayName(conv), email, phone: waPhone || undefined,
    });

    const record = apptCreateFromAutoBooking({
      chatId: conv.chatId, provider, name: displayName(conv),
      phone: waPhone || (conv.username ? `@${conv.username}` : `Telegram ${conv.chatId}`),
      email, startTime: slot.startTime, meetingType, eventUri, inviteeUri,
    });

    // Link Zoom/Meet kadang baru siap beberapa detik setelah booking.
    let link = '';
    if (eventUri) {
      try {
        link = apptAttachMeetingLink(record, await calendlyGetFreshEventInfo({ uri: eventUri }, 3, 1000));
      } catch { /* link menyusul lewat email Calendly */ }
    }

    conv.scheduling = schedFreshState();
    const text =
      '✅ Jadwal berhasil dikonfirmasi!\n\n' +
      `📌 ${apptTypeLabel(meetingType)}\n` +
      `🗓 ${slotLabel}\n` +
      `📧 Undangan kalender dikirim ke ${email}\n\n` +
      (link ? 'Link meeting ada di tombol di bawah. ' : 'Detail & link meeting akan dikirim ke email Anda. ') +
      'Tim kami akan menghubungi Anda sebelum jadwal. Terima kasih! 🙏';
    return { text, options: link ? [{ id: 'noop', label: 'Buka Link Meeting', url: link }] : [] };
  } catch (e) {
    return handleBookingError(conv, slot, meetingType, e);
  } finally {
    s.booking = false;
  }
}

async function handleBookingError(conv: Conversation, slot: TimeSlot, meetingType: string, e: unknown): Promise<Step> {
  const status = e instanceof CalendlyApiError ? e.status : 0;
  const msg = (e as Error).message || '';
  const s = sch(conv);

  // Email ditolak Calendly → minta ulang.
  if (status === 400 && /e-?mail/i.test(msg)) {
    conv.email = null;
    s.stage = 'awaiting_email';
    return setPrompt(conv, {
      text: 'Maaf, email tersebut tidak diterima oleh sistem penjadwalan. Mohon ketik ulang alamat email yang valid.',
      options: [OPT_CANCEL],
    });
  }

  // Jam baru saja diambil orang lain → tawarkan jam lagi di tanggal yang sama.
  if (status === 409 || (status === 400 && /availab|taken|booked|slot|time/i.test(msg))) {
    const offer = await schedBuildTimeOffer(meetingType, slot.date);
    applyTimeOffer(conv, offer);
    return setPrompt(conv, { text: `Mohon maaf, jam tersebut baru saja terisi. ${offer.text}`, options: offer.options });
  }

  if (status === 403 || status === 401) {
    console.error(
      `[Calendly] Booking otomatis ditolak (${status}): ${msg}. Penyebab umum: akun Calendly plan Free ` +
      '(Scheduling API butuh plan berbayar) atau token tanpa scope scheduled_events:write. Fallback ke link booking.'
    );
  } else {
    console.error('[Calendly] Booking otomatis gagal, fallback ke link booking:', msg);
  }

  // Fallback: perilaku lama — kirim link booking Calendly.
  conv.scheduling = schedFreshState();
  if (slot.schedulingUrl) {
    return {
      text: `Baik, untuk ${calendlyFormatSlotLabel(slot.startTime!)}, silakan konfirmasi & selesaikan booking lewat tombol di bawah ya:`,
      options: [{ id: 'noop', label: 'Konfirmasi & Booking Sekarang', url: slot.schedulingUrl }],
    };
  }
  return {
    text: 'Mohon maaf, booking otomatis sedang bermasalah. Tim kami akan menghubungi Anda untuk mengatur jadwalnya.',
    options: [],
  };
}

export interface ButtonResolveResult extends Step {
  chosenLabel: string;
}

/* Dipanggil saat customer menekan tombol (WABA interactive / Telegram callback).
   Selalu mengembalikan balasan (tidak pernah diam), kecuali tombol link (noop). */
export async function schedResolveButtonId(conv: Conversation, id: string): Promise<ButtonResolveResult | null> {
  const s = sch(conv);
  const [kind, ...rest] = String(id).split(':');
  const val = rest.join(':');
  const wrap = (step: Step, chosenLabel: string): ButtonResolveResult => ({ ...step, chosenLabel });
  const stale = () => wrap(staleStep(conv), '-');

  if (kind === 'noop') return null;

  if (kind === 'range') {
    if (s.stage !== 'awaiting_range') return stale();
    const rangeKey = val === 'next_week' ? 'next_week' : 'this_week';
    const offer = await schedBuildDateOffer(s.meetingType, rangeKey);
    return wrap(applyDateOffer(conv, offer, rangeKey), rangeKey === 'next_week' ? 'Minggu Depan' : 'Minggu Ini');
  }

  if (kind === 'date') {
    if (s.stage !== 'awaiting_date') return stale();
    const matched = s.offeredDates.find((d) => d.date === val);
    if (!matched) return stale();
    const offer = await schedBuildTimeOffer(s.meetingType, val);
    return wrap(applyTimeOffer(conv, offer), schedFormatDateLabel(matched));
  }

  if (kind === 'time') {
    if (s.stage !== 'awaiting_time') return stale();
    const idx = Number(val);
    const slot = s.offeredTimes[idx];
    if (!slot) return stale();
    const step = await schedConfirmTime(conv, idx);
    return step ? wrap(step, schedFormatTimeLabel(slot)) : stale();
  }

  if (kind === 'back') {
    if (val === 'range') return wrap(startRange(conv, s.meetingType), 'Ganti Minggu');
    if (val === 'date') {
      if (!s.offeredDates.length) return wrap(startRange(conv, s.meetingType), 'Ganti Tanggal');
      s.stage = 'awaiting_date';
      s.offeredTimes = [];
      s.chosenSlot = null;
      return wrap(setPrompt(conv, { text: 'Silakan pilih tanggal yang Anda inginkan:', options: dateOptions(s.offeredDates) }), 'Ganti Tanggal');
    }
  }

  if (kind === 'confirm') {
    if (val === 'cancel') return wrap(cancelFlow(conv), 'Batalkan');
    if (val === 'change' && s.stage === 'awaiting_confirm') return wrap(startRange(conv, s.meetingType), 'Ganti Jadwal');
    if (val === 'yes' && s.stage === 'awaiting_confirm') return wrap(await bookNow(conv), 'Konfirmasi');
  }

  return stale();
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

/* Customer mengetik nomor (fallback teks bernomor) atau persis label tombol → id tombolnya. */
function matchOptionByText(text: string, options: SchedOption[]): string | null {
  const t = text.trim().toLowerCase();
  if (!t || !options.length) return null;
  if (/^\d{1,2}$/.test(t)) {
    const opt = options[Number(t) - 1];
    return opt && !opt.url ? opt.id : null;
  }
  const strip = (label: string) => label.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();
  const hit = options.find((o) => !o.url && strip(o.label) === t);
  return hit ? hit.id : null;
}

// ── Klasifikasi niat via Ollama ──
export async function classifySchedulingIntent(conv: Conversation, incomingText: string, offeredLabels: string[]) {
  const prompt = buildSchedulingIntentPrompt(conv, incomingText, offeredLabels);
  try {
    const parsed = await ollamaGenerateJson<any>(prompt, { model: OLLAMA_MODEL, temperature: 0.1 });
    const idx = Number(parsed.picks_slot_index);
    return {
      failed: false,
      wantsSchedule: !!parsed.wants_schedule,
      picksSlotIndex: Number.isInteger(idx) && idx > 0 ? idx : null,
      meetingTypeGuess: APPT_TYPE_LABELS[parsed.meeting_type_guess] ? String(parsed.meeting_type_guess) : 'konsultasi',
    };
  } catch (err) {
    console.error('[Scheduling] Gagal klasifikasi intent:', (err as Error).message);
    return { failed: true, wantsSchedule: false, picksSlotIndex: null as number | null, meetingTypeGuess: 'konsultasi' };
  }
}

export async function generateConversationReply(conv: Conversation, incomingText: string): Promise<string> {
  return ollamaGenerate(buildConversationPrompt(conv, incomingText), { model: OLLAMA_MODEL, temperature: 0.7 });
}

/* Customer mengetik teks bebas di tengah alur (mis. bertanya harga): jawab dulu
   lewat AI, lalu tampilkan lagi pilihan yang sedang berjalan. */
async function answerThenReprompt(conv: Conversation, text: string): Promise<Step> {
  const p = sch(conv).lastPrompt;
  let ai = '';
  try {
    ai = await generateConversationReply(conv, text);
  } catch (e) {
    console.error('[Scheduling] Gagal membuat jawaban AI di tengah alur jadwal:', (e as Error).message);
  }
  return {
    text: ai ? `${ai}\n\nSilakan lanjutkan memilih jadwal ya:` : 'Maaf, saya belum menangkap pilihan Anda. Silakan pilih salah satu opsi di bawah ya:',
    options: p ? p.options : [],
  };
}

/* Handler utama pesan TEKS masuk — dipakai Telegram & WhatsApp. */
export async function handleMessageAndMaybeSchedule(conv: Conversation, incomingText: string): Promise<ReplyResult> {
  const s = sch(conv);
  const text = String(incomingText || '').trim();
  const out = (step: Step): ReplyResult => ({ text: step.text, replyMarkup: tgOptionsToKeyboard(step.options), options: step.options });

  if (s.stage !== 'idle') {
    if (CANCEL_RE.test(text)) return out(cancelFlow(conv));

    const optId = matchOptionByText(text, s.lastPrompt ? s.lastPrompt.options : []);
    if (optId) {
      const r = await schedResolveButtonId(conv, optId);
      if (r) return out(r);
    }

    switch (s.stage) {
      case 'awaiting_range': {
        const k = schedMatchRange(text);
        if (k) {
          const r = await schedResolveButtonId(conv, `range:${k}`);
          if (r) return out(r);
        }
        break;
      }
      case 'awaiting_date': {
        const intent = await classifySchedulingIntent(conv, text, s.offeredDates.map((d) => schedFormatDateLabel(d)));
        const picked = intent.picksSlotIndex ? s.offeredDates[intent.picksSlotIndex - 1] : null;
        if (picked) {
          const r = await schedResolveButtonId(conv, `date:${picked.date}`);
          if (r) return out(r);
        }
        break;
      }
      case 'awaiting_time': {
        const intent = await classifySchedulingIntent(conv, text, s.offeredTimes.map((t) => schedFormatTimeLabel(t)));
        if (intent.picksSlotIndex && s.offeredTimes[intent.picksSlotIndex - 1]) {
          const r = await schedResolveButtonId(conv, `time:${intent.picksSlotIndex - 1}`);
          if (r) return out(r);
        }
        break;
      }
      case 'awaiting_email': {
        const email = schedExtractEmail(text);
        if (email) {
          conv.email = email;
          s.stage = 'awaiting_confirm';
          return out(setPrompt(conv, buildConfirmStep(conv)));
        }
        if (!text.includes('?')) {
          return out(setPrompt(conv, {
            text: 'Format email belum terbaca. Mohon ketik alamat email yang valid, contoh: nama@perusahaan.com',
            options: [OPT_CANCEL],
          }));
        }
        break;
      }
      case 'awaiting_confirm': {
        const email = schedExtractEmail(text);
        if (email) {
          conv.email = email;
          return out(setPrompt(conv, buildConfirmStep(conv)));
        }
        if (YES_RE.test(text)) return out(await bookNow(conv));
        if (CHANGE_RE.test(text)) return out(startRange(conv, s.meetingType));
        break;
      }
    }
    return out(await answerThenReprompt(conv, text));
  }

  // stage idle: apakah customer ingin menjadwalkan?
  if (EXPLICIT_SCHEDULE_RE.test(text)) return out(startRange(conv, 'konsultasi'));
  const intent = await classifySchedulingIntent(conv, text, []);
  if (intent.wantsSchedule || (intent.failed && SCHEDULE_KEYWORD_RE.test(text))) {
    return out(startRange(conv, intent.meetingTypeGuess));
  }

  const freeText = await generateConversationReply(conv, text);
  return { text: freeText, replyMarkup: null, options: [] };
}
