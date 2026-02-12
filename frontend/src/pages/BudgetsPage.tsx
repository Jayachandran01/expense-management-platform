import React, { useState } from 'react';
import {
    Plus,
    AlertTriangle,
    Target,
    TrendingUp,
    Sparkles,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    BarChart3,
    Sliders,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../utils/helpers';

interface BudgetItem {
    id: number;
    category: string;
    icon: string;
    budget: number;
    spent: number;
    color: string;
    trend: number;
}

const mockBudgets: BudgetItem[] = [
    { id: 1, category: 'Food & Dining', icon: '🍕', budget: 25000, spent: 18500, color: '#10b981', trend: -5 },
    { id: 2, category: 'Transportation', icon: '🚗', budget: 8000, spent: 5200, color: '#3b82f6', trend: 3 },
    { id: 3, category: 'Shopping', icon: '🛍️', budget: 10000, spent: 12000, color: '#ef4444', trend: 20 },
    { id: 4, category: 'Entertainment', icon: '🎬', budget: 5000, spent: 3200, color: '#8b5cf6', trend: -12 },
    { id: 5, category: 'Utilities', icon: '⚡', budget: 6000, spent: 4800, color: '#06b6d4', trend: 8 },
    { id: 6, category: 'Health', icon: '🏥', budget: 4000, spent: 2100, color: '#f59e0b', trend: -15 },
];

const ProgressRing: React.FC<{ percentage: number; color: string; size?: number }> = ({ percentage, color, size = 80 }) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
    const isOver = percentage > 100;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke="var(--color-border-secondary)"
                    strokeWidth="5"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={isOver ? '#ef4444' : color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={clsx('text-caption font-bold', isOver ? 'text-danger-500' : 'text-[var(--color-text-primary)]')}>
                    {Math.round(percentage)}%
                </span>
            </div>
        </div>
    );
};

const aiRecommendations = [
    {
        title: 'Reduce Shopping Budget',
        message: 'You consistently overspend on shopping by ~20%. Consider lowering budget to ₹12,000 to be more realistic.',
        savings: 2000,
        priority: 'high' as const,
    },
    {
        title: 'Increase Food Budget',
        message: 'Your food spending has been steady at ₹18K-20K. Current budget of ₹25K has excess room. Reallocate ₹3,000.',
        savings: 3000,
        priority: 'medium' as const,
    },
    {
        title: 'Create Health Savings Fund',
        message: 'You barely use 50% of health budget. Redirect ₹2,000/month to emergency health fund.',
        savings: 2000,
        priority: 'low' as const,
    },
];

export const BudgetsPage: React.FC = () => {
    const [view, setView] = useState<'cards' | 'comparison'>('cards');
    const [scenarioMultiplier, setScenarioMultiplier] = useState(1);

    const totalBudget = mockBudgets.reduce((sum, b) => sum + b.budget, 0);
    const totalSpent = mockBudgets.reduce((sum, b) => sum + b.spent, 0);
    const overBudgetCount = mockBudgets.filter((b) => b.spent > b.budget).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Budgets</h1>
                    <p className="page-subtitle">Track, manage, and optimize your spending limits</p>
                </div>
                <button className="btn-primary flex items-center gap-2 text-caption">
                    <Plus className="w-4 h-4" /> Create Budget
                </button>
            </div>

            {/* Overspending Alert */}
            {overBudgetCount > 0 && (
                <div className="enterprise-card p-4 border-l-4 border-danger-500 bg-danger-50/50 dark:bg-danger-600/5 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-danger-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-body font-semibold text-danger-600 dark:text-danger-400">
                                {overBudgetCount} budget{overBudgetCount > 1 ? 's' : ''} exceeded
                            </p>
                            <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
                                Shopping is ₹{(12000 - 10000).toLocaleString()} over budget. Review your spending to get back on track.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card" style={{ '--kpi-accent': '#4f46e5' } as React.CSSProperties}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Total Budget</p>
                            <p className="text-heading-2 font-bold text-[var(--color-text-primary)]">{formatCurrency(totalBudget)}</p>
                        </div>
                    </div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#10b981' } as React.CSSProperties}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-600/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Remaining</p>
                            <p className="text-heading-2 font-bold text-success-600 dark:text-success-400">
                                {formatCurrency(totalBudget - totalSpent)}
                            </p>
                        </div>
                    </div>
                    <p className="text-caption text-[var(--color-text-tertiary)]">
                        {Math.round(((totalBudget - totalSpent) / totalBudget) * 100)}% of total budget
                    </p>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#ef4444' } as React.CSSProperties}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-danger-50 dark:bg-danger-600/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Over Budget</p>
                            <p className="text-heading-2 font-bold text-danger-600 dark:text-danger-400">{overBudgetCount}</p>
                        </div>
                    </div>
                    <p className="text-caption text-[var(--color-text-tertiary)]">
                        categories exceeded
                    </p>
                </div>
            </div>

            {/* View Toggle & Budget Grid */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setView('cards')}
                    className={clsx('btn-ghost text-caption', view === 'cards' && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]')}
                >
                    <Target className="w-3.5 h-3.5 mr-1.5" /> Progress
                </button>
                <button
                    onClick={() => setView('comparison')}
                    className={clsx('btn-ghost text-caption', view === 'comparison' && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]')}
                >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Comparison
                </button>
            </div>

            {view === 'cards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mockBudgets.map((item) => {
                        const percentage = (item.spent / item.budget) * 100;
                        const isOver = item.spent > item.budget;
                        return (
                            <div key={item.id} className="enterprise-card p-5 hover:shadow-elevated transition-all duration-200">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{item.icon}</span>
                                        <div>
                                            <p className="text-body font-semibold text-[var(--color-text-primary)]">{item.category}</p>
                                            <div className={clsx(
                                                'flex items-center gap-1 text-[10px] font-semibold mt-0.5',
                                                item.trend > 0 ? 'text-danger-500' : 'text-success-500'
                                            )}>
                                                {item.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {Math.abs(item.trend)}% vs last month
                                            </div>
                                        </div>
                                    </div>
                                    <ProgressRing percentage={percentage} color={item.color} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-caption">
                                        <span className="text-[var(--color-text-tertiary)]">Spent</span>
                                        <span className={clsx('font-semibold', isOver ? 'text-danger-500' : 'text-[var(--color-text-primary)]')}>
                                            {formatCurrency(item.spent)}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: isOver ? '#ef4444' : item.color }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
                                        <span>Budget: {formatCurrency(item.budget)}</span>
                                        <span>
                                            {isOver
                                                ? <span className="text-danger-500 font-medium">Over by {formatCurrency(item.spent - item.budget)}</span>
                                                : `${formatCurrency(item.budget - item.spent)} left`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {view === 'comparison' && (
                <div className="enterprise-card p-6">
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-6">Monthly Budget vs Actual</h3>
                    <div className="space-y-4">
                        {mockBudgets.map((item) => {
                            const budgetWidth = 100;
                            const spentWidth = Math.min((item.spent / item.budget) * 100, 130);
                            return (
                                <div key={item.id} className="flex items-center gap-4">
                                    <div className="w-32 flex items-center gap-2 flex-shrink-0">
                                        <span>{item.icon}</span>
                                        <span className="text-caption font-medium text-[var(--color-text-primary)] truncate">{item.category}</span>
                                    </div>
                                    <div className="flex-1 relative h-8">
                                        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                                            <div className="w-full h-3 rounded-full bg-[var(--color-bg-tertiary)] relative overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min(spentWidth, 100)}%`,
                                                        backgroundColor: item.spent > item.budget ? '#ef4444' : item.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-40 flex items-center justify-end gap-1 flex-shrink-0 text-caption">
                                        <span className={clsx('font-semibold', item.spent > item.budget ? 'text-danger-500' : 'text-[var(--color-text-primary)]')}>
                                            {formatCurrency(item.spent)}
                                        </span>
                                        <span className="text-[var(--color-text-tertiary)]">/</span>
                                        <span className="text-[var(--color-text-tertiary)]">{formatCurrency(item.budget)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Recommendations + Scenario Tool */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* AI Recommendations */}
                <div className="enterprise-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">AI Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                        {aiRecommendations.map((rec, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <p className="text-body font-semibold text-[var(--color-text-primary)]">{rec.title}</p>
                                    <span className={clsx(
                                        'badge text-[10px]',
                                        rec.priority === 'high' && 'badge-danger',
                                        rec.priority === 'medium' && 'badge-warning',
                                        rec.priority === 'low' && 'badge-success',
                                    )}>
                                        {rec.priority}
                                    </span>
                                </div>
                                <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed">{rec.message}</p>
                                <p className="text-caption font-semibold text-success-600 dark:text-success-400 mt-2">
                                    Potential savings: {formatCurrency(rec.savings)}/month
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scenario Simulation */}
                <div className="enterprise-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sliders className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Scenario Simulator</h3>
                    </div>
                    <p className="text-caption text-[var(--color-text-tertiary)] mb-4">
                        Adjust your overall budget and see the impact
                    </p>
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-caption text-[var(--color-text-tertiary)]">-30%</span>
                        <input
                            type="range"
                            min={0.7}
                            max={1.3}
                            step={0.05}
                            value={scenarioMultiplier}
                            onChange={(e) => setScenarioMultiplier(parseFloat(e.target.value))}
                            className="flex-1 accent-brand-600"
                        />
                        <span className="text-caption text-[var(--color-text-tertiary)]">+30%</span>
                        <span className="text-body font-bold text-brand-600 w-16 text-right">
                            {scenarioMultiplier > 1 ? '+' : ''}{Math.round((scenarioMultiplier - 1) * 100)}%
                        </span>
                    </div>
                    <div className="space-y-3">
                        {mockBudgets.slice(0, 4).map((item) => {
                            const newBudget = Math.round(item.budget * scenarioMultiplier);
                            const newPercentage = (item.spent / newBudget) * 100;
                            return (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span>{item.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-caption mb-1">
                                            <span className="text-[var(--color-text-primary)] font-medium">{item.category}</span>
                                            <span className={clsx('font-semibold', newPercentage > 100 ? 'text-danger-500' : 'text-[var(--color-text-primary)]')}>
                                                {formatCurrency(newBudget)}
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${Math.min(newPercentage, 100)}%`,
                                                    backgroundColor: newPercentage > 100 ? '#ef4444' : item.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-brand-50/50 dark:bg-brand-600/5 text-center">
                        <p className="text-caption text-[var(--color-text-secondary)]">
                            New monthly total:{' '}
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                                {formatCurrency(Math.round(totalBudget * scenarioMultiplier))}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
