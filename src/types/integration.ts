/** Respons GET /api/telegram/status dari backend Express (server.js). */
export interface TelegramStatus {
  ok: boolean;
  configured: boolean;
  polling: boolean;
  bot?: {
    username?: string;
  } | null;
}

/** Respons GET /api/waba/status dari backend Express (server.js). */
export interface WabaStatus {
  ok: boolean;
  configured: boolean;
  bot?: {
    display_phone_number?: string;
    verified_name?: string;
  } | null;
}

/** Respons GET /api/calendly/status (src/app/api/calendly/status/route.ts). */
export interface CalendlyStatus {
  ok: boolean;
  configured: boolean;
  user?: { name?: string; email?: string } | null;
  eventType?: { name?: string; duration?: number | null; schedulingUrl?: string } | null;
}

/** Respons POST /api/calendly/config. */
export interface CalendlyConfigResponse {
  ok: boolean;
  user?: { name?: string; email?: string } | null;
  eventType?: { uri: string; name?: string; duration?: number | null; schedulingUrl?: string } | null;
}

export type IntegrationCategory = "messaging" | "crm" | "ecommerce" | "payment" | "tools";
export type IntegrationConnStatus = "connected" | "pending" | "disconnected";

export interface IntegrationConfigField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  /** Teks bantuan kecil di bawah input. */
  hint?: string;
}

export interface IntegrationConnectedInfo {
  account: string;
  since: string;
  messages: string;
  lastStatus: string;
  /** Baris tambahan khusus integrasi tertentu (mis. Event Type Calendly). */
  extra?: { label: string; value: string }[];
}

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  emoji: string;
  description: string;
  features: string[];
  status: IntegrationConnStatus;
  configFields?: IntegrationConfigField[];
  connectedInfo?: IntegrationConnectedInfo;
}
