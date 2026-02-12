const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Rule-based AI Financial Assistant
 */

// Intent patterns
const INTENTS = {
    SPENDING_SUMMARY: ['spending', 'spent', 'expense', 'how much', 'total expense', 'money spent', 'expenditure'],
    INCOME_SUMMARY: ['income', 'earned', 'received', 'salary', 'total income'],
    BUDGET_STATUS: ['budget', 'budget status', 'budget left', 'remaining budget', 'over budget'],
    TOP_CATEGORY: ['top category', 'highest category', 'most spending', 'where am i spending', 'biggest expense'],
    FORECAST: ['forecast', 'predict', 'next month', 'future', 'projection', 'expected'],
    SAVINGS: ['savings', 'save', 'saving rate', 'saved', 'net savings'],
    ADVICE: ['advice', 'suggest', 'recommendation', 'tip', 'help me save', 'financial advice'],
    RECENT: ['recent', 'last transaction', 'latest', 'history'],
    GREETING: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'],
};

function detectIntent(text) {
    const lower = text.toLowerCase();
    let bestIntent = 'UNKNOWN';
    let bestScore = 0;
    for (const [intent, keywords] of Object.entries(INTENTS)) {
        const score = keywords.filter(k => lower.includes(k)).length;
        if (score > bestScore) { bestScore = score; bestIntent = intent; }
    }
    return bestIntent;
}

/**
 * GET /api/v1/chat/sessions
 */
exports.getSessions = async (req, res) => {
    try {
        const sessions = await db('chat_sessions')
            .where({ user_id: req.user.id, is_active: true })
            .orderBy('updated_at', 'desc')
            .limit(20);
        res.json({ success: true, data: { sessions } });
    } catch (err) {
        logger.error('Get sessions error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch sessions' } });
    }
};

/**
 * POST /api/v1/chat/sessions
 */
exports.createSession = async (req, res) => {
    try {
        const [session] = await db('chat_sessions').insert({
            user_id: req.user.id, title: req.body.title || 'New Chat',
        }).returning('*');
        res.status(201).json({ success: true, data: { session } });
    } catch (err) {
        logger.error('Create session error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to create session' } });
    }
};

/**
 * GET /api/v1/chat/sessions/:id/messages
 */
exports.getMessages = async (req, res) => {
    try {
        const messages = await db('chat_messages')
            .where('session_id', req.params.id)
            .orderBy('created_at', 'asc');
        res.json({ success: true, data: { messages } });
    } catch (err) {
        logger.error('Get messages error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch messages' } });
    }
};

/**
 * POST /api/v1/chat/message
 */
exports.sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id, message } = req.body;

        if (!message) return res.status(400).json({ success: false, error: { message: 'Message is required' } });

        let sessionId = session_id;
        if (!sessionId) {
            const [session] = await db('chat_sessions').insert({ user_id: userId, title: message.substring(0, 50) }).returning('id');
            sessionId = session.id || session;
        }

        // Save user message
        await db('chat_messages').insert({ session_id: sessionId, role: 'user', content: message, intent: detectIntent(message) });

        // Generate response
        const intent = detectIntent(message);
        const response = await generateResponse(userId, intent, message);

        // Save assistant response
        await db('chat_messages').insert({
            session_id: sessionId, role: 'assistant', content: response.text,
            intent, metadata: JSON.stringify(response.metadata || {}),
        });

        await db('chat_sessions').where('id', sessionId).update({ title: message.substring(0, 50), updated_at: new Date() });

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                response: { text: response.text, intent, metadata: response.metadata },
            },
        });
    } catch (err) {
        logger.error('Chat message error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to process message' } });
    }
};

async function generateResponse(userId, intent, message) {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    switch (intent) {
        case 'GREETING':
            return { text: "Hello! 👋 I'm your AI financial assistant. I can help you with:\n\n• **Spending summary** — \"How much did I spend this month?\"\n• **Budget status** — \"How are my budgets?\"\n• **Top categories** — \"Where am I spending most?\"\n• **Savings** — \"How much did I save?\"\n• **Forecast** — \"What's my spending forecast?\"\n• **Advice** — \"Give me saving tips\"\n\nWhat would you like to know?" };

        case 'SPENDING_SUMMARY': {
            const [result] = await db('transactions').where({ user_id: userId, type: 'expense' }).whereNull('deleted_at')
                .where('transaction_date', '>=', monthStart).where('transaction_date', '<=', today).sum('amount as total').count('id as count');
            const total = parseFloat(result.total) || 0;
            return {
                text: `📊 **This Month's Spending**\n\nYou've spent **₹${total.toLocaleString('en-IN')}** across **${result.count}** transactions this month.\n\n${total > 50000 ? '⚠️ That\'s quite high! Consider reviewing your expenses.' : '✅ Your spending looks reasonable.'}`,
                metadata: { total, count: parseInt(result.count) },
            };
        }

        case 'INCOME_SUMMARY': {
            const [result] = await db('transactions').where({ user_id: userId, type: 'income' }).whereNull('deleted_at')
                .where('transaction_date', '>=', monthStart).sum('amount as total').count('id as count');
            const total = parseFloat(result.total) || 0;
            return {
                text: `💰 **This Month's Income**\n\nYou've received **₹${total.toLocaleString('en-IN')}** from **${result.count}** sources this month.`,
                metadata: { total, count: parseInt(result.count) },
            };
        }

        case 'BUDGET_STATUS': {
            const budgets = await db('budgets').where({ user_id: userId, is_active: true }).whereNull('deleted_at');
            if (!budgets.length) return { text: "You don't have any active budgets. Would you like to create one?" };

            let text = '📋 **Budget Status**\n\n';
            for (const b of budgets.slice(0, 5)) {
                const [{ total }] = await db('transactions').where({ user_id: userId, type: 'expense' }).whereNull('deleted_at')
                    .where('transaction_date', '>=', b.start_date).where('transaction_date', '<=', b.end_date)
                    .modify(qb => { if (b.category_id) qb.where('category_id', b.category_id); }).sum('amount as total');
                const spent = parseFloat(total) || 0;
                const pct = Math.round((spent / parseFloat(b.amount)) * 100);
                const status = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
                text += `${status} **${b.name}**: ₹${spent.toLocaleString('en-IN')} / ₹${parseFloat(b.amount).toLocaleString('en-IN')} (${pct}%)\n`;
            }
            return { text, metadata: { budget_count: budgets.length } };
        }

        case 'TOP_CATEGORY': {
            const categories = await db('transactions as t').leftJoin('categories as c', 't.category_id', 'c.id')
                .where({ 't.user_id': userId, 't.type': 'expense' }).whereNull('t.deleted_at')
                .where('t.transaction_date', '>=', monthStart)
                .select('c.name', 'c.icon').sum('t.amount as total').groupBy('c.name', 'c.icon')
                .orderBy('total', 'desc').limit(5);

            let text = '📊 **Top Spending Categories**\n\n';
            categories.forEach((c, i) => {
                text += `${i + 1}. ${c.icon || '📦'} **${c.name || 'Uncategorized'}**: ₹${parseFloat(c.total).toLocaleString('en-IN')}\n`;
            });
            return { text, metadata: { categories } };
        }

        case 'FORECAST': {
            const forecast = await db('forecast_results').where('user_id', userId).orderBy('created_at', 'desc').first();
            if (!forecast) return { text: "I don't have enough data to forecast yet. Keep logging your transactions and I'll be able to predict your spending soon!" };

            const data = typeof forecast.forecast_data === 'string' ? JSON.parse(forecast.forecast_data) : forecast.forecast_data;
            const forecasts = data.forecast || [];
            let text = '📈 **Spending Forecast**\n\n';
            forecasts.forEach(f => {
                text += `**${f.month}**: ₹${f.predicted.toLocaleString('en-IN')} (range: ₹${f.lower.toLocaleString('en-IN')} – ₹${f.upper.toLocaleString('en-IN')})\n`;
            });
            text += `\n_Model: ${forecast.model_used} | Confidence: ${forecasts[0]?.confidence ? Math.round(forecasts[0].confidence * 100) + '%' : 'N/A'}_`;
            return { text, metadata: { forecast: forecasts } };
        }

        case 'SAVINGS': {
            const [inc] = await db('transactions').where({ user_id: userId, type: 'income' }).whereNull('deleted_at')
                .where('transaction_date', '>=', monthStart).sum('amount as total');
            const [exp] = await db('transactions').where({ user_id: userId, type: 'expense' }).whereNull('deleted_at')
                .where('transaction_date', '>=', monthStart).sum('amount as total');
            const income = parseFloat(inc.total) || 0;
            const expense = parseFloat(exp.total) || 0;
            const savings = income - expense;
            const rate = income > 0 ? Math.round((savings / income) * 100) : 0;

            return {
                text: `💰 **Savings This Month**\n\nIncome: ₹${income.toLocaleString('en-IN')}\nExpenses: ₹${expense.toLocaleString('en-IN')}\n**Net Savings: ₹${savings.toLocaleString('en-IN')}** (${rate}% savings rate)\n\n${rate >= 30 ? '🎉 Excellent savings rate!' : rate >= 15 ? '👍 Good job, keep it up!' : '⚠️ Try to save more — aim for 20%+'}`,
                metadata: { income, expense, savings, rate },
            };
        }

        case 'ADVICE': {
            const tips = [
                "💡 Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
                "💡 Track every expense, even small ones — ₹50 coffees add up to ₹1,500/month.",
                "💡 Set up automatic SIP investments on salary day so savings happen first.",
                "💡 Review subscriptions monthly. Cancel unused services like OTT platforms.",
                "💡 Use UPI + cashback apps strategically, but don't overspend for cashback.",
                "💡 Cook at home 4 days a week. Swiggy/Zomato adds up massively.",
                "💡 Maintain a 3-month emergency fund before investing aggressively.",
                "💡 Use credit cards for rewards, but always pay the full balance.",
            ];
            const randomTips = tips.sort(() => Math.random() - 0.5).slice(0, 3);
            return { text: `🧠 **Financial Tips**\n\n${randomTips.join('\n\n')}` };
        }

        case 'RECENT': {
            const recent = await db('transactions as t').leftJoin('categories as c', 't.category_id', 'c.id')
                .where('t.user_id', userId).whereNull('t.deleted_at')
                .select('t.amount', 't.type', 't.description', 't.merchant', 't.transaction_date', 'c.name as category', 'c.icon')
                .orderBy('t.transaction_date', 'desc').limit(5);

            let text = '📋 **Recent Transactions**\n\n';
            recent.forEach(t => {
                const sign = t.type === 'income' ? '+' : '-';
                text += `${t.icon || '📦'} ${sign}₹${parseFloat(t.amount).toLocaleString('en-IN')} — ${t.description || t.merchant || 'No description'} (${t.transaction_date})\n`;
            });
            return { text, metadata: { transactions: recent } };
        }

        default:
            return {
                text: "I'm not sure I understand that. Try asking me:\n\n• \"How much did I spend this month?\"\n• \"What's my budget status?\"\n• \"Show my top spending categories\"\n• \"Give me financial advice\"\n• \"What's my savings rate?\"\n• \"Show recent transactions\"",
            };
    }
}
