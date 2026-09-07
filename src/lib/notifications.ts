import { Bot, Calendar, Check, MessageSquare, Users } from "lucide-react";

import type { NotificationItem, NotificationType } from "@/types/nav";

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 1, type: "chat", title: "Percakapan baru masuk", sub: "PT. Sinar Jaya — WhatsApp", time: "2 mnt lalu", read: false },
  { id: 2, type: "lead", title: "Lead baru terdeteksi", sub: "Budi Santoso — Live Chat", time: "15 mnt lalu", read: false },
  { id: 3, type: "ai", title: "AI Agent memerlukan perhatian", sub: "Percakapan #4821 — sentimen negatif", time: "32 mnt lalu", read: false },
  { id: 4, type: "success", title: "AI Agent aktif kembali", sub: "Setelah maintenance terjadwal", time: "1 jam lalu", read: true },
  { id: 5, type: "appt", title: "Pengingat appointment", sub: "Demo dengan CV. Maju — 14.00 hari ini", time: "2 jam lalu", read: true },
  { id: 6, type: "lead", title: "Follow-up otomatis terkirim", sub: "AI mengirim pesan ke 3 leads HOT", time: "3 jam lalu", read: true },
];

export const NOTIF_TYPE_CFG: Record<
  NotificationType,
  { icon: typeof MessageSquare; className: string }
> = {
  chat: { icon: MessageSquare, className: "bg-accent-soft text-accent" },
  lead: { icon: Users, className: "bg-blue-50 text-blue-700" },
  ai: { icon: Bot, className: "bg-violet-50 text-violet-700" },
  success: { icon: Check, className: "bg-emerald-50 text-emerald-700" },
  appt: { icon: Calendar, className: "bg-amber-50 text-amber-700" },
};