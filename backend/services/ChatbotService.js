const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const AnalyticsService = require('./AnalyticsService');

class ChatbotService {
    /**
     * Main message processing function
     */
    static async processMessage(userId, message) {
        const lowerMessage = message.toLowerCase().trim();

        // Detect intent
        const intent = this.detectIntent(lowerMessage);

        // Process based on intent
        let response;

        try {
            switch (intent) {
                case 'GREETING':
                    response = await this.handleGreeting();
                    break;
                case 'HELP':
                    response = await this.handleHelp();
                    break;
                case 'GET_BALANCE':
                    response = await this.handleBalance(userId);
                    break;
                case 'GET_SPENDING_SUMMARY':
                    response = await this.handleSpendingSummary(userId, lowerMessage);
                    break;
                case 'GET_TOP_CATEGORIES':
                    response = await this.handleTopCategories(userId, lowerMessage);
                    break;
                case 'GET_BUDGET_STATUS':
                    response = await this.handleBudgetStatus(userId);
                    break;
                case 'GET_RECENT_TRANSACTIONS':
                    response = await this.handleRecentTransactions(userId, lowerMessage);
                    break;
                case 'GET_SAVINGS_ADVICE':
                    response = await this.handleSavingsAdvice(userId);
                    break;
                case 'GET_MONTHLY_TREND':
                    response = await this.handleMonthlyTrend(userId);
                    break;
                case 'GET_ALERTS':
                    response = await this.handleAlerts(userId);
                    break;
                case 'GET_INSIGHTS':
                    response = await this.handleInsights(userId);
                    break;
                default:
                    response = this.handleUnknown();
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            response = {
                text: "I'm having trouble processing that request right now. Please try again later.",
                intent: 'ERROR',
                data: null
            };
        }

        return response;
    }

    /**
     * Intent detection using pattern matching
     */
    static detectIntent(message) {
        const patterns = {
            GREETING: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings'],
            HELP: ['help', 'what can you do', 'how to', 'commands', 'guide'],
            GET_BALANCE: ['balance', 'how much do i have', 'how much money', 'current balance', 'my balance'],
            GET_SPENDING_SUMMARY: ['spending', 'spent', 'expenses', 'how much did i spend', 'where did my money go', 'expenditure'],
            GET_TOP_CATEGORIES: ['top categories', 'highest spending', 'most expensive', 'biggest expense', 'where am i spending most'],
            GET_BUDGET_STATUS: ['budget', 'budgets', 'budget status', 'am i over budget', 'budget alert', 'budget warning'],
            GET_RECENT_TRANSACTIONS: ['recent', 'last transaction', 'latest', 'recent activity', 'show transactions'],
            GET_SAVINGS_ADVICE: ['savings', 'save money', 'how to save', 'savings advice', 'recommendations', 'tips', 'advice'],
            GET_MONTHLY_TREND: ['trend', 'monthly', 'last few months', 'spending trend', 'income trend', 'pattern'],
            GET_ALERTS: ['alerts', 'warnings', 'notifications', 'overspending', 'spending spike'],
            GET_INSIGHTS: ['insights', 'analysis', 'financial analysis', 'comprehensive', 'overview', 'summary']
        };

        for (const [intent, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return intent;
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Handle greeting
     */
    static async handleGreeting() {
        const greetings = [
            "Hello! 👋 I'm your AI financial assistant. How can I help you manage your finances today?",
            "Hi there! 💰 Ready to take control of your finances? Ask me anything!",
            "Hey! 🎯 I'm here to help you with budgets, spending insights, and financial advice. What would you like to know?"
        ];

        return {
            text: greetings[Math.floor(Math.random() * greetings.length)],
            intent: 'GREETING',
            data: {
                suggestions: [
                    "What's my spending this month?",
                    "Show my budget status",
                    "Give me savings advice",
                    "What are my top spending categories?"
                ]
            }
        };
    }

    /**
     * Handle help request
     */
    static async handleHelp() {
        return {
            text: `I can help you with:\n\n📊 **Financial Overview**\n- "What's my balance?"\n- "Show me my financial summary"\n\n💸 **Spending Analysis**\n- "How much did I spend this month?"\n- "What are my top spending categories?"\n- "Show recent transactions"\n\n💰 **Budget Management**\n- "How are my budgets doing?"\n- "Am I over budget?"\n\n🎯 **Insights & Advice**\n- "Give me savings advice"\n- "Show spending trends"\n- "Any alerts or warnings?"\n\nJust ask me in natural language!`,
            intent: 'HELP',
            data: null
        };
    }

    /**
     * Handle balance inquiry
     */
    static async handleBalance(userId) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const summary = await AnalyticsService.getFinancialSummary(userId, startDate, endDate);

        const balanceText = summary.balance >= 0
            ? `Your balance this month is **₹${summary.balance.toFixed(2)}** 💚`
            : `You're ₹${Math.abs(summary.balance).toFixed(2)} in deficit this month 📉`;

        return {
            text: `${balanceText}\n\n📥 Income: ₹${summary.income.total.toFixed(2)}\n📤 Expenses: ₹${summary.expenses.total.toFixed(2)}\n💎 Savings Rate: ${summary.savings.rate.toFixed(1)}%`,
            intent: 'GET_BALANCE',
            data: summary
        };
    }

    /**
     * Handle spending summary
     */
    static async handleSpendingSummary(userId, message) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const summary = await AnalyticsService.getFinancialSummary(userId, startDate, endDate);
        const categoryBreakdown = await AnalyticsService.getCategoryBreakdown(userId, 'expense', startDate, endDate);

        let text = `This month, you've spent **₹${summary.expenses.total.toFixed(2)}** across ${summary.expenses.count} transactions.\n\n`;

        if (categoryBreakdown.length > 0) {
            text += `**Top spending categories:**\n`;
            categoryBreakdown.slice(0, 3).forEach((cat, i) => {
                text += `${i + 1}. ${cat.category_name}: ₹${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
            });
        }

        return {
            text,
            intent: 'GET_SPENDING_SUMMARY',
            data: {
                summary,
                breakdown: categoryBreakdown
            }
        };
    }

    /**
     * Handle top categories request
     */
    static async handleTopCategories(userId, message) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const topCategories = await AnalyticsService.getTopSpendingCategories(userId, startDate, endDate, 5);

        if (topCategories.length === 0) {
            return {
                text: "You haven't made any expenses this month yet! 🎉",
                intent: 'GET_TOP_CATEGORIES',
                data: []
            };
        }

        let text = `Here are your **top ${topCategories.length} spending categories** this month:\n\n`;
        topCategories.forEach(cat => {
            text += `${cat.rank}. **${cat.category_name}**: ₹${cat.total.toFixed(2)} (${cat.transaction_count} transactions)\n`;
        });

        return {
            text,
            intent: 'GET_TOP_CATEGORIES',
            data: topCategories
        };
    }

    /**
     * Handle budget status
     */
    static async handleBudgetStatus(userId) {
        const budgetComparison = await AnalyticsService.getBudgetVsActual(userId);

        if (budgetComparison.length === 0) {
            return {
                text: "You haven't set up any budgets yet. Would you like to create one? 📊",
                intent: 'GET_BUDGET_STATUS',
                data: []
            };
        }

        let text = `**Budget Status:**\n\n`;
        budgetComparison.forEach(budget => {
            const emoji = budget.status === 'exceeded' ? '🔴' : budget.status === 'warning' ? '⚠️' : '✅';
            text += `${emoji} **${budget.category_name}**: ₹${budget.spent_amount.toFixed(2)} / ₹${budget.budget_amount.toFixed(2)} (${budget.percentage_used.toFixed(1)}%)\n`;
        });

        const exceeded = budgetComparison.filter(b => b.is_exceeded).length;
        const warnings = budgetComparison.filter(b => b.is_warning && !b.is_exceeded).length;

        if (exceeded > 0) {
            text += `\n⚠️ You've exceeded ${exceeded} budget(s)!`;
        } else if (warnings > 0) {
            text += `\n⚡ ${warnings} budget(s) are nearing their limit.`;
        } else {
            text += `\n✨ All budgets are on track! Great job!`;
        }

        return {
            text,
            intent: 'GET_BUDGET_STATUS',
            data: budgetComparison
        };
    }

    /**
     * Handle recent transactions
     */
    static async handleRecentTransactions(userId, message) {
        const limit = message.includes('5') ? 5 : message.includes('10') ? 10 : 3;
        const transactions = await Transaction.getRecent(userId, limit);

        if (transactions.length === 0) {
            return {
                text: "No recent transactions found.",
                intent: 'GET_RECENT_TRANSACTIONS',
                data: []
            };
        }

        let text = `Here are your last ${transactions.length} transactions:\n\n`;
        transactions.forEach((t, i) => {
            const emoji = t.type === 'income' ? '💰' : '💸';
            text += `${i + 1}. ${emoji} ₹${t.amount} - ${t.category_name} (${t.description}) on ${t.transaction_date}\n`;
        });

        return {
            text,
            intent: 'GET_RECENT_TRANSACTIONS',
            data: transactions
        };
    }

    /**
     * Handle savings advice
     */
    static async handleSavingsAdvice(userId) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const recommendations = await AnalyticsService.generateSavingsRecommendations(userId, startDate, endDate);

        if (recommendations.length === 0) {
            return {
                text: "Great job! You're managing your finances well. Keep it up! 🎉",
                intent: 'GET_SAVINGS_ADVICE',
                data: []
            };
        }

        let text = `💡 **Savings Recommendations:**\n\n`;
        recommendations.forEach((rec, i) => {
            text += `${i + 1}. ${rec.message}\n`;
        });

        return {
            text,
            intent: 'GET_SAVINGS_ADVICE',
            data: recommendations
        };
    }

    /**
     * Handle monthly trend
     */
    static async handleMonthlyTrend(userId) {
        const trend = await AnalyticsService.getMonthlyTrend(userId, 3);

        if (trend.length === 0) {
            return {
                text: "Not enough data to show trends yet.",
                intent: 'GET_MONTHLY_TREND',
                data: []
            };
        }

        let text = `📈 **Spending Trend (Last ${trend.length} months):**\n\n`;
        trend.forEach(month => {
            text += `**${month.month}**\n`;
            text += `  Income: ₹${month.income.toFixed(2)} | Expenses: ₹${month.expenses.toFixed(2)}\n`;
            text += `  Savings: ₹${month.savings.toFixed(2)} (${month.savings_rate.toFixed(1)}%)\n\n`;
        });

        return {
            text,
            intent: 'GET_MONTHLY_TREND',
            data: trend
        };
    }

    /**
     * Handle alerts
     */
    static async handleAlerts(userId) {
        const overspending = await AnalyticsService.detectOverspending(userId);
        const warnings = await AnalyticsService.detectBudgetWarnings(userId);
        const spikes = await AnalyticsService.detectSpendingSpikes(userId, 7, 50);

        const totalAlerts = overspending.length + warnings.length + spikes.length;

        if (totalAlerts === 0) {
            return {
                text: "✅ No alerts! Everything looks good!",
                intent: 'GET_ALERTS',
                data: { overspending: [], warnings: [], spikes: [] }
            };
        }

        let text = `🚨 **You have ${totalAlerts} alert(s):**\n\n`;

        if (overspending.length > 0) {
            text += `**Budget Exceeded:**\n`;
            overspending.forEach(alert => {
                text += `- ${alert.message}\n`;
            });
            text += `\n`;
        }

        if (warnings.length > 0) {
            text += `**Budget Warnings:**\n`;
            warnings.forEach(alert => {
                text += `- ${alert.message}\n`;
            });
            text += `\n`;
        }

        if (spikes.length > 0) {
            text += `**Spending Spikes:**\n`;
            spikes.forEach(alert => {
                text += `- ${alert.message}\n`;
            });
        }

        return {
            text,
            intent: 'GET_ALERTS',
            data: { overspending, warnings, spikes }
        };
    }

    /**
     * Handle comprehensive insights
     */
    static async handleInsights(userId) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const insights = await AnalyticsService.getAllInsights(userId, startDate, endDate);

        let text = `📊 **Financial Insights Overview:**\n\n`;
        text += `💰 **Balance:** ₹${insights.summary.balance.toFixed(2)}\n`;
        text += `📈 **Savings Rate:** ${insights.summary.savings.rate.toFixed(1)}%\n`;
        text += `💸 **Total Expenses:** ₹${insights.summary.expenses.total.toFixed(2)}\n\n`;

        const totalAlerts = insights.alerts.overspending.length + insights.alerts.budget_warnings.length + insights.alerts.spending_spikes.length;
        text += `🚨 **Alerts:** ${totalAlerts}\n`;
        text += `💡 **Recommendations:** ${insights.recommendations.length}\n`;

        return {
            text,
            intent: 'GET_INSIGHTS',
            data: insights
        };
    }

    /**
     * Handle unknown intent
     */
    static handleUnknown() {
        return {
            text: "I'm not sure I understand. Try asking about your spending, budget status, or recent transactions. Type 'help' for more options! 🤖",
            intent: 'UNKNOWN',
            data: null
        };
    }
}

module.exports = ChatbotService;

