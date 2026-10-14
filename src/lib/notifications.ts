import { Bot, Calendar, Check, MessageSquare, Users } from "lucide-react";

import type { NotificationItem, NotificationType } from "@/types/nav";

export const MOCK_NOTIFICATIONS: NotificationItem[] = [

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