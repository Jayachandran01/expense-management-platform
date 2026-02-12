const Joi = require('joi');

/**
 * Transaction validation schemas
 */

const createTransactionSchema = Joi.object({
    category_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Category ID must be a number',
            'number.positive': 'Category ID must be positive',
            'any.required': 'Category ID is required'
        }),

    type: Joi.string().valid('income', 'expense').required()
        .messages({
            'string.base': 'Type must be a string',
            'any.only': 'Type must be either income or expense',
            'any.required': 'Type is required'
        }),

    amount: Joi.number().positive().precision(2).required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be positive',
            'any.required': 'Amount is required'
        }),

    description: Joi.string().max(500).required()
        .messages({
            'string.base': 'Description must be a string',
            'string.max': 'Description cannot exceed 500 characters',
            'any.required': 'Description is required'
        }),

    merchant: Joi.string().max(100).optional().allow('', null),

    payment_method: Joi.string().max(50).optional().allow('', null)
        .valid('cash', 'credit_card', 'debit_card', 'upi', 'netbanking', 'wallet', 'other', '', null),

    transaction_date: Joi.date().iso().max('now').required()
        .messages({
            'date.base': 'Transaction date must be a valid date',
            'date.format': 'Transaction date must be in ISO format (YYYY-MM-DD)',
            'date.max': 'Transaction date cannot be in the future',
            'any.required': 'Transaction date is required'
        }),

    is_recurring: Joi.boolean().optional().default(false),

    tags: Joi.array().items(Joi.string().max(50)).optional()
});

const updateTransactionSchema = Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    type: Joi.string().valid('income', 'expense').optional(),
    amount: Joi.number().positive().precision(2).optional(),
    description: Joi.string().max(500).optional(),
    merchant: Joi.string().max(100).optional().allow('', null),
    payment_method: Joi.string().max(50).optional().allow('', null)
        .valid('cash', 'credit_card', 'debit_card', 'upi', 'netbanking', 'wallet', 'other', '', null),
    transaction_date: Joi.date().iso().max('now').optional(),
    is_recurring: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional()
}).min(1);

const transactionQuerySchema = Joi.object({
    type: Joi.string().valid('income', 'expense').optional(),
    category_id: Joi.number().integer().positive().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    min_amount: Joi.number().positive().optional(),
    max_amount: Joi.number().positive().min(Joi.ref('min_amount')).optional(),
    search: Joi.string().max(200).optional(),
    sort_by: Joi.string().valid('transaction_date', 'amount', 'created_at').optional(),
    sort_order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
});

/**
 * Validation middleware
 */
const validateCreateTransaction = (req, res, next) => {
    const { error } = createTransactionSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            }
        });
    }

    next();
};

const validateUpdateTransaction = (req, res, next) => {
    const { error } = updateTransactionSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            }
        });
    }

    next();
};

const validateTransactionQuery = (req, res, next) => {
    const { error } = transactionQuerySchema.validate(req.query, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            }
        });
    }

    next();
};

module.exports = {
    validateCreateTransaction,
    validateUpdateTransaction,
    validateTransactionQuery
};
