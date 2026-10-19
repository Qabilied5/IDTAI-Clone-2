/* =============================================================
   src/server/calendly.ts
   Integrasi Calendly: slot ASLI dari kalender, scheduling link, dan
   polling booking baru (pengganti webhook yang dikunci di plan Free).
   ============================================================= */
import { APPT_DEFAULT_DURATION, APPT_DEFAULT_STAFF, CALENDLY_API_BASE } from './config';
import { apptPad, apptTypeLabel } from './appointments';
import { xfetch } from './fetch';
import { clearIntegration, saveIntegration } from './integration-store';
import { requireOrgId } from './org-context';
import { calendlyConfigured, state } from './state';
import { apptSave } from './store';
import type { AiAppointment, DateChoice, TimeSlot } from './types';

/* Error API Calendly + status HTTP-nya — dipakai alur booking otomatis untuk
   membedakan "plan Free (403)" vs "slot sudah terisi (409/400)" vs error lain. */
export class CalendlyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'CalendlyApiError';
    this.status = status;
  }
}

export async function calendlyFetch(pathOrUrl: string, options: RequestInit = {}): Promise<any> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${CALENDLY_API_BASE}${pathOrUrl}`;
  const res = await xfetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.CALENDLY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[Calendly] API error, detail lengkap:', res.status, JSON.stringify(data));
    throw new CalendlyApiError(data.message || data.title || `Calendly API error ${res.status}`, res.status);
  }
  return data;
}

export async function calendlyGetAvailableSlots(limit = 3, lookaheadDays = 14) {
  const now = new Date();
  return calendlyGetAvailableSlotsInRange(limit, now, new Date(now.getTime() + lookaheadDays * 86400000));
}

export async function calendlyGetAvailableSlotsInRange(limit: number, startDate: Date, endDate: Date) {
  if (!calendlyConfigured()) return [] as { startTime: string; schedulingUrl: string }[];
  const slots: { startTime: string; schedulingUrl: string }[] = [];
  const seenDates = new Set<string>();
  let windowStart = startDate;

  while (slots.length < limit && windowStart < endDate) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + 6 * 86400000, endDate.getTime()));
    try {
      const qs = new URLSearchParams({
        event_type: state.CALENDLY_EVENT_TYPE_URI,
        start_time: windowStart.toISOString(),
        end_time: windowEnd.toISOString(),
      });
      const data = await calendlyFetch(`/event_type_available_times?${qs.toString()}`);
      for (const s of (data.collection || [])) {
        if (s.status !== 'available') continue;
        const dateKey = new Date(s.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        if (seenDates.has(dateKey)) continue;
        seenDates.add(dateKey);
        slots.push({ startTime: s.start_time, schedulingUrl: s.scheduling_url });
        if (slots.length >= limit) break;
      }
    } catch (e) {
      console.error('[Calendly] Gagal ambil available_times:', (e as Error).message);
      break;
    }
    windowStart = new Date(windowEnd.getTime() + 1000);
  }
  return slots;
}

export function calendlyFormatSlotLabel(iso: string): string {
  const d = new Date(iso);
  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
  const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
  const timeLabel = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  return `${dayName}, ${dateLabel} jam ${timeLabel} WIB`;
}

export function calendlyFormatDateLabel(iso: string): string {
  const d = new Date(iso);
  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
  const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
  return `${dayName}, ${dateLabel}`;
}

export function calendlyFormatTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`;
}

export function calendlyDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

/* Error API SENGAJA tidak ditelan — dilempar ke pemanggil supaya customer
   dapat pesan "kendala teknis", bukan "tidak ada tanggal kosong". */
export async function calendlyGetAvailableDatesInRange(startDate: Date, endDate: Date): Promise<DateChoice[]> {
  if (!calendlyConfigured()) return [];
  const seenDates = new Set<string>();
  let windowStart = startDate;

  while (windowStart < endDate) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + 6 * 86400000, endDate.getTime()));
    const qs = new URLSearchParams({
      event_type: state.CALENDLY_EVENT_TYPE_URI,
      start_time: windowStart.toISOString(),
      end_time: windowEnd.toISOString(),
    });
    const data = await calendlyFetch(`/event_type_available_times?${qs.toString()}`);
    for (const s of (data.collection || [])) {
      if (s.status !== 'available') continue;
      const d = new Date(s.start_time);
      if (d.getDay() === 0) continue;
      seenDates.add(calendlyDateKey(s.start_time));
    }
    windowStart = new Date(windowEnd.getTime() + 1000);
  }
  return [...seenDates].sort().map((date) => ({ date, source: 'calendly' as const }));
}

export async function calendlyGetAvailableTimesForDate(dateStr: string): Promise<TimeSlot[]> {
  if (!calendlyConfigured()) return [];
  const now = new Date();
  let startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59+07:00`);
  const bufferedNow = new Date(now.getTime() + 2 * 60 * 1000);
  if (startOfDay < bufferedNow) startOfDay = bufferedNow;
  if (startOfDay >= endOfDay) return [];

  const qs = new URLSearchParams({
    event_type: state.CALENDLY_EVENT_TYPE_URI,
    start_time: startOfDay.toISOString(),
    end_time: endOfDay.toISOString(),
  });
  const data = await calendlyFetch(`/event_type_available_times?${qs.toString()}`);
  return (data.collection || [])
    .filter((s: any) => s.status === 'available')
    .map((s: any) => ({ date: dateStr, startTime: s.start_time, schedulingUrl: s.scheduling_url, source: 'calendly' as const }));
}

export async function calendlyCreateSchedulingLink(): Promise<string | undefined> {
  const data = await calendlyFetch('/scheduling_links', {
    method: 'POST',
    body: JSON.stringify({
      max_event_count: 1,
      owner: state.CALENDLY_EVENT_TYPE_URI,
      owner_type: 'EventType',
    }),
  });
  return data.resource && data.resource.booking_url;
}

/* ── BOOKING OTOMATIS (Calendly Scheduling API: POST /invitees) ───────────
   Membuat event langsung dari chat tanpa customer membuka halaman Calendly.
   SYARAT: akun Calendly plan berbayar (Standard ke atas) dan token punya
   scope `scheduled_events:write`. Plan Free → 403 (ditangani pemanggil
   dengan fallback ke link booking). */

/* Lokasi event type harus ikut dikirim bila event type-nya punya lokasi
   (aturan API: kind wajib bila location diisi, dan harus sama dengan lokasi
   di event type; jangan dikirim untuk event type round_robin). Kalau event
   type tidak punya lokasi, location dihilangkan. */
async function calendlyGetBookingLocation(inviteePhone?: string): Promise<Record<string, unknown> | undefined> {
  try {
    const data = await calendlyFetch(state.CALENDLY_EVENT_TYPE_URI);
    const et = data && data.resource;
    if (!et || et.pooling_type === 'round_robin') return undefined;
    const loc = Array.isArray(et.locations) ? et.locations[0] : null;
    if (!loc || !loc.kind) return undefined;

    switch (loc.kind) {
      case 'physical':
      case 'custom':
      case 'inbound_call':
        return loc.location ? { kind: loc.kind, location: loc.location } : { kind: loc.kind };
      case 'outbound_call':
        return inviteePhone ? { kind: loc.kind, location: inviteePhone } : undefined;
      case 'ask_invitee':
        return { kind: loc.kind, location: 'Akan dikonfirmasi oleh tim kami' };
      default:
        // zoom_conference, google_conference, microsoft_teams_conference, dst.
        return { kind: loc.kind };
    }
  } catch (e) {
    console.error('[Calendly] Gagal membaca lokasi event type, booking dicoba tanpa location:', (e as Error).message);
    return undefined;
  }
}

export interface CalendlyBookingInput {
  startTime: string; // ISO UTC, persis dari event_type_available_times
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
}

export async function calendlyCreateBooking(input: CalendlyBookingInput): Promise<{ eventUri: string; inviteeUri: string }> {
  const location = await calendlyGetBookingLocation(input.phone);
  const body: Record<string, unknown> = {
    event_type: state.CALENDLY_EVENT_TYPE_URI,
    start_time: input.startTime,
    invitee: { name: input.name, email: input.email, timezone: input.timezone || 'Asia/Jakarta' },
  };
  if (location) body.location = location;

  const data = await calendlyFetch('/invitees', { method: 'POST', body: JSON.stringify(body) });
  const r = (data && data.resource) || {};
  const eventUri: string = r.event || '';
  // Tandai SEGERA (sinkron) supaya polling 2-menit tidak membuat appointment ganda.
  if (eventUri) state.calKnownEventUris.add(eventUri);
  return { eventUri, inviteeUri: r.uri || '' };
}

export interface AutoBookingRecordInput {
  chatId: string;
  provider: 'telegram' | 'whatsapp';
  name: string;
  phone: string;
  email: string;
  startTime: string;
  meetingType: string;
  eventUri: string;
  inviteeUri: string;
}

/* Catat appointment hasil booking otomatis lewat chat. Dibuat SEGERA setelah
   Calendly menjawab (sebelum link meeting siap) supaya webhook/polling yang
   datang belakangan menemukan record ini lewat calendlyEventUri dan tidak
   membuat duplikat. */
export function apptCreateFromAutoBooking(input: AutoBookingRecordInput): AiAppointment {
  const startIso = input.startTime;
  const dateStr = new Date(startIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const timeStr = new Date(startIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
  const channel = input.provider === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  const slotLabel = calendlyFormatSlotLabel(startIso);

  const record: AiAppointment = {
    id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nama: input.name,
    company: '-',
    phone: input.phone || '-',
    email: input.email,
    date: dateStr,
    time: timeStr,
    duration: APPT_DEFAULT_DURATION,
    type: input.meetingType,
    typeLabel: apptTypeLabel(input.meetingType),
    sales: APPT_DEFAULT_STAFF,
    status: 'terkonfirmasi',
    createdBy: 'ai',
    location: '',
    notes: `Dibooking otomatis dari percakapan ${channel} (chat ID ${input.chatId}).`,
    aiNote: `Jadwal dipilih customer lewat tombol di chat ${channel}, lalu AI membuat booking langsung di Calendly — sudah terkonfirmasi dan undangan dikirim ke ${input.email}. Tentukan PIC dan kirim follow-up bila perlu.`,
    chatId: input.chatId,
    leadId: null,
    calendlyEventUri: input.eventUri || null,
    calendlyInviteeUri: input.inviteeUri || null,
    timeline: [
      { type: 'ai', event: `AI menawarkan jadwal via ${channel}`, sub: 'Customer memilih minggu, tanggal, dan jam lewat tombol', time: 'Baru saja' },
      { type: 'success', event: 'Customer memilih & mengonfirmasi jadwal', sub: slotLabel, time: 'Baru saja' },
      { type: 'success', event: 'AI membuat booking di Calendly', sub: `Terkonfirmasi — undangan dikirim ke ${input.email}. PIC sementara: ${APPT_DEFAULT_STAFF}`, time: 'Baru saja' },
    ],
  };
  state.aiAppointments.push(record);
  apptSave();
  return record;
}

/* Isi link meeting (Zoom/Meet) ke record setelah Calendly selesai membuatnya. */
export function apptAttachMeetingLink(record: AiAppointment, eventInfo: any) {
  const loc = (eventInfo && eventInfo.location) || {};
  const link: string = loc.join_url || loc.location || '';
  if (!link) return '';
  record.location = link;
  record.timeline.push({ type: 'ai', event: 'Link meeting otomatis terisi', sub: link, time: 'Baru saja' });
  return link;
}

/* Ambil ulang detail event beberapa kali sampai link Zoom/Meet siap. */
export async function calendlyGetFreshEventInfo(eventInfo: any, attempts = 4, delayMs = 1500): Promise<any> {
  if (!eventInfo.uri) return eventInfo;
  for (let i = 0; i < attempts; i++) {
    try {
      const data = await calendlyFetch(eventInfo.uri);
      const fresh = data && data.resource;
      if (fresh) {
        const status = fresh.location && fresh.location.status;
        if (!status || status === 'pushed' || i === attempts - 1) return fresh;
      }
    } catch (e) {
      console.error('[Calendly] Gagal ambil detail event terbaru, pakai data webhook awal:', (e as Error).message);
      return eventInfo;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return eventInfo;
}

export function apptCreateFromCalendlyBooking(payload: any, eventInfo: any): AiAppointment {
  const existingFromThisEvent = eventInfo.uri
    ? state.aiAppointments.find((a) => a.calendlyEventUri === eventInfo.uri)
    : null;
  if (existingFromThisEvent) {
    console.log(`[Calendly] Event ${eventInfo.uri} sudah tercatat sebagai appointment ${existingFromThisEvent.id} — dilewati, tidak dibuat duplikat.`);
    return existingFromThisEvent;
  }

  const startIso: string = eventInfo.start_time;
  const d = new Date(startIso);
  const dateStr = `${d.getFullYear()}-${apptPad(d.getMonth() + 1)}-${apptPad(d.getDate())}`;
  const timeStr = `${apptPad(d.getHours())}.${apptPad(d.getMinutes())}`;
  const locationInfo = eventInfo.location || {};
  const meetingLocation = locationInfo.join_url || locationInfo.location || '';
  const hasZoomLink = !!locationInfo.join_url;

  const endIso: string | undefined = eventInfo.end_time;
  const rawDurationMinutes = endIso ? Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000) : NaN;
  const durationMinutes = Number.isFinite(rawDurationMinutes) && rawDurationMinutes > 0
    ? rawDurationMinutes
    : APPT_DEFAULT_DURATION;

  const record: AiAppointment = {
    id: `cal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nama: payload.name || '-',
    company: '-',
    phone: payload.text_reminder_number || '-',
    email: payload.email || '',
    date: dateStr,
    time: timeStr,
    duration: durationMinutes,
    type: 'konsultasi',
    typeLabel: apptTypeLabel('konsultasi'),
    sales: APPT_DEFAULT_STAFF,
    status: 'menunggu',
    createdBy: 'calendly',
    location: meetingLocation,
    notes: `Dibuat otomatis dari booking Calendly (${payload.email || '-'}).`,
    aiNote: hasZoomLink
      ? 'Appointment ini dibuat otomatis lewat link Calendly yang dikirim AI ke customer via chat. Link meeting Zoom sudah otomatis terisi di kolom Lokasi. Mohon konfirmasi lalu kirim follow-up.'
      : 'Appointment ini dibuat otomatis lewat link Calendly yang dikirim AI ke customer via chat. Mohon konfirmasi, lengkapi lokasi/link meeting bila belum ada, lalu kirim follow-up.',
    chatId: null,
    leadId: null,
    calendlyEventUri: eventInfo.uri || null,
    timeline: [
      { type: 'success', event: 'Customer booking langsung lewat Calendly', sub: calendlyFormatSlotLabel(startIso), time: 'Baru saja' },
      {
        type: 'ai',
        event: 'Appointment otomatis dibuat dari webhook Calendly',
        sub: hasZoomLink
          ? `Link Zoom otomatis terisi — menunggu konfirmasi admin (PIC sementara: ${APPT_DEFAULT_STAFF})`
          : `Menunggu konfirmasi admin — PIC sementara: ${APPT_DEFAULT_STAFF}`,
        time: 'Baru saja',
      },
    ],
  };
  state.aiAppointments.push(record);
  apptSave();
  return record;
}

/* Polling fallback (plan Free tidak bisa daftar webhook). Dipanggil tiap 2 menit. */
export async function calendlyPollNewBookings() {
  if (!calendlyConfigured() || !state.calendlyUserInfo) return;

  if (!state.calendlyLastPolledAt) {
    state.calendlyLastPolledAt = new Date().toISOString();
    return;
  }

  try {
    const qs = new URLSearchParams({
      user: state.calendlyUserInfo.uri,
      status: 'active',
      sort: 'start_time:asc',
      count: '100',
      min_start_time: state.calendlyLastPolledAt,
    });
    const data = await calendlyFetch(`/scheduled_events?${qs.toString()}`);
    const events = data.collection || [];

    for (const ev of events) {
      if (state.calKnownEventUris.has(ev.uri)) continue;
      state.calKnownEventUris.add(ev.uri);

      let invitee: any = {};
      try {
        const inviteesData = await calendlyFetch(`${ev.uri}/invitees`);
        invitee = (inviteesData.collection && inviteesData.collection[0]) || {};
      } catch (e) {
        console.error('[Calendly] Gagal ambil invitee utk', ev.uri, '—', (e as Error).message);
      }

      const payload = {
        name: invitee.name || '-',
        email: invitee.email || '',
        text_reminder_number: invitee.text_reminder_number || '-',
      };
      const eventInfo = await calendlyGetFreshEventInfo(ev);
      console.log(`[Calendly] Booking baru terdeteksi via polling dari ${payload.email || '-'} untuk ${eventInfo.start_time}`);
      apptCreateFromCalendlyBooking(payload, eventInfo);
    }
  } catch (err) {
    console.error('[Calendly] Gagal polling scheduled_events:', (err as Error).message);
  }
}

/* ── Konfigurasi dari halaman Integrasi ─────────────────────────────────
   Event Type boleh diisi: (a) URI API  https://api.calendly.com/event_types/XXXX
   (b) link Calendly biasa  https://calendly.com/nama/30min  (c) slug "30min"
   (d) kosong — dipakai hanya bila akun punya SATU event type aktif.
   Supaya pengguna tidak perlu mencari URI API sendiri. */

export interface CalendlyEventTypeInfo {
  uri: string;
  name: string;
  duration: number | null;
  schedulingUrl: string;
}

function toEventTypeInfo(r: any): CalendlyEventTypeInfo {
  return {
    uri: r.uri,
    name: r.name || '-',
    duration: typeof r.duration === 'number' ? r.duration : null,
    schedulingUrl: r.scheduling_url || '',
  };
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

async function calendlyGetWithToken(token: string, path: string): Promise<any> {
  const res = await xfetch(`${CALENDLY_API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw badRequest((data.message || data.title) || `Calendly API error ${res.status}`);
  return data;
}

const normUrl = (u: string) => u.trim().toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');

export async function calendlyResolveEventType(token: string, userUri: string, input: string): Promise<CalendlyEventTypeInfo> {
  const raw = (input || '').trim();

  // (a) URI API → ambil langsung (sekaligus memastikan token berhak mengaksesnya)
  if (/^https:\/\/api\.calendly\.com\/event_types\/[\w-]+$/i.test(raw)) {
    try {
      const data = await calendlyGetWithToken(token, raw.replace(CALENDLY_API_BASE, ''));
      return toEventTypeInfo(data.resource);
    } catch (e) {
      throw badRequest(`Event type tidak ditemukan atau token tidak berhak mengaksesnya (${(e as Error).message}).`);
    }
  }

  const qs = new URLSearchParams({ user: userUri, active: 'true', count: '100' });
  const data = await calendlyGetWithToken(token, `/event_types?${qs.toString()}`);
  const list: any[] = data.collection || [];
  if (!list.length) throw badRequest('Akun Calendly ini belum punya event type aktif. Buat dulu di Calendly, lalu coba lagi.');

  const available = list.slice(0, 5).map((e) => `• ${e.name}: ${e.scheduling_url}`).join('\n');

  if (!raw) {
    if (list.length === 1) return toEventTypeInfo(list[0]);
    throw badRequest(`Akun punya ${list.length} event type — isi salah satu link-nya:\n${available}`);
  }

  // (b) link publik / (c) slug
  const want = normUrl(raw);
  const slug = want.split('/').pop() || want;
  const hit = list.find((e) => normUrl(e.scheduling_url || '') === want) || list.find((e) => String(e.slug || '').toLowerCase() === slug);
  if (!hit) throw badRequest(`Event type "${raw}" tidak ditemukan di akun ini. Yang tersedia:\n${available}`);
  return toEventTypeInfo(hit);
}

/* Simpan kredensial runtime (dipanggil POST /api/calendly/config). */
export async function calendlySetConfig(token: string, eventTypeInput: string) {
  const orgId = requireOrgId();
  const meRes = await xfetch(`${CALENDLY_API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  const meData: any = await meRes.json().catch(() => ({}));
  if (!meRes.ok || !meData.resource) {
    throw Object.assign(new Error((meData.message || meData.title) || 'Token tidak valid'), { status: 400 });
  }

  const eventType = await calendlyResolveEventType(token, meData.resource.uri, eventTypeInput);
  const credentialsChanged = token !== state.CALENDLY_ACCESS_TOKEN || eventType.uri !== state.CALENDLY_EVENT_TYPE_URI;

  const userInfo = {
    uri: meData.resource.uri,
    name: meData.resource.name,
    email: meData.resource.email,
    organizationUri: meData.resource.current_organization,
  };
  await saveIntegration(
    orgId,
    'calendly',
    {
      token,
      eventTypeUri: eventType.uri,
      userInfo: JSON.stringify(userInfo),
      eventType: JSON.stringify(eventType),
    },
    {
      status: 'connected',
      accountLabel: userInfo.email ? `${userInfo.name} (${userInfo.email})` : userInfo.name,
      lastStatus: eventType.name ? `Event type: ${eventType.name}` : 'Aktif',
    }
  );

  state.CALENDLY_ACCESS_TOKEN = token;
  state.CALENDLY_EVENT_TYPE_URI = eventType.uri;
  state.calendlyEventType = eventType;
  state.calendlyUserInfo = {
    uri: meData.resource.uri,
    name: meData.resource.name,
    email: meData.resource.email,
    organizationUri: meData.resource.current_organization,
  };

  if (credentialsChanged) {
    state.calendlyLastPolledAt = null;
    state.calKnownEventUris.clear();
  }
  return { user: state.calendlyUserInfo, eventType };
}

export async function calendlyClearConfig() {
  await clearIntegration(requireOrgId(), 'calendly');
  state.CALENDLY_ACCESS_TOKEN = '';
  state.CALENDLY_EVENT_TYPE_URI = '';
  state.calendlyUserInfo = null;
  state.calendlyEventType = null;
  state.calendlyLastPolledAt = null;
  state.calKnownEventUris.clear();
}
