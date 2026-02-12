const logger = require('../utils/logger');

// Custom Error Classes
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400);
        this.code = 'VALIDATION_ERROR';
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.code = 'AUTHENTICATION_ERROR';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
        this.code = 'UNAUTHORIZED';
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
        this.code = 'FORBIDDEN';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.code = 'NOT_FOUND';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
        this.code = 'CONFLICT';
    }
}

class BusinessLogicError extends AppError {
    constructor(message) {
        super(message, 422);
        this.code = 'BUSINESS_LOGIC_ERROR';
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
        this.code = 'INTERNAL_SERVER_ERROR';
    }
}

// Error Handler Middleware
const errorMiddleware = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    // Log error
    logger.error({
        message: error.message,
        statusCode: error.statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error = new NotFoundError('Resource not found');
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        error = new ConflictError('Duplicate field value entered');
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        error = new ValidationError('Validation failed', details);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new UnauthorizedError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new UnauthorizedError('Token expired');
    }

    // Send error response
    res.status(error.statusCode).json({
        success: false,
        error: {
            code: error.code || 'ERROR',
            message: error.message,
            ...(error.details && { details: error.details }),
        },
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown',
    });
};

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    BusinessLogicError,
    InternalServerError,
    errorMiddleware,
};
