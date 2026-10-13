/* Tipe bersama untuk modul backend. Sengaja longgar di beberapa tempat
   (index signature) supaya bentuk objek 1:1 dengan server.js lama dan
   frontend yang sudah membaca field-field tsb tidak perlu diubah. */

export type MessageDir = 'in' | 'out';
export type MessageFrom = 'user' | 'ai' | 'human' | 'system';

export interface ChatMessage {
  id: number;
  dir: MessageDir;
  from: MessageFrom;
  text: string;
  time: number;
}

export interface SchedOption {
  id: string;
  label: string;
  url?: string;
}

export interface DateChoice {
  date: string;
  source: 'internal' | 'calendly';
}

export interface TimeSlot {
  date: string;
  source: 'internal' | 'calendly';
  // internal
  time?: string;
  endTime?: string;
  // calendly
  startTime?: string;
  schedulingUrl?: string;
}

export type SchedStage =
  | 'idle'
  | 'awaiting_range'
  | 'awaiting_date'
  | 'awaiting_time'
  | 'awaiting_email'
  | 'awaiting_confirm';

export interface SchedulingState {
  stage: SchedStage;
  offeredDates: DateChoice[];
  offeredTimes: TimeSlot[];
  meetingType: string | null;
  rangeKey: string | null;
  /* Slot yang dipilih customer, menunggu email/konfirmasi sebelum di-booking. */
  chosenSlot?: TimeSlot | null;
  /* Pesan + tombol terakhir yang dikirim — dipakai untuk mengulang prompt saat
     customer mengetik teks bebas / menekan tombol lama di tengah alur. */
  lastPrompt?: { text: string; options: SchedOption[] } | null;
  /* true selama request booking ke Calendly berjalan (cegah double-tap). */
  booking?: boolean;
}

export interface Conversation {
  chatId: string;
  name: string;
  username?: string;
  initials?: string;
  phone: string;
  introSent: boolean;
  handledBy: 'ai' | 'human';
  lastMessageText: string;
  lastMessageTime: number;
  unread: number;
  messages: ChatMessage[];
  provider?: 'telegram' | 'whatsapp';
  scheduling?: SchedulingState;
  /* Email customer (dikumpulkan sekali saat booking, dipakai ulang). */
  email?: string | null;
  escalated?: boolean;
  escalationReason?: string | null;
  escalatedAt?: number | null;
  picId?: number | null;
  picName?: string | null;
}

export interface PicAgent {
  id: number;
  nama: string;
  email: string;
  role: string;
  status: string;
  initials: string;
  chat: number;
}

export interface EscalationSettings {
  keywords: string[];
  humanRequestKeywords: string[];
  priceNegotiationKeywords: string[];
  priceLimitPercent: number;
  repeatThreshold: number;
  stallMinutes: number;
  triggers: {
    sensitiveKeyword: boolean;
    repeatedQuestion: boolean;
    priceNegotiation: boolean;
    humanRequest: boolean;
    stalled: boolean;
  };
  notifyCustomer: boolean;
  handoffMessage: string;
}

export interface KbDoc {
  id: number;
  title: string;
  category: string;
  status: 'aktif' | 'nonaktif' | 'draft';
  sourceType: 'file' | 'url' | 'teks';
  fileName?: string | null;
  fileExt?: string | null;
  storedPath?: string;
  sizeBytes?: number;
  url?: string | null;
  autoSync?: boolean;
  crawlBatchId?: string | null;
  content: string;
  aiFiltered?: boolean;
  aiFilterNote?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CrawlJob {
  id: string;
  startUrl: string;
  category: string;
  maxPages: number;
  maxDepth: number;
  sameDomainOnly: boolean;
  aiFilter: boolean;
  aiFilterTotalPages: number;
  aiFilterFailedPages: number;
  status: 'running' | 'done' | 'cancelled' | 'error';
  cancelled: boolean;
  pagesVisited: number;
  currentUrl: string;
  docsCreated: any[];
  errors: string[];
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface Lead {
  id?: string | number;
  nama: string;
  perusahaan?: string;
  kota?: string;
  sumber?: string;
  aiScore?: string;
  status?: string;
  phone?: string;
  [key: string]: any;
}

export interface TimelineItem {
  type: string;
  event: string;
  sub: string;
  time: string;
}

export interface AiAppointment {
  id: string;
  nama: string;
  company: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  typeLabel: string;
  sales: string;
  status: string;
  createdBy: string;
  location: string;
  notes: string;
  aiNote: string;
  chatId: string | null;
  leadId: string | null;
  calendlyEventUri?: string | null;
  calendlyInviteeUri?: string | null;
  timeline: TimelineItem[];
}

export interface SendLogEntry {
  id: number;
  leadId: any;
  leadNama: string;
  message: string;
  provider: string;
  timestamp: string;
}

export interface ReplyResult {
  text: string;
  replyMarkup?: any;
  options: SchedOption[];
}

/* ── Pipeline (Kanban deal) ── */
export interface PipelineActivity {
  text: string;
  time: string;
}

export interface PipelineDeal {
  id: string;
  company: string;
  contactName: string;
  product: string;
  value: number;
  stage: string;
  type: 'baru' | 'upsell' | 'renewal';
  pic: string;
  recurring: boolean;
  interval: string | null;
  endDate: string | null;
  date: string;
  notes: string;
  activity: PipelineActivity[];
  leadId?: number | null;
  sheetRow?: number | null;
}

export interface PipelineStage {
  id: string;
  label: string;
}
