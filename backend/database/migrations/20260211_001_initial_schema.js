/**
 * Enterprise PostgreSQL Migration
 * All 15 tables with indexes, constraints, triggers
 */
exports.up = function (knex) {
    const isSqlite = knex.client.config.client === 'sqlite3';

    // SQLite UUID generation strategy
    const uuidDefault = isSqlite
        ? knex.raw('(lower(hex(randomblob(4))) || "-" || lower(hex(randomblob(2))) || "-" || "4" || substr(lower(hex(randomblob(2))),2) || "-" || substr("89ab",abs(random() % 4) + 1, 1) || substr(lower(hex(randomblob(2))),2) || "-" || lower(hex(randomblob(6))))')
        : knex.raw('uuid_generate_v4()');

    const chain = isSqlite
        ? Promise.resolve()
        : knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').then(() => knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'));

    return chain
        // 1. Users
        .then(() => knex.schema.createTable('users', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.string('email', 255).unique().notNullable();
            t.string('password_hash', 255).notNullable();
            t.string('full_name', 100).notNullable();
            t.string('phone', 20);
            t.text('avatar_url');
            t.string('currency', 3).defaultTo('INR');
            t.string('timezone', 50).defaultTo('Asia/Kolkata');
            t.string('role', 20).defaultTo('user');
            t.boolean('is_active').defaultTo(true);
            t.boolean('is_verified').defaultTo(false);
            t.string('refresh_token_hash', 255);
            t.integer('failed_login_attempts').defaultTo(0);
            t.timestamp('locked_until');
            t.timestamp('last_login_at');
            t.string('last_login_ip', 45);
            t.timestamps(true, true);
            t.timestamp('deleted_at');
        }))
        // 2. Categories
        .then(() => knex.schema.createTable('categories', t => {
            t.increments('id');
            t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
            t.string('name', 100).notNullable();
            t.string('type', 10).notNullable();
            t.string('icon', 10).defaultTo('📦');
            t.string('color', 7).defaultTo('#6366f1');
            t.boolean('is_system').defaultTo(false);
            t.timestamp('created_at').defaultTo(knex.fn.now());
        }))
        // 3. Transactions
        .then(() => knex.schema.createTable('transactions', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
            t.string('type', 10).notNullable();
            t.decimal('amount', 12, 2).notNullable();
            t.text('description');
            t.string('merchant', 200);
            t.string('payment_method', 30).defaultTo('cash');
            t.date('transaction_date').notNullable().defaultTo(knex.fn.now());
            // SQLite doesn't support arrays, use JSON
            if (isSqlite) {
                t.json('tags');
            } else {
                t.specificType('tags', 'TEXT[]');
            }
            t.text('notes');
            t.boolean('is_recurring').defaultTo(false);
            t.string('recurring_frequency', 20);
            t.string('data_source', 20).defaultTo('manual');
            t.string('source_reference_id', 100);
            t.boolean('ai_categorized').defaultTo(false);
            t.decimal('ai_confidence', 4, 3);
            t.integer('original_category_id');
            t.timestamps(true, true);
            t.timestamp('deleted_at');
            t.index(['user_id', 'transaction_date']);
            t.index('category_id');
        }))
        // 4. Budgets
        .then(() => knex.schema.createTable('budgets', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
            t.string('name', 100).notNullable();
            t.string('budget_type', 20).defaultTo('monthly');
            t.decimal('amount', 12, 2).notNullable();
            t.date('start_date').notNullable();
            t.date('end_date').notNullable();
            t.integer('alert_threshold').defaultTo(80);
            t.boolean('rollover_enabled').defaultTo(false);
            t.decimal('rollover_amount', 12, 2).defaultTo(0);
            t.boolean('is_active').defaultTo(true);
            t.text('notes');
            t.timestamps(true, true);
            t.timestamp('deleted_at');
            t.index('user_id');
        }))
        // 5. Groups
        .then(() => knex.schema.createTable('groups', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.string('name', 100).notNullable();
            t.text('description');
            t.uuid('created_by').notNullable().references('id').inTable('users');
            t.boolean('is_active').defaultTo(true);
            t.timestamps(true, true);
        }))
        // 6. Group Members
        .then(() => knex.schema.createTable('group_members', t => {
            t.increments('id');
            t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('role', 20).defaultTo('member');
            t.timestamp('joined_at').defaultTo(knex.fn.now());
            t.unique(['group_id', 'user_id']);
        }))
        // 7. Group Transactions
        .then(() => knex.schema.createTable('group_transactions', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
            t.uuid('paid_by').notNullable().references('id').inTable('users');
            t.decimal('amount', 12, 2).notNullable();
            t.text('description').notNullable();
            t.date('transaction_date').notNullable().defaultTo(knex.fn.now());
            t.string('split_type', 20).defaultTo('equal');
            t.json('split_details'); // Changed jsonb to json for compatibility
            t.boolean('is_settled').defaultTo(false);
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('group_id');
        }))
        // 8. Voice Logs
        .then(() => knex.schema.createTable('voice_logs', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.text('raw_transcript').notNullable();
            t.string('parsed_intent', 20);
            t.json('parsed_entities');
            t.decimal('confidence_score', 4, 3);
            t.uuid('resulting_txn_id').references('id').inTable('transactions');
            t.string('processing_status', 20).defaultTo('pending');
            t.text('error_message');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('user_id');
        }))
        // 9. OCR Receipts
        .then(() => knex.schema.createTable('ocr_receipts', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('original_filename', 255);
            t.text('stored_path').notNullable();
            t.integer('file_size_bytes');
            t.string('mime_type', 50);
            t.text('raw_ocr_text');
            t.decimal('extracted_amount', 12, 2);
            t.date('extracted_date');
            t.string('extracted_merchant', 200);
            t.json('extracted_items');
            t.decimal('ocr_confidence', 4, 3);
            t.uuid('resulting_txn_id').references('id').inTable('transactions');
            t.string('processing_status', 20).defaultTo('pending');
            t.integer('processing_time_ms');
            t.text('error_message');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('user_id');
        }))
        // 10. CSV Import Logs
        .then(() => knex.schema.createTable('csv_import_logs', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('original_filename', 255);
            t.text('stored_path');
            t.integer('file_size_bytes');
            t.integer('total_rows').defaultTo(0);
            t.integer('imported_rows').defaultTo(0);
            t.integer('skipped_rows').defaultTo(0);
            t.integer('failed_rows').defaultTo(0);
            t.integer('duplicate_rows').defaultTo(0);
            t.json('column_mapping');
            t.json('row_errors');
            t.string('processing_status', 20).defaultTo('pending');
            t.text('error_message');
            t.timestamp('started_at');
            t.timestamp('completed_at');
            t.timestamp('created_at').defaultTo(knex.fn.now());
        }))
        // 11. Forecast Results
        .then(() => knex.schema.createTable('forecast_results', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('forecast_type', 30).defaultTo('spending');
            t.json('forecast_data').notNullable();
            t.string('model_used', 30).defaultTo('prophet');
            t.integer('data_points_used');
            t.json('accuracy_metrics');
            t.integer('forecast_horizon_months').defaultTo(3);
            t.timestamp('valid_until');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('user_id');
        }))
        // 12. AI Insights
        .then(() => knex.schema.createTable('ai_insights', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('insight_type', 30).notNullable();
            t.string('title', 200).notNullable();
            t.text('description');
            t.string('severity', 10).defaultTo('info');
            t.integer('category_id').references('id').inTable('categories');
            t.decimal('metric_value', 12, 2);
            t.json('metric_context');
            t.string('action_type', 50);
            t.boolean('is_actionable').defaultTo(false);
            t.boolean('is_read').defaultTo(false);
            t.boolean('is_dismissed').defaultTo(false);
            t.timestamp('read_at');
            t.timestamp('dismissed_at');
            t.timestamp('generated_at').defaultTo(knex.fn.now());
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('user_id');
        }))
        // 13. Audit Logs
        .then(() => knex.schema.createTable('audit_logs', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').references('id').inTable('users');
            t.string('action', 30).notNullable();
            t.string('entity_type', 30);
            t.string('entity_id', 100);
            t.json('old_values');
            t.json('new_values');
            if (isSqlite) {
                t.json('changed_fields');
            } else {
                t.specificType('changed_fields', 'TEXT[]');
            }
            t.string('ip_address', 45);
            t.text('user_agent');
            t.string('request_method', 10);
            t.text('request_path');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('user_id');
            t.index(['entity_type', 'entity_id']);
        }))
        // 14. Chat Sessions
        .then(() => knex.schema.createTable('chat_sessions', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.string('title', 200).defaultTo('New Chat');
            t.boolean('is_active').defaultTo(true);
            t.timestamps(true, true);
        }))
        // 15. Chat Messages
        .then(() => knex.schema.createTable('chat_messages', t => {
            t.uuid('id').primary().defaultTo(uuidDefault);
            t.uuid('session_id').notNullable().references('id').inTable('chat_sessions').onDelete('CASCADE');
            t.string('role', 10).notNullable();
            t.text('content').notNullable();
            t.string('intent', 50);
            t.json('metadata');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index('session_id');
        }))
        // Triggers (Only for Postgres)
        .then(() => {
            if (!isSqlite) {
                return knex.raw(`
                  CREATE OR REPLACE FUNCTION update_updated_at()
                  RETURNS TRIGGER AS $$
                  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
                  $$ LANGUAGE plpgsql;
                `)
                    .then(() => knex.raw(`CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at()`))
                    .then(() => knex.raw(`CREATE TRIGGER trg_txn_upd BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at()`))
                    .then(() => knex.raw(`CREATE TRIGGER trg_budget_upd BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at()`))
                    .then(() => knex.raw(`CREATE TRIGGER trg_groups_upd BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at()`));
            }
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('chat_messages')
        .dropTableIfExists('chat_sessions')
        .dropTableIfExists('audit_logs')
        .dropTableIfExists('ai_insights')
        .dropTableIfExists('forecast_results')
        .dropTableIfExists('csv_import_logs')
        .dropTableIfExists('ocr_receipts')
        .dropTableIfExists('voice_logs')
        .dropTableIfExists('group_transactions')
        .dropTableIfExists('group_members')
        .dropTableIfExists('groups')
        .dropTableIfExists('budgets')
        .dropTableIfExists('transactions')
        .dropTableIfExists('categories')
        .dropTableIfExists('users');
};
