import { create } from "zustand";

export type NotifType = "chat" | "lead" | "ai" | "success" | "appt";

export interface AppNotification {
  id: number;
  type: NotifType;
  title: string;
  sub: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    type: "chat",
    title: "Percakapan baru masuk",
    sub: "PT. Sinar Jaya — WhatsApp",
    time: "2 mnt lalu",
    read: false,
  },
  {
    id: 2,
    type: "lead",
    title: "Lead baru terdeteksi",
    sub: "Budi Santoso — Live Chat",
    time: "15 mnt lalu",
    read: false,
  },
  {
    id: 3,
    type: "ai",
    title: "AI Agent memerlukan perhatian",
    sub: "Percakapan #4821 — sentimen negatif",
    time: "32 mnt lalu",
    read: false,
  },
  {
    id: 4,
    type: "success",
    title: "AI Agent aktif kembali",
    sub: "Setelah maintenance terjadwal",
    time: "1 jam lalu",
    read: true,
  },
  {
    id: 5,
    type: "appt",
    title: "Pengingat appointment",
    sub: "Demo dengan CV. Maju — 14.00 hari ini",
    time: "2 jam lalu",
    read: true,
  },
  {
    id: 6,
    type: "lead",
    title: "Follow-up otomatis terkirim",
    sub: "AI mengirim pesan ke 3 leads HOT",
    time: "3 jam lalu",
    read: true,
  },
];

interface UIState {
  isNotifOpen: boolean;
  notifications: AppNotification[];
  toggleNotif: () => void;
  closeNotif: () => void;
  markNotifRead: (id: number) => void;
  markAllNotifRead: () => void;
  pushNotif: (notif: Omit<AppNotification, "id" | "read" | "time">) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNotifOpen: false,
  notifications: INITIAL_NOTIFICATIONS,

  toggleNotif: () => set((s) => ({ isNotifOpen: !s.isNotifOpen })),
  closeNotif: () => set({ isNotifOpen: false }),

  markNotifRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllNotifRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  pushNotif: (notif) =>
    set((s) => ({
      notifications: [
        {
          ...notif,
          id: Date.now(),
          time: "Baru saja",
          read: false,
        },
        ...s.notifications,
      ],
    })),
}));