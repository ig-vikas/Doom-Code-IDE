import { create } from 'zustand';
import { generateId } from '../utils/fileUtils';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  details?: string;
  duration: number;
  createdAt: number;
}

interface NotificationState {
  notifications: Notification[];
  notify: (type: NotificationType, message: string, details?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  info: (message: string, details?: string) => string;
  success: (message: string, details?: string) => string;
  warning: (message: string, details?: string) => string;
  error: (message: string, details?: string) => string;
}

const DEFAULT_DURATION: Record<NotificationType, number> = {
  info: 4000,
  success: 3000,
  warning: 5000,
  error: 8000,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  notify: (type, message, details, duration) => {
    const id = generateId();
    const notification: Notification = {
      id,
      type,
      message,
      details,
      duration: duration ?? DEFAULT_DURATION[type],
      createdAt: Date.now(),
    };
    set({ notifications: [...get().notifications, notification] });
    if (notification.duration > 0) {
      setTimeout(() => get().dismiss(id), notification.duration);
    }
    return id;
  },

  dismiss: (id) => {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },

  dismissAll: () => set({ notifications: [] }),

  info: (message, details) => get().notify('info', message, details),
  success: (message, details) => get().notify('success', message, details),
  warning: (message, details) => get().notify('warning', message, details),
  error: (message, details) => get().notify('error', message, details),
}));
