const { db, run, get } = require('../database/init');
const bcrypt = require('bcrypt');

class UserModel {
    static async create(userData) {
        const { email, password, fullName, phone, currency = 'INR', timezone = 'Asia/Kolkata' } = userData;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = `
            INSERT INTO users (email, password_hash, full_name, phone, currency, timezone)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = await run(sql, [email, hashedPassword, fullName, phone, currency, timezone]);
        return { id: result.id, ...userData };
    }

    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        return await get(sql, [email]);
    }

    static async findById(id) {
        const sql = 'SELECT id, email, full_name, phone, currency, timezone, is_active, created_at FROM users WHERE id = ?';
        return await get(sql, [id]);
    }

    static async validatePassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }
}

module.exports = UserModel;
