require('dotenv').config();

module.exports = {
    development: {
        client: 'sqlite3',
        connection: {
            filename: './database/expense_tracker.db',
        },
        useNullAsDefault: true,
        migrations: {
            directory: './database/migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './database/seeds',
        },
        pool: {
            afterCreate: (conn, cb) => {
                conn.run('PRAGMA foreign_keys = ON', cb);
            },
        },
    },
    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: { min: 2, max: 20 },
        migrations: {
            directory: './database/migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './database/seeds',
        },
    },
};
