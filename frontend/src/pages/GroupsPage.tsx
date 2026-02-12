import React, { useState } from 'react';
import {
    Plus,
    Users,
    ArrowRight,
    ArrowLeft,
    DollarSign,
    UserPlus,
    X,
    Check,
    Mail,
    Clock,
    ChevronRight,
    BarChart3,
    Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate, getInitials } from '../utils/helpers';

interface GroupData {
    id: number;
    name: string;
    icon: string;
    members: { id: number; name: string; email: string; avatar: string }[];
    totalExpenses: number;
    youOwe: number;
    youAreOwed: number;
    recentExpenses: { description: string; amount: number; paidBy: string; date: string }[];
}

const mockGroups: GroupData[] = [
    {
        id: 1,
        name: 'Office Lunch Group',
        icon: '🍱',
        members: [
            { id: 1, name: 'You', email: 'you@email.com', avatar: 'Y' },
            { id: 2, name: 'Rahul S.', email: 'rahul@email.com', avatar: 'RS' },
            { id: 3, name: 'Priya M.', email: 'priya@email.com', avatar: 'PM' },
            { id: 4, name: 'Arjun K.', email: 'arjun@email.com', avatar: 'AK' },
        ],
        totalExpenses: 12400,
        youOwe: 1500,
        youAreOwed: 3200,
        recentExpenses: [
            { description: 'Team lunch at Mainland China', amount: 4800, paidBy: 'You', date: '2026-02-10' },
            { description: 'Coffee & snacks', amount: 600, paidBy: 'Rahul S.', date: '2026-02-08' },
            { description: 'Pizza party', amount: 2400, paidBy: 'Priya M.', date: '2026-02-05' },
        ],
    },
    {
        id: 2,
        name: 'Weekend Trip',
        icon: '✈️',
        members: [
            { id: 1, name: 'You', email: 'you@email.com', avatar: 'Y' },
            { id: 5, name: 'Sneha P.', email: 'sneha@email.com', avatar: 'SP' },
            { id: 6, name: 'Vikram R.', email: 'vikram@email.com', avatar: 'VR' },
        ],
        totalExpenses: 35000,
        youOwe: 5600,
        youAreOwed: 0,
        recentExpenses: [
            { description: 'Hotel booking', amount: 18000, paidBy: 'Sneha P.', date: '2026-01-28' },
            { description: 'Fuel expenses', amount: 4500, paidBy: 'Vikram R.', date: '2026-01-29' },
            { description: 'Activity tickets', amount: 6000, paidBy: 'You', date: '2026-01-29' },
        ],
    },
    {
        id: 3,
        name: 'Roommates',
        icon: '🏠',
        members: [
            { id: 1, name: 'You', email: 'you@email.com', avatar: 'Y' },
            { id: 7, name: 'Karan D.', email: 'karan@email.com', avatar: 'KD' },
        ],
        totalExpenses: 52000,
        youOwe: 0,
        youAreOwed: 8500,
        recentExpenses: [
            { description: 'Rent - February', amount: 25000, paidBy: 'You', date: '2026-02-01' },
            { description: 'Electricity bill', amount: 2400, paidBy: 'Karan D.', date: '2026-02-05' },
            { description: 'WiFi bill', amount: 1200, paidBy: 'You', date: '2026-02-03' },
        ],
    },
];

export const GroupsPage: React.FC = () => {
    const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const totalOwed = mockGroups.reduce((s, g) => s + g.youAreOwed, 0);
    const totalOwe = mockGroups.reduce((s, g) => s + g.youOwe, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Group Expenses</h1>
                    <p className="page-subtitle">Split bills and settle up with friends and family</p>
                </div>
                <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="btn-primary flex items-center gap-2 text-caption"
                >
                    <Plus className="w-4 h-4" /> Create Group
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card" style={{ '--kpi-accent': '#4f46e5' } as React.CSSProperties}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Total Groups</p>
                            <p className="text-heading-2 font-bold text-[var(--color-text-primary)]">{mockGroups.length}</p>
                        </div>
                    </div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#10b981' } as React.CSSProperties}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-600/10 flex items-center justify-center">
                            <ArrowLeft className="w-5 h-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">You're Owed</p>
                            <p className="text-heading-2 font-bold text-success-600 dark:text-success-400">{formatCurrency(totalOwed)}</p>
                        </div>
                    </div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#ef4444' } as React.CSSProperties}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-danger-50 dark:bg-danger-600/10 flex items-center justify-center">
                            <ArrowRight className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                        </div>
                        <div>
                            <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">You Owe</p>
                            <p className="text-heading-2 font-bold text-danger-600 dark:text-danger-400">{formatCurrency(totalOwe)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Groups Grid & Detail Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Groups List */}
                <div className="xl:col-span-1 space-y-3">
                    {mockGroups.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className={clsx(
                                'enterprise-card p-4 cursor-pointer transition-all duration-200',
                                selectedGroup?.id === group.id && 'ring-2 ring-brand-500 shadow-glow-brand'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{group.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-body font-semibold text-[var(--color-text-primary)]">{group.name}</p>
                                    <p className="text-caption text-[var(--color-text-tertiary)]">{group.members.length} members</p>
                                    {/* Member Avatars */}
                                    <div className="flex -space-x-2 mt-2">
                                        {group.members.slice(0, 4).map((m) => (
                                            <div
                                                key={m.id}
                                                className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[var(--color-bg-primary)]"
                                                title={m.name}
                                            >
                                                {m.avatar}
                                            </div>
                                        ))}
                                        {group.members.length > 4 && (
                                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-tertiary)] ring-2 ring-[var(--color-bg-primary)]">
                                                +{group.members.length - 4}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {group.youAreOwed > 0 && (
                                        <p className="text-caption font-semibold text-success-600 dark:text-success-400">
                                            +{formatCurrency(group.youAreOwed)}
                                        </p>
                                    )}
                                    {group.youOwe > 0 && (
                                        <p className="text-caption font-semibold text-danger-600 dark:text-danger-400">
                                            -{formatCurrency(group.youOwe)}
                                        </p>
                                    )}
                                    {group.youOwe === 0 && group.youAreOwed === 0 && (
                                        <span className="badge badge-success">Settled</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail Panel */}
                <div className="xl:col-span-2">
                    {selectedGroup ? (
                        <div className="space-y-4 animate-fade-in">
                            {/* Group Header */}
                            <div className="enterprise-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{selectedGroup.icon}</span>
                                        <div>
                                            <h2 className="text-heading-2 font-bold text-[var(--color-text-primary)]">{selectedGroup.name}</h2>
                                            <p className="text-caption text-[var(--color-text-tertiary)]">
                                                Total expenses: {formatCurrency(selectedGroup.totalExpenses)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="btn-ghost text-caption flex items-center gap-1.5"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" /> Invite
                                        </button>
                                        <button className="btn-primary text-caption flex items-center gap-1.5">
                                            <DollarSign className="w-3.5 h-3.5" /> Settle Up
                                        </button>
                                    </div>
                                </div>

                                {/* Settlement Graph */}
                                <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                                    <p className="text-caption font-semibold text-[var(--color-text-primary)] mb-3">Settlement Summary</p>
                                    <div className="space-y-2">
                                        {selectedGroup.members.filter(m => m.name !== 'You').map((member) => {
                                            const owes = member.id % 2 === 0;
                                            const amount = (member.id * 1234) % 3000 + 500;
                                            return (
                                                <div key={member.id} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {member.avatar}
                                                    </div>
                                                    <span className="text-body text-[var(--color-text-primary)] font-medium flex-1">{member.name}</span>
                                                    <div className={clsx(
                                                        'flex items-center gap-1 text-caption font-semibold',
                                                        owes ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
                                                    )}>
                                                        {owes ? (
                                                            <><ArrowLeft className="w-3 h-3" /> owes you {formatCurrency(amount)}</>
                                                        ) : (
                                                            <><ArrowRight className="w-3 h-3" /> you owe {formatCurrency(amount)}</>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Expense Timeline */}
                            <div className="enterprise-card p-6">
                                <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-4">Expense Timeline</h3>
                                <div className="space-y-4">
                                    {selectedGroup.recentExpenses.map((exp, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="relative flex flex-col items-center">
                                                <div className="w-3 h-3 rounded-full bg-brand-500 z-10" />
                                                {i < selectedGroup.recentExpenses.length - 1 && (
                                                    <div className="w-0.5 h-12 bg-[var(--color-border-primary)] absolute top-3" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-body font-medium text-[var(--color-text-primary)]">{exp.description}</p>
                                                        <p className="text-caption text-[var(--color-text-tertiary)]">
                                                            Paid by {exp.paidBy} • {formatDate(exp.date)}
                                                        </p>
                                                    </div>
                                                    <p className="text-body font-semibold text-[var(--color-text-primary)]">
                                                        {formatCurrency(exp.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Member Contribution */}
                            <div className="enterprise-card p-6">
                                <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-4">Member Contributions</h3>
                                <div className="space-y-3">
                                    {selectedGroup.members.map((member) => {
                                        const contribution = (member.id * 9876) % 8000 + 2000;
                                        const percentage = (contribution / selectedGroup.totalExpenses) * 100;
                                        return (
                                            <div key={member.id} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                                    {member.avatar}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between text-caption mb-1">
                                                        <span className="font-medium text-[var(--color-text-primary)]">{member.name}</span>
                                                        <span className="text-[var(--color-text-secondary)]">{formatCurrency(contribution)}</span>
                                                    </div>
                                                    <div className="progress-bar">
                                                        <div className="progress-bar-fill bg-brand-500" style={{ width: `${percentage}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="enterprise-card p-12 text-center">
                            <Users className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
                            <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-2">
                                Select a group
                            </h3>
                            <p className="text-body text-[var(--color-text-tertiary)]">
                                Click on a group to view details, settlements, and contribution breakdown
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {
                showInviteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                        <div className="relative w-full max-w-md mx-4 enterprise-card p-6 shadow-modal animate-scale-in bg-[var(--color-bg-primary)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Invite Member</h3>
                                <button onClick={() => setShowInviteModal(false)} className="p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                        <input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="input-field pl-10 w-full"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                                    className="btn-primary w-full flex items-center justify-center gap-2 text-caption py-2.5"
                                >
                                    <UserPlus className="w-4 h-4" /> Send Invitation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Group Modal */}
            {
                showCreateGroupModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm" onClick={() => setShowCreateGroupModal(false)} />
                        <div className="relative w-full max-w-md mx-4 enterprise-card p-6 shadow-modal animate-scale-in bg-[var(--color-bg-primary)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Create New Group</h3>
                                <button onClick={() => setShowCreateGroupModal(false)} className="p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                        Group Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Weekend Trip, Roommates"
                                        className="input-field w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        className="input-field w-full h-20 resize-none"
                                        placeholder="What's this group for?"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowCreateGroupModal(false)}
                                    className="btn-primary w-full flex items-center justify-center gap-2 text-caption py-2.5"
                                >
                                    <Plus className="w-4 h-4" /> Create Group
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
