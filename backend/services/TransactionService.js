const { query } = require('../database/init');

class TransactionService {
    static async getBalance(userId) {
        const sql = `
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
            FROM transactions 
            WHERE user_id = ?
        `;
        const result = await query(sql, [userId]);
        return result[0]?.balance || 0;
    }

    static async getRecentTransactions(userId, limit = 5) {
        const sql = `
            SELECT t.*, c.name as category_name 
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? 
            ORDER BY transaction_date DESC, created_at DESC
            LIMIT ?
        `;
        return await query(sql, [userId, limit]);
    }

    static async getSpendingByCategory(userId, month = null, year = null) {
        let dateCondition = '';
        const params = [userId];

        if (month && year) {
            dateCondition = "AND strftime('%m', transaction_date) = ? AND strftime('%Y', transaction_date) = ?";
            params.push(month.toString().padStart(2, '0'), year.toString());
        }

        const sql = `
            SELECT c.name as category, SUM(t.amount) as total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? AND t.type = 'expense' ${dateCondition}
            GROUP BY c.name
            ORDER BY total DESC
        `;
        return await query(sql, params);
    }
}

module.exports = TransactionService;
