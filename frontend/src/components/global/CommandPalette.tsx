import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    LayoutDashboard,
    Receipt,
    TrendingUp,
    Wallet,
    Users,
    MessageSquare,
    Upload,
    Camera,
    Sun,
    Moon,
    ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '../../store/themeStore';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    action: () => void;
    category: string;
}

export const CommandPalette: React.FC = () => {
    const navigate = useNavigate();
    const { searchOpen, setSearchOpen, toggleTheme, theme } = useThemeStore();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands: CommandItem[] = [
        { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard'), category: 'Navigation' },
        { id: 'transactions', label: 'Go to Transactions', icon: Receipt, action: () => navigate('/transactions'), category: 'Navigation' },
        { id: 'analytics', label: 'Go to Analytics', icon: TrendingUp, action: () => navigate('/analytics'), category: 'Navigation' },
        { id: 'budgets', label: 'Go to Budgets', icon: Wallet, action: () => navigate('/budgets'), category: 'Navigation' },
        { id: 'groups', label: 'Go to Groups', icon: Users, action: () => navigate('/groups'), category: 'Navigation' },
        { id: 'assistant', label: 'Go to AI Assistant', icon: MessageSquare, action: () => navigate('/assistant'), category: 'Navigation' },
        { id: 'imports', label: 'Go to Imports', icon: Upload, action: () => navigate('/imports'), category: 'Navigation' },
        { id: 'receipts', label: 'Go to Receipts', icon: Camera, action: () => navigate('/receipts'), category: 'Navigation' },
        { id: 'toggle-theme', label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, icon: theme === 'light' ? Moon : Sun, action: toggleTheme, category: 'Actions' },
    ];

    const filtered = query
        ? commands.filter(
            (cmd) =>
                cmd.label.toLowerCase().includes(query.toLowerCase()) ||
                cmd.category.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    const flatFiltered = Object.values(grouped).flat();

    const executeCommand = useCallback(
        (index: number) => {
            const cmd = flatFiltered[index];
            if (cmd) {
                cmd.action();
                setSearchOpen(false);
                setQuery('');
            }
        },
        [flatFiltered, setSearchOpen]
    );

    // Reset selection on filter change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input on open
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [searchOpen]);

    // Key handling
    useEffect(() => {
        if (!searchOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSearchOpen(false);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % flatFiltered.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + flatFiltered.length) % flatFiltered.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand(selectedIndex);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [searchOpen, selectedIndex, flatFiltered.length, executeCommand, setSearchOpen]);

    if (!searchOpen) return null;

    let globalIdx = -1;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
                onClick={() => setSearchOpen(false)}
            />

            {/* Panel */}
            <div className="relative max-w-xl mx-auto mt-[15vh] animate-scale-in">
                <div className="rounded-2xl shadow-modal border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] overflow-hidden">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-primary)]">
                        <Search className="w-5 h-5 text-[var(--color-text-tertiary)] flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a command or search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 text-body-lg bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
                        />
                        <kbd className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-primary)]">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-80 overflow-y-auto py-2">
                        {flatFiltered.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-body text-[var(--color-text-tertiary)]">
                                    No results found for "{query}"
                                </p>
                            </div>
                        ) : (
                            Object.entries(grouped).map(([category, items]) => (
                                <div key={category}>
                                    <p className="px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-tertiary)]">
                                        {category}
                                    </p>
                                    {items.map((cmd) => {
                                        globalIdx++;
                                        const idx = globalIdx;
                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={() => executeCommand(idx)}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={clsx(
                                                    'w-full flex items-center gap-3 px-4 py-2.5 transition-colors',
                                                    selectedIndex === idx
                                                        ? 'bg-brand-50 dark:bg-brand-600/10 text-brand-600 dark:text-brand-400'
                                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                                                )}
                                            >
                                                <cmd.icon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-body font-medium flex-1 text-left">{cmd.label}</span>
                                                <ArrowRight
                                                    className={clsx(
                                                        'w-3.5 h-3.5 transition-opacity',
                                                        selectedIndex === idx ? 'opacity-100' : 'opacity-0'
                                                    )}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--color-border-primary)] text-[10px] text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] font-mono">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] font-mono">↵</kbd>
                            Execute
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] font-mono">esc</kbd>
                            Close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
