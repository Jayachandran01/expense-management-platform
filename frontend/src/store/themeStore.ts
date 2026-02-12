import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    sidebarMobileOpen: boolean;
    searchOpen: boolean;
    notificationsOpen: boolean;
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setSidebarMobileOpen: (open: boolean) => void;
    setSearchOpen: (open: boolean) => void;
    setNotificationsOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',
            sidebarCollapsed: false,
            sidebarMobileOpen: false,
            searchOpen: false,
            notificationsOpen: false,

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                set({ theme: newTheme });
            },

            setTheme: (theme) => {
                document.documentElement.classList.toggle('dark', theme === 'dark');
                set({ theme });
            },

            toggleSidebar: () => {
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
            },

            setSidebarCollapsed: (collapsed) => {
                set({ sidebarCollapsed: collapsed });
            },

            setSidebarMobileOpen: (open) => {
                set({ sidebarMobileOpen: open });
            },

            setSearchOpen: (open) => {
                set({ searchOpen: open });
            },

            setNotificationsOpen: (open) => {
                set({ notificationsOpen: open });
            },
        }),
        {
            name: 'financeai-theme',
            partialize: (state) => ({
                theme: state.theme,
                sidebarCollapsed: state.sidebarCollapsed,
            }),
        }
    )
);

// Initialize theme on load
const initTheme = () => {
    const stored = localStorage.getItem('financeai-theme');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.state?.theme === 'dark') {
                document.documentElement.classList.add('dark');
            }
        } catch { }
    }
};

initTheme();
