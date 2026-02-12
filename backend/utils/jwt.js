const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate Access Token (short-lived, 15 min)
 */
const generateAccessToken = (user) => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role || 'user',
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '15m', issuer: 'financeiq' }
    );
};

/**
 * Generate Refresh Token (long-lived, opaque)
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

/**
 * Hash a refresh token for database storage
 */
const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify Access Token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
};

// Backward compatibility
const generateToken = generateAccessToken;

module.exports = {
    generateToken,
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyToken,
};
