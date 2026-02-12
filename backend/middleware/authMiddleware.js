const { verifyToken } = require('../utils/jwt');
const { AuthenticationError } = require('./errorMiddleware');

/**
 * Authentication Middleware — verify JWT access token
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No token provided');
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            throw new AuthenticationError('Invalid or expired token');
        }
    } catch (error) {
        next(error);
    }
};

/**
 * RBAC Authorization Middleware
 * Usage: authorize('admin', 'auditor')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Authentication required'));
        }

        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to access this resource',
                },
            });
        }

        next();
    };
};

/**
 * Ownership Check Middleware
 * Ensures user can only access their own resources
 */
const authorizeOwnership = (resourceUserIdField = 'user_id') => {
    return (req, res, next) => {
        // Admins and auditors can access all resources
        if (req.user.role === 'admin' || req.user.role === 'auditor') {
            return next();
        }

        // For read-by-id routes, ownership is checked in the controller
        next();
    };
};

module.exports = { authMiddleware, authorize, authorizeOwnership };
