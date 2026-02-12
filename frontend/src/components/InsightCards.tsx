import React, { useEffect, useState } from 'react';
import { insightService } from '../services/enterpriseServices';

interface InsightCardProps {
    maxInsights?: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
    critical: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: '🚨', badge: 'bg-rose-500' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠️', badge: 'bg-amber-500' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '💡', badge: 'bg-blue-500' },
};

const InsightCards: React.FC<InsightCardProps> = ({ maxInsights = 5 }) => {
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const { data } = await insightService.getInsights({ unread: true });
                setInsights(data.data.insights.slice(0, maxInsights));
            } catch {
                // Fail silently
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [maxInsights]);

    const handleDismiss = async (id: string) => {
        await insightService.dismiss(id);
        setInsights((prev) => prev.filter((i) => i.id !== id));
    };

    const handleMarkRead = async (id: string) => {
        await insightService.markRead(id);
        setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    };

    if (loading) return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse border border-slate-700">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-full" />
                </div>
            ))}
        </div>
    );

    if (insights.length === 0) return (
        <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
            <p className="text-slate-400">No new insights — your finances look great! ✨</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {insights.map((insight, index) => {
                const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
                return (
                    <div
                        key={insight.id}
                        className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all duration-300 hover:scale-[1.01]`}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                                <span className="text-xl">{style.icon}</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-semibold text-sm ${!insight.is_read ? 'text-slate-100' : 'text-slate-300'}`}>
                                            {insight.title}
                                        </h4>
                                        {!insight.is_read && (
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">{insight.description}</p>
                                    {insight.is_actionable && (
                                        <button
                                            onClick={() => handleMarkRead(insight.id)}
                                            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                        >
                                            {insight.action_type === 'convert_to_recurring' ? 'Mark as Recurring →' : 'View Details →'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDismiss(insight.id)}
                                className="text-slate-600 hover:text-slate-400 text-lg transition-colors flex-shrink-0"
                                title="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default InsightCards;
