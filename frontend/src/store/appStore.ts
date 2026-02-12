import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    action?: { label: string; href: string };
}

interface AppState {
    notifications: Notification[];
    commandPaletteOpen: boolean;
    confirmModal: {
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        variant: 'danger' | 'warning' | 'primary';
        onConfirm: () => void;
    } | null;

    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    clearNotifications: () => void;
    setCommandPaletteOpen: (open: boolean) => void;
    showConfirmModal: (config: {
        title: string;
        message: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning' | 'primary';
        onConfirm: () => void;
    }) => void;
    closeConfirmModal: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
    notifications: [
        {
            id: '1',
            type: 'warning',
            title: 'Budget Alert',
            message: 'You\'ve used 85% of your Food & Dining budget this month.',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            read: false,
            action: { label: 'View Budget', href: '/budgets' },
        },
        {
            id: '2',
            type: 'success',
            title: 'Income Received',
            message: 'Salary credit of ₹75,000 detected in your account.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            read: false,
        },
        {
            id: '3',
            type: 'info',
            title: 'AI Insight Available',
            message: 'New spending pattern detected. Check your analytics for details.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
            read: true,
            action: { label: 'View Insights', href: '/analytics' },
        },
    ],
    commandPaletteOpen: false,
    confirmModal: null,

    addNotification: (notification) => {
        const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false,
        };
        set((state) => ({
            notifications: [newNotification, ...state.notifications],
        }));
    },

    markNotificationRead: (id) => {
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            ),
        }));
    },

    markAllNotificationsRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
    },

    clearNotifications: () => {
        set({ notifications: [] });
    },

    setCommandPaletteOpen: (open) => {
        set({ commandPaletteOpen: open });
    },

    showConfirmModal: (config) => {
        set({
            confirmModal: {
                open: true,
                title: config.title,
                message: config.message,
                confirmLabel: config.confirmLabel || 'Confirm',
                variant: config.variant || 'primary',
                onConfirm: config.onConfirm,
            },
        });
    },

    closeConfirmModal: () => {
        set({ confirmModal: null });
    },
}));
