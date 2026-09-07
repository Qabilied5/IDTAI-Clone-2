import type { ComponentType, SVGProps } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type NotificationType = "chat" | "lead" | "ai" | "success" | "appt";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  sub: string;
  time: string;
  read: boolean;
}