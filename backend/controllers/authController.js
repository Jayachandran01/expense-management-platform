const bcrypt = require('bcrypt');
const db = require('../database/connection');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * POST /api/v1/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ success: false, error: { message: 'Email, password, and full name are required' } });
        }

        // Check existing
        const existing = await db('users').where({ email: email.toLowerCase() }).whereNull('deleted_at').first();
        if (existing) {
            return res.status(409).json({ success: false, error: { message: 'Email already registered' } });
        }

        const password_hash = await bcrypt.hash(password, 12);
        const [user] = await db('users').insert({
            email: email.toLowerCase(),
            password_hash,
            full_name,
            phone,
        }).returning(['id', 'email', 'full_name', 'role', 'created_at']);

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        // Audit
        await db('audit_logs').insert({
            user_id: user.id, action: 'REGISTER', entity_type: 'user',
            ip_address: req.ip, request_method: 'POST', request_path: req.originalUrl,
        }).catch(() => { });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
            },
        });
    } catch (err) {
        logger.error('Register error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Registration failed' } });
    }
};

/**
 * POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: { message: 'Email and password are required' } });
        }

        const user = await db('users').where({ email: email.toLowerCase() }).whereNull('deleted_at').first();
        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        // Check lockout
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(423).json({
                success: false,
                error: { message: `Account locked. Try again in ${remaining} minutes.` },
            });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            // Increment failed attempts
            let updates = { failed_login_attempts: (user.failed_login_attempts || 0) + 1 };
            if (updates.failed_login_attempts >= 10) {
                updates.locked_until = new Date(Date.now() + 30 * 60000);
            } else if (updates.failed_login_attempts >= 5) {
                updates.locked_until = new Date(Date.now() + 5 * 60000);
            }
            await db('users').where({ id: user.id }).update(updates);
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        // Reset lockout on success
        await db('users').where({ id: user.id }).update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date(),
            last_login_ip: req.ip,
        });

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        // Audit
        await db('audit_logs').insert({
            user_id: user.id, action: 'LOGIN', entity_type: 'auth',
            ip_address: req.ip, request_method: 'POST', request_path: req.originalUrl,
        }).catch(() => { });

        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, currency: user.currency },
            },
        });
    } catch (err) {
        logger.error('Login error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Login failed' } });
    }
};

/**
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        await db('users').where({ id: req.user.id }).update({ refresh_token_hash: null });
        await db('audit_logs').insert({
            user_id: req.user.id, action: 'LOGOUT', entity_type: 'auth',
            ip_address: req.ip, request_method: 'POST', request_path: req.originalUrl,
        }).catch(() => { });
        res.json({ success: true, message: 'Logged out' });
    } catch (err) {
        res.json({ success: true, message: 'Logged out' });
    }
};

/**
 * GET /api/v1/auth/me
 */
exports.getMe = async (req, res) => {
    try {
        const user = await db('users')
            .where({ id: req.user.id })
            .whereNull('deleted_at')
            .select('id', 'email', 'full_name', 'phone', 'currency', 'timezone', 'role', 'avatar_url', 'created_at', 'last_login_at')
            .first();

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        res.json({ success: true, data: { user } });
    } catch (err) {
        logger.error('GetMe error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch profile' } });
    }
};

/**
 * POST /api/v1/auth/refresh
 */
exports.refresh = async (req, res) => {
    try {
        // For now just re-issue based on current token
        if (!req.user && !req.headers.authorization) {
            return res.status(401).json({ success: false, error: { message: 'No token provided' } });
        }
        const token = generateToken({ id: req.user.id, email: req.user.email, role: req.user.role });
        res.json({ success: true, data: { token } });
    } catch (err) {
        res.status(401).json({ success: false, error: { message: 'Token refresh failed' } });
    }
};
