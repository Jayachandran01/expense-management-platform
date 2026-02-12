const Joi = require('joi');

/**
 * Budget validation schemas
 */

const createBudgetSchema = Joi.object({
    category_id: Joi.number().integer().positive().optional().allow(null)
        .messages({
            'number.base': 'Category ID must be a number',
            'number.positive': 'Category ID must be positive'
        }),

    budget_type: Joi.string().valid('monthly', 'yearly').required()
        .messages({
            'string.base': 'Budget type must be a string',
            'any.only': 'Budget type must be either monthly or yearly',
            'any.required': 'Budget type is required'
        }),

    amount: Joi.number().positive().precision(2).required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be positive',
            'any.required': 'Amount is required'
        }),

    start_date: Joi.date().iso().required()
        .messages({
            'date.base': 'Start date must be a valid date',
            'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
            'any.required': 'Start date is required'
        }),

    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
        .messages({
            'date.base': 'End date must be a valid date',
            'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
            'date.greater': 'End date must be after start date',
            'any.required': 'End date is required'
        }),

    alert_threshold: Joi.number().integer().min(1).max(100).optional().default(80)
        .messages({
            'number.base': 'Alert threshold must be a number',
            'number.min': 'Alert threshold must be at least 1',
            'number.max': 'Alert threshold cannot exceed 100'
        }),

    is_active: Joi.boolean().optional().default(true)
});

const updateBudgetSchema = Joi.object({
    category_id: Joi.number().integer().positive().optional().allow(null),
    budget_type: Joi.string().valid('monthly', 'yearly').optional(),
    amount: Joi.number().positive().precision(2).optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    alert_threshold: Joi.number().integer().min(1).max(100).optional(),
    is_active: Joi.boolean().optional()
}).min(1);

const budgetQuerySchema = Joi.object({
    is_active: Joi.boolean().optional(),
    budget_type: Joi.string().valid('monthly', 'yearly').optional(),
    category_id: Joi.number().integer().positive().optional()
});

const bulkCreateBudgetsSchema = Joi.object({
    budgets: Joi.array().items(createBudgetSchema).min(1).required()
        .messages({
            'array.base': 'Budgets must be an array',
            'array.min': 'At least one budget is required',
            'any.required': 'Budgets array is required'
        })
});

/**
 * Validation middleware
 */
const validateCreateBudget = (req, res, next) => {
    const { error } = createBudgetSchema.validate(req.body, { abortEarly: false });

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

const validateUpdateBudget = (req, res, next) => {
    const { error } = updateBudgetSchema.validate(req.body, { abortEarly: false });

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

const validateBudgetQuery = (req, res, next) => {
    const { error } = budgetQuerySchema.validate(req.query, { abortEarly: false });

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

const validateBulkCreateBudgets = (req, res, next) => {
    const { error } = bulkCreateBudgetsSchema.validate(req.body, { abortEarly: false });

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
    validateCreateBudget,
    validateUpdateBudget,
    validateBudgetQuery,
    validateBulkCreateBudgets
};
