import React, { useState } from 'react';
import {
    TrendingUp,
    BarChart3,
    PieChart,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Layers,
    Activity,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../utils/helpers';

const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
const incomeData = [62000, 58000, 72000, 65000, 80000, 90000];
const expenseData = [41000, 48000, 38000, 52000, 42000, 41239];

const categoryBreakdown = [
    { name: 'Food & Dining', amount: 18500, percent: 44.9, color: '#10b981', icon: '🍕' },
    { name: 'Shopping', amount: 12000, percent: 29.1, color: '#8b5cf6', icon: '🛍️' },
    { name: 'Transportation', amount: 5200, percent: 12.6, color: '#3b82f6', icon: '🚗' },
    { name: 'Entertainment', amount: 3200, percent: 7.8, color: '#f59e0b', icon: '🎬' },
    { name: 'Utilities', amount: 2339, percent: 5.7, color: '#06b6d4', icon: '⚡' },
];

const weeklyData = [
    { week: 'Week 1', amount: 12500 },
    { week: 'Week 2', amount: 8900 },
    { week: 'Week 3', amount: 11200 },
    { week: 'Week 4', amount: 8639 },
];

const aiFindings = [
    {
        title: 'Spending Anomaly Detected',
        description: 'Shopping expenses were 120% higher than your 3-month average in January. This appears to be a one-time spike.',
        type: 'warning' as const,
        metric: '+₹5,200',
    },
    {
        title: 'Savings Acceleration',
        description: 'Your savings rate improved from 35% to 54% over the last 3 months. Maintaining this trajectory adds ₹1.2L yearly.',
        type: 'success' as const,
        metric: '+19%',
    },
    {
        title: 'Recurring Cost Optimization',
        description: 'You have ₹4,800/month in subscriptions. 2 services overlap in functionality. Consolidating could save ₹1,200/month.',
        type: 'info' as const,
        metric: '₹1,200/mo',
    },
    {
        title: 'Cash Flow Forecast',
        description: 'Based on current trends, your projected savings for Q1 2026 is ₹1,45,000 — 12% above target.',
        type: 'success' as const,
        metric: '₹1.45L',
    },
];

const DonutChart: React.FC<{ data: typeof categoryBreakdown }> = ({ data }) => {
    const total = data.reduce((s, d) => s + d.amount, 0);
    let accumulated = 0;

    return (
        <div className="relative w-48 h-48 mx-auto">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {data.map((item, i) => {
                    const percentage = item.amount / total;
                    const circumference = 2 * Math.PI * 70;
                    const strokeDash = percentage * circumference;
                    const offset = accumulated * circumference;
                    accumulated += percentage;

                    return (
                        <circle
                            key={i}
                            cx="100" cy="100" r="70"
                            fill="none"
                            stroke={item.color}
                            strokeWidth="28"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset={-offset}
                            className="transition-all duration-700"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-heading-2 font-bold text-[var(--color-text-primary)]">{formatCurrency(total)}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Total Spent</span>
            </div>
        </div>
    );
};

export const AnalyticsPage: React.FC = () => {
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-subtitle">Deep insights into your financial patterns and trends</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl border border-[var(--color-border-primary)] overflow-hidden">
                        {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={clsx(
                                    'px-3 py-2 text-caption font-medium capitalize transition-colors',
                                    period === p
                                        ? 'bg-brand-600 text-white'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button className="btn-ghost text-caption flex items-center gap-1.5">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Income vs Expense Trend */}
            <div className="enterprise-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Income vs Expenses</h2>
                        <p className="text-caption text-[var(--color-text-tertiary)]">6-month comparison</p>
                    </div>
                    <div className="flex items-center gap-4 text-caption">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-1.5 rounded-full bg-success-500" /> Income
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-1.5 rounded-full bg-danger-500" /> Expenses
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-1.5 rounded-full bg-brand-500" /> Savings
                        </span>
                    </div>
                </div>

                <div className="h-64 flex items-end gap-3 px-2">
                    {months.map((month, i) => {
                        const maxVal = Math.max(...incomeData, ...expenseData);
                        const incH = (incomeData[i] / maxVal) * 85;
                        const expH = (expenseData[i] / maxVal) * 85;
                        const savings = incomeData[i] - expenseData[i];
                        return (
                            <div key={month} className="flex-1 flex flex-col items-center group">
                                <div className="w-full flex gap-1 items-end h-52">
                                    <div className="flex-1 relative">
                                        <div
                                            className="rounded-t-md bg-gradient-to-t from-success-600 to-success-400 opacity-80 group-hover:opacity-100 transition-opacity"
                                            style={{ height: `${incH}%` }}
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <div
                                            className="rounded-t-md bg-gradient-to-t from-danger-600 to-danger-400 opacity-80 group-hover:opacity-100 transition-opacity"
                                            style={{ height: `${expH}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-center">
                                    <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{month}</span>
                                    <span className={clsx(
                                        'block text-[10px] font-bold mt-0.5',
                                        savings > 0 ? 'text-success-500' : 'text-danger-500'
                                    )}>
                                        {savings > 0 ? '+' : ''}{formatCurrency(savings)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Spending Distribution + Weekly Breakdown */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Donut */}
                <div className="enterprise-card p-6">
                    <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-6">Spending by Category</h2>
                    <DonutChart data={categoryBreakdown} />
                    <div className="mt-6 space-y-2">
                        {categoryBreakdown.map((cat) => (
                            <div key={cat.name} className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="flex-1 text-caption text-[var(--color-text-primary)] font-medium">{cat.name}</span>
                                <span className="text-caption text-[var(--color-text-secondary)]">{formatCurrency(cat.amount)}</span>
                                <span className="text-caption text-[var(--color-text-tertiary)] w-12 text-right">{cat.percent}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly breakdown */}
                <div className="enterprise-card p-6">
                    <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-6">Weekly Spending Pattern</h2>
                    <div className="space-y-4">
                        {weeklyData.map((week) => {
                            const percentage = (week.amount / Math.max(...weeklyData.map(w => w.amount))) * 100;
                            return (
                                <div key={week.week}>
                                    <div className="flex justify-between text-caption mb-1.5">
                                        <span className="font-medium text-[var(--color-text-primary)]">{week.week}</span>
                                        <span className="text-[var(--color-text-secondary)]">{formatCurrency(week.amount)}</span>
                                    </div>
                                    <div className="w-full h-8 rounded-lg bg-[var(--color-bg-tertiary)] relative overflow-hidden">
                                        <div
                                            className="h-full rounded-lg bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 flex items-center justify-end pr-2"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <span className="text-[10px] font-bold text-white">{Math.round(percentage)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-3 rounded-xl bg-[var(--color-bg-secondary)]">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-brand-600" />
                            <span className="text-caption font-semibold text-[var(--color-text-primary)]">Pattern Insight</span>
                        </div>
                        <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed">
                            Week 1 typically has the highest spending (40% above average) due to monthly recurring payments. Consider spreading subscriptions across the month.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Financial Analysis */}
            <div className="enterprise-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">AI Financial Analysis</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiFindings.map((finding, i) => (
                        <div
                            key={i}
                            className={clsx(
                                'p-4 rounded-xl border transition-all duration-200 hover:shadow-soft cursor-pointer',
                                finding.type === 'warning' && 'bg-warning-50/50 border-warning-200/50 dark:bg-warning-600/5 dark:border-warning-600/20',
                                finding.type === 'success' && 'bg-success-50/50 border-success-200/50 dark:bg-success-600/5 dark:border-success-600/20',
                                finding.type === 'info' && 'bg-brand-50/50 border-brand-200/50 dark:bg-brand-600/5 dark:border-brand-600/20',
                            )}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <p className="text-body font-semibold text-[var(--color-text-primary)]">{finding.title}</p>
                                <span className={clsx(
                                    'text-caption font-bold px-2 py-0.5 rounded-lg',
                                    finding.type === 'warning' && 'bg-warning-100 text-warning-600 dark:bg-warning-600/20 dark:text-warning-400',
                                    finding.type === 'success' && 'bg-success-100 text-success-600 dark:bg-success-600/20 dark:text-success-400',
                                    finding.type === 'info' && 'bg-brand-100 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400',
                                )}>
                                    {finding.metric}
                                </span>
                            </div>
                            <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed">{finding.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparative Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Avg Daily Spend', value: formatCurrency(1374), change: -8, icon: BarChart3 },
                    { label: 'Largest Expense', value: formatCurrency(12999), change: 15, icon: TrendingUp },
                    { label: 'Transaction Count', value: '47', change: 5, icon: Layers },
                    { label: 'Savings This Month', value: formatCurrency(48761), change: 18, icon: PieChart },
                ].map((stat) => (
                    <div key={stat.label} className="enterprise-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <stat.icon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                            <span className={clsx(
                                'text-[10px] font-bold flex items-center gap-0.5',
                                stat.change > 0 ? 'text-success-500' : 'text-danger-500'
                            )}>
                                {stat.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(stat.change)}%
                            </span>
                        </div>
                        <p className="text-heading-3 font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
