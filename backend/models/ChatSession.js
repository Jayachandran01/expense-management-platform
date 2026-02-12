const { run, query, get } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

class ChatSession {
    static async create(userId, title = 'New Chat') {
        const id = uuidv4();
        const sql = `
            INSERT INTO chat_sessions (id, user_id, title)
            VALUES (?, ?, ?)
        `;
        await run(sql, [id, userId, title]);
        return { id, userId, title, created_at: new Date() };
    }

    static async findByUserId(userId) {
        const sql = `
            SELECT * FROM chat_sessions 
            WHERE user_id = ? 
            ORDER BY last_message_at DESC
        `;
        return await query(sql, [userId]);
    }

    static async findById(id) {
        const sql = 'SELECT * FROM chat_sessions WHERE id = ?';
        return await get(sql, [id]);
    }

    static async updateLastActive(id) {
        const sql = `
            UPDATE chat_sessions 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        return await run(sql, [id]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM chat_sessions WHERE id = ?';
        return await run(sql, [id]);
    }
}

module.exports = ChatSession;
