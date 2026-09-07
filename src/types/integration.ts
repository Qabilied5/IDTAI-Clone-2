/** Respons GET /api/telegram/status dari backend Express (server.js). */
export interface TelegramStatus {
  ok: boolean;
  configured: boolean;
  polling: boolean;
  bot?: {
    username?: string;
  };
}

/** Respons GET /api/waba/status dari backend Express (server.js). */
export interface WabaStatus {
  ok: boolean;
  configured: boolean;
  bot?: {
    display_phone_number?: string;
  };
}
