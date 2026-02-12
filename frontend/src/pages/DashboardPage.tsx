import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Clock,
    CalendarDays,
    CreditCard,
    Target,
    Activity,
    ChevronRight,
    Zap,
    Shield,
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatRelativeTime } from '../utils/helpers';

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end, duration]);
    return count;
};

interface KPICardProps {
    title: string;
    value: number;
    prefix?: string;
    suffix?: string;
    change: number;
    changeLabel: string;
    icon: React.ElementType;
    accentColor: string;
    delay?: number;
}

const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    prefix = '₹',
    suffix,
    change,
    changeLabel,
    icon: Icon,
    accentColor,
    delay = 0,
}) => {
    const animatedValue = useAnimatedCounter(value, 1200);
    const isPositive = change >= 0;

    return (
        <div
            className="kpi-card group"
            style={{ '--kpi-accent': accentColor, animationDelay: `${delay}ms` } as React.CSSProperties}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}14` }}
                >
                    <Icon className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div
                    className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-caption font-semibold',
                        isPositive
                            ? 'bg-success-50 text-success-600 dark:bg-success-600/10 dark:text-success-400'
                            : 'bg-danger-50 text-danger-600 dark:bg-danger-600/10 dark:text-danger-400'
                    )}
                >
                    {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(change)}%
                </div>
            </div>
            <p className="text-caption font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                {title}
            </p>
            <p className="text-heading-1 font-bold text-[var(--color-text-primary)] count-animate">
                {prefix}{animatedValue.toLocaleString('en-IN')}{suffix}
            </p>
            <p className="text-caption text-[var(--color-text-tertiary)] mt-2">{changeLabel}</p>
        </div>
    );
};

const HealthScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative w-32 h-32 mx-auto">
            <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 120 120">
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke="var(--color-border-secondary)"
                    strokeWidth="8"
                />
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-heading-1 font-bold text-[var(--color-text-primary)]">{score}</span>
                <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Score</span>
            </div>
        </div>
    );
};

// Mock data
const recentTransactions = [
    { id: 1, description: 'Grocery Store', amount: -2450, category: 'Food', date: new Date(Date.now() - 1000 * 60 * 45), icon: '🛒' },
    { id: 2, description: 'Salary Credit', amount: 75000, category: 'Income', date: new Date(Date.now() - 1000 * 60 * 60 * 3), icon: '💰' },
    { id: 3, description: 'Netflix Subscription', amount: -649, category: 'Entertainment', date: new Date(Date.now() - 1000 * 60 * 60 * 8), icon: '🎬' },
    { id: 4, description: 'Electricity Bill', amount: -1890, category: 'Utilities', date: new Date(Date.now() - 1000 * 60 * 60 * 24), icon: '⚡' },
    { id: 5, description: 'Freelance Payment', amount: 15000, category: 'Income', date: new Date(Date.now() - 1000 * 60 * 60 * 36), icon: '💼' },
];

const upcomingBills = [
    { name: 'Rent Payment', amount: 25000, dueDate: '5 days', icon: '🏠', status: 'upcoming' },
    { name: 'Phone Bill', amount: 799, dueDate: '8 days', icon: '📱', status: 'upcoming' },
    { name: 'Insurance EMI', amount: 3500, dueDate: '12 days', icon: '🛡️', status: 'upcoming' },
];

const aiInsights = [
    {
        icon: Zap,
        title: 'Spending Spike Detected',
        message: 'Your food expenses are 23% higher than last month. Consider meal planning to optimize.',
        type: 'warning' as const,
    },
    {
        icon: Target,
        title: 'Savings Goal Progress',
        message: 'You\'re on track to meet your ₹50,000 savings goal by March with current habits.',
        type: 'success' as const,
    },
    {
        icon: Shield,
        title: 'Budget Optimization',
        message: 'Reducing entertainment by ₹500/month could save ₹6,000/year. Reallocate to investments.',
        type: 'info' as const,
    },
];

const budgetProgress = [
    { name: 'Food & Dining', spent: 18500, budget: 25000, color: '#10b981' },
    { name: 'Transportation', spent: 5200, budget: 8000, color: '#3b82f6' },
    { name: 'Shopping', spent: 12000, budget: 10000, color: '#ef4444' },
    { name: 'Entertainment', spent: 3200, budget: 5000, color: '#8b5cf6' },
];

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">
                        {greeting}, {user?.full_name?.split(' ')[0] || 'there'} 👋
                    </h1>
                    <p className="page-subtitle">Here's your financial overview for this month</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-caption text-[var(--color-text-secondary)]">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>Feb 2026</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
                <KPICard
                    title="Total Income"
                    value={90000}
                    change={12.5}
                    changeLabel="vs last month"
                    icon={TrendingUp}
                    accentColor="#10b981"
                    delay={0}
                />
                <KPICard
                    title="Total Expenses"
                    value={41239}
                    change={-8.3}
                    changeLabel="vs last month"
                    icon={CreditCard}
                    accentColor="#ef4444"
                    delay={100}
                />
                <KPICard
                    title="Net Balance"
                    value={48761}
                    change={18.2}
                    changeLabel="vs last month"
                    icon={DollarSign}
                    accentColor="#4f46e5"
                    delay={200}
                />
                <KPICard
                    title="Savings Rate"
                    value={54}
                    prefix=""
                    suffix="%"
                    change={5.1}
                    changeLabel="vs last month"
                    icon={PiggyBank}
                    accentColor="#06b6d4"
                    delay={300}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
                {/* Monthly Overview Chart */}
                <div className="xl:col-span-2 enterprise-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">
                                Monthly Overview
                            </h2>
                            <p className="text-caption text-[var(--color-text-tertiary)] mt-0.5">Income vs Expenses trend</p>
                        </div>
                        <div className="flex items-center gap-4 text-caption">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-success-500" />Income
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-danger-500" />Expenses
                            </span>
                        </div>
                    </div>
                    {/* Chart placeholder with gradient bars */}
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'].map((month, i) => {
                            const incomeH = [60, 55, 70, 65, 80, 75][i];
                            const expenseH = [40, 50, 35, 45, 38, 42][i];
                            return (
                                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex gap-1 items-end h-52">
                                        <div
                                            className="flex-1 rounded-t-lg bg-gradient-to-t from-success-500 to-success-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group"
                                            style={{ height: `${incomeH}%` }}
                                        >
                                            <div className="tooltip -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                Income: ₹{(incomeH * 1100).toLocaleString()}
                                            </div>
                                        </div>
                                        <div
                                            className="flex-1 rounded-t-lg bg-gradient-to-t from-danger-500 to-danger-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer relative group"
                                            style={{ height: `${expenseH}%` }}
                                        >
                                            <div className="tooltip -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                Expenses: ₹{(expenseH * 1100).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium mt-2">{month}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Financial Health Score */}
                <div className="enterprise-card p-6">
                    <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-1">
                        Financial Health
                    </h2>
                    <p className="text-caption text-[var(--color-text-tertiary)] mb-6">Overall health score</p>
                    <HealthScoreRing score={78} />
                    <div className="mt-6 space-y-3">
                        {[
                            { label: 'Savings Rate', value: 'Excellent', color: 'text-success-500' },
                            { label: 'Budget Adherence', value: 'Good', color: 'text-success-500' },
                            { label: 'Spending Control', value: 'Needs Work', color: 'text-warning-500' },
                            { label: 'Income Growth', value: 'Stable', color: 'text-brand-500' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <span className="text-caption text-[var(--color-text-secondary)]">{item.label}</span>
                                <span className={clsx('text-caption font-semibold', item.color)}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
                {/* AI Insights */}
                <div className="enterprise-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">AI Insights</h2>
                    </div>
                    <div className="space-y-3">
                        {aiInsights.map((insight, i) => (
                            <div
                                key={i}
                                className={clsx(
                                    'p-3 rounded-xl border cursor-pointer hover:shadow-soft transition-all duration-200',
                                    insight.type === 'warning' && 'bg-warning-50/50 border-warning-200/50 dark:bg-warning-600/5 dark:border-warning-600/20',
                                    insight.type === 'success' && 'bg-success-50/50 border-success-200/50 dark:bg-success-600/5 dark:border-success-600/20',
                                    insight.type === 'info' && 'bg-brand-50/50 border-brand-200/50 dark:bg-brand-600/5 dark:border-brand-600/20',
                                )}
                            >
                                <div className="flex items-start gap-2.5">
                                    <insight.icon
                                        className={clsx(
                                            'w-4 h-4 mt-0.5 flex-shrink-0',
                                            insight.type === 'warning' && 'text-warning-500',
                                            insight.type === 'success' && 'text-success-500',
                                            insight.type === 'info' && 'text-brand-500',
                                        )}
                                    />
                                    <div>
                                        <p className="text-caption font-semibold text-[var(--color-text-primary)]">{insight.title}</p>
                                        <p className="text-caption text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{insight.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => navigate('/assistant')}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-caption font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-600/10 transition-colors"
                    >
                        Ask AI for more insights <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Budget Progress */}
                <div className="enterprise-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Budget Progress</h2>
                        <button
                            onClick={() => navigate('/budgets')}
                            className="text-caption font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            View all
                        </button>
                    </div>
                    <div className="space-y-4">
                        {budgetProgress.map((item) => {
                            const percentage = Math.min((item.spent / item.budget) * 100, 100);
                            const isOver = item.spent > item.budget;
                            return (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-caption font-medium text-[var(--color-text-primary)]">{item.name}</span>
                                        <span className={clsx('text-caption font-semibold', isOver ? 'text-danger-500' : 'text-[var(--color-text-secondary)]')}>
                                            {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: isOver ? '#ef4444' : item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Bills */}
                <div className="enterprise-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Upcoming Bills</h2>
                        <div className="badge badge-warning">
                            <Clock className="w-3 h-3 mr-1" />
                            {upcomingBills.length} pending
                        </div>
                    </div>
                    <div className="space-y-3">
                        {upcomingBills.map((bill, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                            >
                                <span className="text-xl">{bill.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-body font-medium text-[var(--color-text-primary)] truncate">{bill.name}</p>
                                    <p className="text-caption text-[var(--color-text-tertiary)]">Due in {bill.dueDate}</p>
                                </div>
                                <p className="text-body font-semibold text-[var(--color-text-primary)]">
                                    {formatCurrency(bill.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="enterprise-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-secondary)]">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <h2 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Recent Activity</h2>
                    </div>
                    <button
                        onClick={() => navigate('/transactions')}
                        className="text-caption font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                        View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="divide-y divide-[var(--color-border-secondary)]">
                    {recentTransactions.map((tx) => (
                        <div
                            key={tx.id}
                            className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                        >
                            <span className="text-xl w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                                {tx.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-body font-medium text-[var(--color-text-primary)] truncate">{tx.description}</p>
                                <p className="text-caption text-[var(--color-text-tertiary)]">{tx.category} • {formatRelativeTime(tx.date)}</p>
                            </div>
                            <p
                                className={clsx(
                                    'text-body font-semibold tabular-nums',
                                    tx.amount > 0 ? 'text-success-600 dark:text-success-400' : 'text-[var(--color-text-primary)]'
                                )}
                            >
                                {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
