import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Sparkles,
    User,
    Bot,
    Lightbulb,
    TrendingUp,
    PiggyBank,
    Receipt,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    Copy,
    RefreshCw,
    Clock,
    ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
}

const suggestedPrompts = [
    { icon: TrendingUp, label: 'How are my spending trends this month?', category: 'Insights' },
    { icon: PiggyBank, label: 'Give me tips to save more money', category: 'Advice' },
    { icon: Receipt, label: 'Summarize my top expenses this week', category: 'Summary' },
    { icon: Lightbulb, label: 'Where can I cut unnecessary spending?', category: 'Optimization' },
];

const initialMessages: Message[] = [
    {
        id: 1,
        role: 'assistant',
        content: 'Hello! 👋 I\'m your AI Financial Assistant. I can help you analyze spending patterns, suggest savings strategies, summarize transactions, and answer questions about your finances.\n\nWhat would you like to know?',
        timestamp: new Date(),
        status: 'sent',
    },
];

const simulatedResponses: Record<string, string> = {
    default: "I've analyzed your financial data. Here's what I found:\n\n📊 **This Month's Overview:**\n- Total Income: ₹90,000\n- Total Expenses: ₹41,239\n- Savings Rate: 54%\n\n💡 **Key Insight:** Your savings rate has improved by 19% over the last 3 months. Keep it up!\n\nWould you like me to dive deeper into any specific category?",
    spending: "📈 **Spending Trends (February 2026):**\n\nYour spending this month is 8.3% lower than January. Here's the breakdown:\n\n1. **Food & Dining** — ₹18,500 (44.9%) ⬆️ Slightly above average\n2. **Shopping** — ₹12,000 (29.1%) ⚠️ Over budget by ₹2,000\n3. **Transportation** — ₹5,200 (12.6%) ✅ On track\n4. **Entertainment** — ₹3,200 (7.8%) ⬇️ 12% reduction\n5. **Utilities** — ₹2,339 (5.7%) ✅ Normal\n\n💡 **Recommendation:** Consider reducing shopping by 15% — that could save you ₹1,800/month.",
    save: "💰 **Smart Savings Strategies Based on Your Data:**\n\n1. **Consolidate Subscriptions** — You have overlapping streaming services (₹1,200/month savings potential)\n\n2. **Meal Planning** — Your food spending peaks on weekends. Planning ahead can cut 20% (₹3,700/month)\n\n3. **Auto-transfer to Savings** — Set up a ₹15,000 auto-transfer on salary day to enforce savings\n\n4. **Switch Payment Methods** — Using your cashback credit card for utilities could earn ₹400/month back\n\n5. **50/30/20 Rule** — You're close! Needs: 42%, Wants: 30%, Savings: 28%. Target 50/30/20 for ideal balance.\n\n📌 **Total Potential Savings:** ₹7,100/month = ₹85,200/year",
    expenses: "📋 **Top Expenses This Week:**\n\n| # | Description | Amount | Category |\n|---|-------------|--------|----------|\n| 1 | Amazon Electronics | ₹12,999 | Shopping |\n| 2 | Grocery - Big Bazaar | ₹2,450 | Food |\n| 3 | Gym Membership | ₹2,000 | Health |\n| 4 | Electricity Bill | ₹1,890 | Utilities |\n| 5 | Restaurant Lunch | ₹850 | Food |\n\n**Weekly Total:** ₹20,189\n\n⚠️ The Amazon purchase accounts for 64% of this week's spending. This appears to be a one-time purchase.",
};

export const AssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const sendMessage = (content: string) => {
        if (!content.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
            status: 'sent',
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            let response = simulatedResponses.default;
            const lower = content.toLowerCase();
            if (lower.includes('spending') || lower.includes('trend')) response = simulatedResponses.spending;
            else if (lower.includes('save') || lower.includes('tip')) response = simulatedResponses.save;
            else if (lower.includes('expense') || lower.includes('top') || lower.includes('summarize')) response = simulatedResponses.expenses;

            const aiMsg: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response,
                timestamp: new Date(),
                status: 'sent',
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500 + Math.random() * 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const renderMarkdown = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-heading-2 font-bold text-[var(--color-text-primary)]">AI Financial Assistant</h1>
                        <p className="text-caption text-[var(--color-text-tertiary)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                            Powered by AI • Your data stays private
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setMessages(initialMessages)}
                    className="btn-ghost text-caption flex items-center gap-1.5"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> New Chat
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto enterprise-card rounded-2xl px-4 py-6 space-y-6">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={clsx('flex gap-3 animate-fade-in', msg.role === 'user' && 'flex-row-reverse')}
                    >
                        {/* Avatar */}
                        <div className={clsx(
                            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                            msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'
                                : 'bg-gradient-to-br from-surface-400 to-surface-600 text-white'
                        )}>
                            {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        {/* Message Bubble */}
                        <div className={clsx('max-w-[75%]')}>
                            <div className={clsx(
                                'px-4 py-3 rounded-2xl text-body leading-relaxed',
                                msg.role === 'assistant'
                                    ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-tl-sm'
                                    : 'bg-brand-600 text-white rounded-tr-sm'
                            )}>
                                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                            </div>

                            {/* Message footer */}
                            <div className={clsx(
                                'mt-1 flex items-center gap-2',
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}>
                                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-1">
                                        <button className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-success-500 transition-colors">
                                            <ThumbsUp className="w-3 h-3" />
                                        </button>
                                        <button className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-danger-500 transition-colors">
                                            <ThumbsDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] px-4 py-3 rounded-2xl rounded-tl-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-[var(--color-text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            {messages.length <= 1 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(prompt.label)}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] hover:border-brand-300 hover:shadow-soft transition-all text-left group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center flex-shrink-0">
                                <prompt.icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-caption font-medium text-[var(--color-text-primary)] truncate">{prompt.label}</p>
                                <p className="text-[10px] text-[var(--color-text-tertiary)]">{prompt.category}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="mt-3 flex items-center gap-2 p-2 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask about your finances..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    className="flex-1 px-3 py-2.5 text-body bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] disabled:opacity-50"
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isTyping}
                    className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                        input.trim()
                            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-soft'
                            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                    )}
                >
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};
