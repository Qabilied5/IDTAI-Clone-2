export type AppointmentStatus =
  | "terkonfirmasi"
  | "menunggu"
  | "selesai"
  | "dibatalkan";

export type AppointmentSource = "manual" | "telegram" | "calendly" | "whatsapp" | "ai";

/**
 * Mirrors satu record di window.AP_DATA (script_page/appointment.js pada
 * versi vanilla). `date` disimpan sebagai string "YYYY-MM-DD" dan `time`
 * sebagai "HH.MM" (bukan "HH:MM") -- format ini dipertahankan apa adanya
 * karena itu yang dikirim oleh backend Express (server.js) yang sudah ada.
 * Lihat toAppointmentDate() di src/lib/overview.ts untuk konversi ke Date.
 */
export interface Appointment {
  id: string;
  nama: string;
  company?: string;
  phone?: string;
  date: string;
  time: string;
  type: string;
  typeLabel?: string;
  status: AppointmentStatus;
  pic?: string;
  notes?: string;
  source?: AppointmentSource;
}
