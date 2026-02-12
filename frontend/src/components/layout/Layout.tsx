import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { CommandPalette } from '../global/CommandPalette';
import { ConfirmModal } from '../global/ConfirmModal';
import { useThemeStore } from '../../store/themeStore';
import clsx from 'clsx';

export const Layout: React.FC = () => {
    const { sidebarCollapsed, theme } = useThemeStore();

    // Sync theme class on mount
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    return (
        <div className="min-h-screen bg-[var(--color-bg-secondary)] transition-colors duration-200">
            <Sidebar />
            <Navbar />

            {/* Main content */}
            <main
                className={clsx(
                    'pt-16 min-h-screen transition-all duration-300',
                    sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[272px]'
                )}
            >
                <div className="p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto">
                    <div className="transition-page">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Global overlays */}
            <CommandPalette />
            <ConfirmModal />
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    className: 'toast-enterprise',
                    style: {
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-primary)',
                        boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                    },
                }}
            />
        </div>
    );
};
