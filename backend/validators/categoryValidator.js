const Joi = require('joi');

/**
 * Category validation schemas
 */

const createCategorySchema = Joi.object({
    name: Joi.string().min(1).max(50).required()
        .messages({
            'string.base': 'Category name must be a string',
            'string.min': 'Category name cannot be empty',
            'string.max': 'Category name cannot exceed 50 characters',
            'any.required': 'Category name is required'
        }),

    type: Joi.string().valid('income', 'expense').required()
        .messages({
            'string.base': 'Type must be a string',
            'any.only': 'Type must be either income or expense',
            'any.required': 'Type is required'
        }),

    icon: Joi.string().max(50).optional().default('default')
        .messages({
            'string.base': 'Icon must be a string',
            'string.max': 'Icon name cannot exceed 50 characters'
        }),

    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#6366f1')
        .messages({
            'string.base': 'Color must be a string',
            'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF5733)'
        })
});

const updateCategorySchema = Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    type: Joi.string().valid('income', 'expense').optional(),
    icon: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
}).min(1);

const categoryQuerySchema = Joi.object({
    type: Joi.string().valid('income', 'expense').optional()
});

/**
 * Validation middleware
 */
const validateCreateCategory = (req, res, next) => {
    const { error } = createCategorySchema.validate(req.body, { abortEarly: false });

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

const validateUpdateCategory = (req, res, next) => {
    const { error } = updateCategorySchema.validate(req.body, { abortEarly: false });

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

const validateCategoryQuery = (req, res, next) => {
    const { error } = categoryQuerySchema.validate(req.query, { abortEarly: false });

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
    validateCreateCategory,
    validateUpdateCategory,
    validateCategoryQuery
};
