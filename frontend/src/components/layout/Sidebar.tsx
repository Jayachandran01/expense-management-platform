import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    TrendingUp,
    Wallet,
    Users,
    MessageSquare,
    Upload,
    Camera,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    X,
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '../../store/themeStore';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
}

const mainNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Budgets', href: '/budgets', icon: Wallet },
    { name: 'Groups', href: '/groups', icon: Users },
];

const toolsNavigation: NavItem[] = [
    { name: 'Imports', href: '/imports', icon: Upload },
    { name: 'Receipts', href: '/receipts', icon: Camera },
];

const assistantNav: NavItem = {
    name: 'AI Assistant',
    href: '/assistant',
    icon: Sparkles,
    badge: 'AI',
};

const NavItemComponent: React.FC<{
    item: NavItem;
    collapsed: boolean;
    onMobileClose: () => void;
}> = ({ item, collapsed, onMobileClose }) => {
    const location = useLocation();
    const isActive = location.pathname === item.href;

    return (
        <NavLink
            to={item.href}
            onClick={() => {
                if (window.innerWidth < 1024) onMobileClose();
            }}
            className={clsx(
                'group relative flex items-center rounded-xl transition-all duration-200',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3',
                isActive
                    ? 'bg-brand-600 text-white shadow-glow-brand'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            )}
        >
            <item.icon
                className={clsx(
                    'flex-shrink-0 transition-colors duration-200',
                    collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                    isActive ? 'text-white' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)]'
                )}
            />
            {!collapsed && (
                <>
                    <span className="text-body font-medium truncate">{item.name}</span>
                    {item.badge && (
                        <span
                            className={clsx(
                                'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                                isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                            )}
                        >
                            {item.badge}
                        </span>
                    )}
                </>
            )}
            {collapsed && (
                <div className="tooltip left-full ml-3 whitespace-nowrap">
                    {item.name}
                </div>
            )}
        </NavLink>
    );
};

export const Sidebar: React.FC = () => {
    const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useThemeStore();

    return (
        <>
            {/* Mobile overlay */}
            {sidebarMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-out',
                    'border-r',
                    'bg-[var(--color-bg-primary)] border-[var(--color-border-primary)]',
                    'lg:translate-x-0',
                    sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
                    sidebarCollapsed ? 'w-[72px]' : 'w-[272px]'
                )}
            >
                {/* Logo */}
                <div
                    className={clsx(
                        'flex items-center h-16 border-b border-[var(--color-border-primary)] flex-shrink-0',
                        sidebarCollapsed ? 'justify-center px-3' : 'px-5 gap-3'
                    )}
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-glow-brand">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                            <div>
                                <h1 className="text-body-lg font-bold text-[var(--color-text-primary)] leading-tight">
                                    FinanceAI
                                </h1>
                                <p className="text-[10px] text-[var(--color-text-tertiary)] font-medium tracking-wider uppercase">
                                    Intelligence Platform
                                </p>
                            </div>
                            <button
                                onClick={() => setSidebarMobileOpen(false)}
                                className="lg:hidden p-1 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {/* Main */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-tertiary)]">
                                Main
                            </p>
                        )}
                        {mainNavigation.map((item) => (
                            <NavItemComponent
                                key={item.name}
                                item={item}
                                collapsed={sidebarCollapsed}
                                onMobileClose={() => setSidebarMobileOpen(false)}
                            />
                        ))}
                    </div>

                    {/* Tools */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-tertiary)]">
                                Tools
                            </p>
                        )}
                        {toolsNavigation.map((item) => (
                            <NavItemComponent
                                key={item.name}
                                item={item}
                                collapsed={sidebarCollapsed}
                                onMobileClose={() => setSidebarMobileOpen(false)}
                            />
                        ))}
                    </div>

                    {/* AI */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-tertiary)]">
                                Intelligence
                            </p>
                        )}
                        <NavItemComponent
                            item={assistantNav}
                            collapsed={sidebarCollapsed}
                            onMobileClose={() => setSidebarMobileOpen(false)}
                        />
                    </div>
                </nav>

                {/* Collapse Toggle (desktop) */}
                <div className="hidden lg:flex items-center justify-center py-3 px-3 border-t border-[var(--color-border-primary)]">
                    <button
                        onClick={toggleSidebar}
                        className={clsx(
                            'flex items-center justify-center rounded-xl p-2 transition-all duration-200',
                            'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]',
                            'hover:bg-[var(--color-bg-tertiary)]',
                            sidebarCollapsed ? 'w-10 h-10' : 'w-full h-10 gap-2'
                        )}
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-caption font-medium">Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};
