import { create } from "zustand";

export interface AppNotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  progress?: number;
  isLoading?: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  notify: (
    notification: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => string;
  markRead: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  notify: (notification) => {
    const id = `ntf-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    set((state) => ({
      notifications: [
        { ...notification, id, timestamp: Date.now(), read: false },
        ...state.notifications,
      ].slice(0, 80),
    }));
    return id;
  },
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),
  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),
  clear: () => set({ notifications: [] }),
}));
