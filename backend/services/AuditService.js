/**
 * Audit Logging Service
 * Immutable activity journal for enterprise compliance
 */
const db = require('../database/connection');
const logger = require('../utils/logger');

class AuditService {
    /**
     * Log an action to the audit trail
     */
    static async log({ userId, action, entityType, entityId, oldValues, newValues, changedFields, req }) {
        try {
            await db('audit_logs').insert({
                user_id: userId || null,
                action,
                entity_type: entityType,
                entity_id: entityId || null,
                old_values: oldValues ? JSON.stringify(oldValues) : null,
                new_values: newValues ? JSON.stringify(newValues) : null,
                changed_fields: changedFields || null,
                ip_address: req?.ip || req?.connection?.remoteAddress || null,
                user_agent: req?.headers?.['user-agent']?.substring(0, 500) || null,
                request_method: req?.method || null,
                request_path: req?.originalUrl?.substring(0, 500) || null,
            });
        } catch (err) {
            logger.error('Audit log failed (non-fatal):', err.message);
        }
    }

    /**
     * Get audit logs with filtering
     */
    static async getLogs(filters = {}) {
        let query = db('audit_logs').orderBy('created_at', 'desc');

        if (filters.userId) query = query.where('user_id', filters.userId);
        if (filters.action) query = query.where('action', filters.action);
        if (filters.entityType) query = query.where('entity_type', filters.entityType);
        if (filters.entityId) query = query.where('entity_id', filters.entityId);
        if (filters.startDate) query = query.where('created_at', '>=', filters.startDate);
        if (filters.endDate) query = query.where('created_at', '<=', filters.endDate);

        const limit = Math.min(filters.limit || 50, 200);
        const offset = filters.offset || 0;
        query = query.limit(limit).offset(offset);

        return query;
    }

    /**
     * Get audit log count
     */
    static async getCount(filters = {}) {
        let query = db('audit_logs');
        if (filters.userId) query = query.where('user_id', filters.userId);
        if (filters.entityType) query = query.where('entity_type', filters.entityType);
        const result = await query.count('id as count').first();
        return parseInt(result.count);
    }
}

module.exports = AuditService;
