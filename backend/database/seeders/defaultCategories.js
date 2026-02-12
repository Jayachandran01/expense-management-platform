const { db, run, get } = require('../init');
const logger = require('../../utils/logger');

const defaultCategories = [
    // Income
    { name: 'Salary', type: 'income', icon: 'wallet', color: '#2ecc71', is_system: 1 },
    { name: 'Freelance', type: 'income', icon: 'briefcase', color: '#3498db', is_system: 1 },
    { name: 'Investments', type: 'income', icon: 'trending-up', color: '#9b59b6', is_system: 1 },
    { name: 'Gifts', type: 'income', icon: 'gift', color: '#e67e22', is_system: 1 },
    { name: 'Other Income', type: 'income', icon: 'more-horizontal', color: '#95a5a6', is_system: 1 },

    // Expense
    { name: 'Food & Dining', type: 'expense', icon: 'coffee', color: '#e74c3c', is_system: 1 },
    { name: 'Transportation', type: 'expense', icon: 'truck', color: '#f1c40f', is_system: 1 },
    { name: 'Housing', type: 'expense', icon: 'home', color: '#34495e', is_system: 1 },
    { name: 'Utilities', type: 'expense', icon: 'zap', color: '#f39c12', is_system: 1 },
    { name: 'Entertainment', type: 'expense', icon: 'film', color: '#9b59b6', is_system: 1 },
    { name: 'Health', type: 'expense', icon: 'heart', color: '#27ae60', is_system: 1 },
    { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#1abc9c', is_system: 1 },
    { name: 'Education', type: 'expense', icon: 'book', color: '#2980b9', is_system: 1 },
    { name: 'Personal Care', type: 'expense', icon: 'smile', color: '#d35400', is_system: 1 },
    { name: 'Travel', type: 'expense', icon: 'map', color: '#16a085', is_system: 1 },
];

const seedCategories = async () => {
    try {
        logger.info('Starting category seeding...');

        for (const cat of defaultCategories) {
            const existing = await get('SELECT id FROM categories WHERE name = ? AND type = ?', [cat.name, cat.type]);

            if (!existing) {
                await run(
                    'INSERT INTO categories (name, type, icon, color, is_system) VALUES (?, ?, ?, ?, ?)',
                    [cat.name, cat.type, cat.icon, cat.color, cat.is_system]
                );
                logger.debug(`Inserted category: ${cat.name}`);
            } else {
                logger.debug(`Category already exists: ${cat.name}`);
            }
        }

        logger.info('✓ Category seeding completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding categories:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    // Wait for DB connection
    setTimeout(seedCategories, 1000);
}

module.exports = seedCategories;
