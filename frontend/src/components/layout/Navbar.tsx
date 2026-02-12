import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Menu,
    Bell,
    Search,
    Sun,
    Moon,
    User,
    LogOut,
    Settings,
    ChevronRight,
    Check,
    X,
    Command,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useThemeStore } from '../../store/themeStore';
import { useAppStore } from '../../store/appStore';
import { getInitials, formatRelativeTime } from '../../utils/helpers';

const breadcrumbMap: Record<string, string> = {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    analytics: 'Analytics',
    budgets: 'Budgets',
    groups: 'Groups',
    assistant: 'AI Assistant',
    imports: 'Imports',
    receipts: 'Receipts',
};

export const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme, sidebarCollapsed, setSidebarMobileOpen, setSearchOpen } = useThemeStore();
    const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Breadcrumbs
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map((segment) => ({
        label: breadcrumbMap[segment] || segment,
        href: '/' + segment,
    }));

    // Click outside handlers
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keyboard shortcut: Ctrl+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [setSearchOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header
            className={clsx(
                'fixed top-0 right-0 z-30 h-16 flex items-center border-b transition-all duration-300',
                'bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-[var(--color-border-primary)]',
                sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[272px]',
                'left-0'
            )}
        >
            <div className="flex items-center justify-between w-full px-4 lg:px-6">
                {/* Left */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarMobileOpen(true)}
                        className="lg:hidden p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="hidden md:flex items-center gap-1.5 text-body">
                        <span className="text-[var(--color-text-tertiary)]">Home</span>
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={crumb.href}>
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                <span
                                    className={clsx(
                                        'font-medium',
                                        i === breadcrumbs.length - 1
                                            ? 'text-[var(--color-text-primary)]'
                                            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer'
                                    )}
                                    onClick={() => i < breadcrumbs.length - 1 && navigate(crumb.href)}
                                >
                                    {crumb.label}
                                </span>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    {/* Search button */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className={clsx(
                            'hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200',
                            'text-[var(--color-text-tertiary)] border-[var(--color-border-primary)]',
                            'hover:border-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
                            'bg-[var(--color-bg-secondary)]'
                        )}
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-caption">Search...</span>
                        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                            <Command className="w-2.5 h-2.5" />K
                        </kbd>
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-all duration-200"
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-all duration-200"
                        >
                            <Bell className="w-[18px] h-[18px]" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--color-bg-primary)]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications panel */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-hidden rounded-2xl shadow-modal border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] animate-scale-in z-50">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
                                    <h3 className="font-semibold text-body text-[var(--color-text-primary)]">Notifications</h3>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllNotificationsRead}
                                                className="text-caption text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="p-1 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-[380px]">
                                    {notifications.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <Bell className="w-10 h-10 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                                            <p className="text-body text-[var(--color-text-tertiary)]">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={clsx(
                                                    'flex gap-3 px-4 py-3 border-b border-[var(--color-border-secondary)] hover:bg-[var(--color-bg-secondary)] cursor-pointer transition-colors',
                                                    !notif.read && 'bg-brand-50/50 dark:bg-brand-950/20'
                                                )}
                                                onClick={() => {
                                                    markNotificationRead(notif.id);
                                                    if (notif.action) {
                                                        navigate(notif.action.href);
                                                        setShowNotifications(false);
                                                    }
                                                }}
                                            >
                                                <div
                                                    className={clsx(
                                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                                                        notif.type === 'success' && 'bg-success-50 text-success-600 dark:bg-success-600/10 dark:text-success-400',
                                                        notif.type === 'warning' && 'bg-warning-50 text-warning-600 dark:bg-warning-600/10 dark:text-warning-400',
                                                        notif.type === 'error' && 'bg-danger-50 text-danger-600 dark:bg-danger-600/10 dark:text-danger-400',
                                                        notif.type === 'info' && 'bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400'
                                                    )}
                                                >
                                                    {notif.type === 'success' && <Check className="w-4 h-4" />}
                                                    {notif.type === 'warning' && <Bell className="w-4 h-4" />}
                                                    {notif.type === 'error' && <X className="w-4 h-4" />}
                                                    {notif.type === 'info' && <Bell className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-body font-medium text-[var(--color-text-primary)] truncate">
                                                            {notif.title}
                                                        </p>
                                                        {!notif.read && (
                                                            <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p className="text-caption text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                                                        {formatRelativeTime(notif.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all duration-200"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white text-caption font-bold shadow-soft">
                                {user ? getInitials(user.full_name) : 'U'}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-body font-medium text-[var(--color-text-primary)] leading-tight">
                                    {user?.full_name || 'User'}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-modal border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] py-1 animate-scale-in z-50">
                                <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
                                    <p className="text-body font-semibold text-[var(--color-text-primary)]">{user?.full_name}</p>
                                    <p className="text-caption text-[var(--color-text-tertiary)]">{user?.email}</p>
                                </div>
                                <div className="py-1">
                                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-body text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                                        <User className="w-4 h-4" />
                                        Profile
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-body text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </button>
                                </div>
                                <div className="border-t border-[var(--color-border-primary)] pt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-body text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-600/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
