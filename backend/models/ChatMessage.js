const { run, query } = require('../database/init');

class ChatMessage {
    static async create(messageData) {
        const { sessionId, sender, content, intent, metadata } = messageData;

        const sql = `
            INSERT INTO chat_messages (session_id, sender, content, intent, metadata)
            VALUES (?, ?, ?, ?, ?)
        `;

        // Metadata should be JSON stringified if it's an object
        const metadataStr = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;

        const result = await run(sql, [sessionId, sender, content, intent, metadataStr]);
        return {
            id: result.id,
            ...messageData,
            metadata: metadataStr,
            created_at: new Date()
        };
    }

    static async findBySessionId(sessionId, limit = 50, offset = 0) {
        const sql = `
            SELECT * FROM chat_messages 
            WHERE session_id = ? 
            ORDER BY created_at ASC
            LIMIT ? OFFSET ?
        `;
        return await query(sql, [sessionId, limit, offset]);
    }
}

module.exports = ChatMessage;
