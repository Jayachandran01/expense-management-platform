import React, { useState } from 'react';
import {
    Plus,
    Search,
    Filter,
    Download,
    Upload,
    ChevronDown,
    ChevronUp,
    Edit3,
    Trash2,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    Tag,
    FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate } from '../utils/helpers';
import { VoiceInput } from '../components/global/VoiceInput';

type SourceTag = 'manual' | 'csv' | 'voice' | 'ocr';

interface MockTransaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    source: SourceTag;
    paymentMethod: string;
    selected?: boolean;
}

const sourceTagConfig: Record<SourceTag, { label: string; color: string; bg: string }> = {
    manual: { label: 'Manual', color: 'text-surface-600 dark:text-surface-400', bg: 'bg-surface-100 dark:bg-surface-700' },
    csv: { label: 'CSV', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-600/10' },
    voice: { label: 'Voice', color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-600/10' },
    ocr: { label: 'OCR', color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-600/10' },
};

const mockTransactions: MockTransaction[] = [
    { id: 1, description: 'Grocery Store - Big Bazaar', amount: 2450, type: 'expense', category: 'Food & Dining', date: '2026-02-12', source: 'manual', paymentMethod: 'UPI' },
    { id: 2, description: 'Monthly Salary', amount: 75000, type: 'income', category: 'Salary', date: '2026-02-01', source: 'csv', paymentMethod: 'Bank Transfer' },
    { id: 3, description: 'Netflix Subscription', amount: 649, type: 'expense', category: 'Entertainment', date: '2026-02-10', source: 'manual', paymentMethod: 'Credit Card' },
    { id: 4, description: 'Electricity Bill - BESCOM', amount: 1890, type: 'expense', category: 'Utilities', date: '2026-02-08', source: 'ocr', paymentMethod: 'UPI' },
    { id: 5, description: 'Freelance Web Development', amount: 15000, type: 'income', category: 'Freelance', date: '2026-02-05', source: 'manual', paymentMethod: 'Bank Transfer' },
    { id: 6, description: 'Uber Ride to Office', amount: 340, type: 'expense', category: 'Transportation', date: '2026-02-11', source: 'voice', paymentMethod: 'UPI' },
    { id: 7, description: 'Amazon - Electronics', amount: 12999, type: 'expense', category: 'Shopping', date: '2026-02-07', source: 'csv', paymentMethod: 'Credit Card' },
    { id: 8, description: 'Restaurant - Lunch', amount: 850, type: 'expense', category: 'Food & Dining', date: '2026-02-11', source: 'manual', paymentMethod: 'Cash' },
    { id: 9, description: 'Gym Membership', amount: 2000, type: 'expense', category: 'Health', date: '2026-02-03', source: 'manual', paymentMethod: 'UPI' },
    { id: 10, description: 'Interest Credit', amount: 450, type: 'income', category: 'Other Income', date: '2026-02-06', source: 'csv', paymentMethod: 'Bank Transfer' },
];

export const TransactionsPage: React.FC = () => {
    const [transactions, setTransactions] = useState(mockTransactions);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [drawerTx, setDrawerTx] = useState<MockTransaction | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const itemsPerPage = 8;

    // Filtering
    const filtered = transactions.filter((tx) => {
        if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterType && tx.type !== filterType) return false;
        if (filterCategory && tx.category !== filterCategory) return false;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const categories = Array.from(new Set(transactions.map((t) => t.category)));

    const toggleSelectAll = () => {
        if (selectedIds.size === paginated.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginated.map((t) => t.id)));
        }
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleExportCSV = () => {
        const headers = 'Date,Description,Type,Category,Amount,Payment Method,Source\n';
        const rows = filtered
            .map((t) => `${t.date},"${t.description}",${t.type},${t.category},${t.amount},${t.paymentMethod},${t.source}`)
            .join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleVoiceTransaction = (tx: any) => {
        const newTx: MockTransaction = {
            id: tx.id || Date.now(),
            description: tx.description || 'Voice Entry',
            amount: tx.amount || 0,
            type: tx.type || 'expense',
            category: tx.category || 'Uncategorized',
            date: tx.date || new Date().toISOString().split('T')[0],
            source: 'voice',
            paymentMethod: 'Cash', // Default
        };
        setTransactions([newTx, ...transactions]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Transactions</h1>
                    <p className="page-subtitle">Track and manage all your financial activity</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="btn-ghost flex items-center gap-2 text-caption"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => window.location.href = '/imports'}
                        className="btn-secondary flex items-center gap-2 text-caption"
                    >
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button className="btn-primary flex items-center gap-2 text-caption">
                        <Plus className="w-4 h-4" /> Add Transaction
                    </button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="enterprise-card p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="input-field pl-10"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-caption font-medium border transition-all',
                                showFilters
                                    ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-600/10 dark:border-brand-600/20 dark:text-brand-400'
                                    : 'border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)]'
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filters
                            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
                        <div>
                            <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">Type</label>
                            <select
                                value={filterType}
                                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                                className="input-field"
                            >
                                <option value="">All Types</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                                className="input-field"
                            >
                                <option value="">All Categories</option>
                                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">Date From</label>
                            <input type="date" className="input-field" />
                        </div>
                        <div>
                            <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">Date To</label>
                            <input type="date" className="input-field" />
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="enterprise-card p-3 flex items-center gap-4 animate-fade-in-up">
                    <p className="text-caption font-medium text-[var(--color-text-primary)]">
                        {selectedIds.size} selected
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost text-caption flex items-center gap-1.5 text-danger-600">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <button className="btn-ghost text-caption flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Categorize
                        </button>
                        <button className="btn-ghost text-caption flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Export Selected
                        </button>
                    </div>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-auto btn-ghost text-caption">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Transactions Table */}
            <div className="enterprise-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border-secondary)]">
                                <th className="text-left py-3 px-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === paginated.length && paginated.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-[var(--color-border-primary)] text-brand-600 focus:ring-brand-500/40"
                                    />
                                </th>
                                <th className="text-left py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Description</th>
                                <th className="text-left py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Category</th>
                                <th className="text-left py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Date</th>
                                <th className="text-left py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Source</th>
                                <th className="text-right py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Amount</th>
                                <th className="text-right py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((tx) => {
                                const cfg = sourceTagConfig[tx.source];
                                return (
                                    <tr
                                        key={tx.id}
                                        className={clsx(
                                            'border-b border-[var(--color-border-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors',
                                            selectedIds.has(tx.id) && 'bg-brand-50/30 dark:bg-brand-600/5'
                                        )}
                                    >
                                        <td className="py-3 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(tx.id)}
                                                onChange={() => toggleSelect(tx.id)}
                                                className="w-4 h-4 rounded border-[var(--color-border-primary)] text-brand-600 focus:ring-brand-500/40"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-caption font-bold',
                                                    tx.type === 'income'
                                                        ? 'bg-success-50 text-success-600 dark:bg-success-600/10 dark:text-success-400'
                                                        : 'bg-danger-50 text-danger-600 dark:bg-danger-600/10 dark:text-danger-400'
                                                )}>
                                                    {tx.type === 'income' ? '↗' : '↙'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-body font-medium text-[var(--color-text-primary)] truncate">{tx.description}</p>
                                                    <p className="text-[10px] text-[var(--color-text-tertiary)]">{tx.paymentMethod}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="badge bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-caption text-[var(--color-text-secondary)]">{formatDate(tx.date)}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={clsx('badge', cfg.bg, cfg.color)}>{cfg.label}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={clsx(
                                                'text-body font-semibold tabular-nums',
                                                tx.type === 'income' ? 'text-success-600 dark:text-success-400' : 'text-[var(--color-text-primary)]'
                                            )}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setDrawerTx(tx)}
                                                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(tx.id)}
                                                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-secondary)]">
                    <p className="text-caption text-[var(--color-text-tertiary)]">
                        Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={clsx(
                                    'w-8 h-8 rounded-lg text-caption font-medium transition-colors',
                                    currentPage === page
                                        ? 'bg-brand-600 text-white'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                                )}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Transaction Detail Drawer */}
            {drawerTx && (
                <>
                    <div className="drawer-overlay" onClick={() => setDrawerTx(null)} />
                    <div className="drawer-panel">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-primary)]">
                            <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Transaction Details</h3>
                            <button
                                onClick={() => setDrawerTx(null)}
                                className="p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Amount */}
                            <div className="text-center py-4">
                                <p className={clsx(
                                    'text-display font-bold',
                                    drawerTx.type === 'income' ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
                                )}>
                                    {drawerTx.type === 'income' ? '+' : '-'}{formatCurrency(drawerTx.amount)}
                                </p>
                                <p className="text-body text-[var(--color-text-secondary)] mt-1">{drawerTx.description}</p>
                            </div>

                            {/* Details Grid */}
                            <div className="space-y-4">
                                {[
                                    { label: 'Category', value: drawerTx.category },
                                    { label: 'Date', value: formatDate(drawerTx.date) },
                                    { label: 'Payment Method', value: drawerTx.paymentMethod },
                                    { label: 'Source', value: sourceTagConfig[drawerTx.source].label },
                                    { label: 'Type', value: drawerTx.type.charAt(0).toUpperCase() + drawerTx.type.slice(1) },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--color-border-secondary)]">
                                        <span className="text-caption text-[var(--color-text-tertiary)]">{item.label}</span>
                                        <span className="text-body font-medium text-[var(--color-text-primary)]">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Activity Log */}
                            <div>
                                <h4 className="text-body font-semibold text-[var(--color-text-primary)] mb-3">Activity Log</h4>
                                <div className="space-y-3">
                                    {[
                                        { action: 'Transaction created', time: drawerTx.date, user: 'You' },
                                        { action: 'Auto-categorized by AI', time: drawerTx.date, user: 'System' },
                                    ].map((log, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-caption font-medium text-[var(--color-text-primary)]">{log.action}</p>
                                                <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatDate(log.time)} • {log.user}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4">
                                <button className="btn-primary flex-1 flex items-center justify-center gap-2 text-caption">
                                    <Edit3 className="w-4 h-4" /> Edit
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-caption font-medium text-danger-600 bg-danger-50 hover:bg-danger-100 dark:bg-danger-600/10 dark:hover:bg-danger-600/20 transition-colors">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Voice Input Component */}
            <VoiceInput onTransactionCreated={handleVoiceTransaction} />
        </div>
    );
};
