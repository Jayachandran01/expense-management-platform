const bcrypt = require('bcrypt');

/**
 * Realistic demo data seeder
 * 3 Indian users, 300+ transactions, budgets, groups, insights
 */
exports.seed = async function (knex) {
    // Clear everything in order
    await knex('chat_messages').del();
    await knex('chat_sessions').del();
    await knex('audit_logs').del();
    await knex('ai_insights').del();
    await knex('forecast_results').del();
    await knex('csv_import_logs').del();
    await knex('ocr_receipts').del();
    await knex('voice_logs').del();
    await knex('group_transactions').del();
    await knex('group_members').del();
    await knex('groups').del();
    await knex('budgets').del();
    await knex('transactions').del();
    await knex('categories').del();
    await knex('users').del();

    const hash = await bcrypt.hash('Password123!', 10);

    // ======== USERS ========
    const [u1] = await knex('users').insert({
        email: 'rahul.sharma@demo.com', password_hash: hash, full_name: 'Rahul Sharma',
        phone: '+91-9876543210', currency: 'INR', role: 'admin', is_verified: true,
    }).returning('id');

    const [u2] = await knex('users').insert({
        email: 'priya.patel@demo.com', password_hash: hash, full_name: 'Priya Patel',
        phone: '+91-8765432109', currency: 'INR', role: 'user', is_verified: true,
    }).returning('id');

    const [u3] = await knex('users').insert({
        email: 'amit.kumar@demo.com', password_hash: hash, full_name: 'Amit Kumar',
        phone: '+91-7654321098', currency: 'INR', role: 'user', is_verified: true,
    }).returning('id');

    const userId1 = u1.id || u1;
    const userId2 = u2.id || u2;
    const userId3 = u3.id || u3;


    // ======== SYSTEM CATEGORIES ========
    const categoryDefs = [
        { name: 'Salary', type: 'income', icon: '💰', color: '#10b981' },
        { name: 'Freelance', type: 'income', icon: '💻', color: '#06b6d4' },
        { name: 'Investments', type: 'income', icon: '📈', color: '#8b5cf6' },
        { name: 'Food & Dining', type: 'expense', icon: '🍕', color: '#f43f5e' },
        { name: 'Groceries', type: 'expense', icon: '🛒', color: '#ef4444' },
        { name: 'Transport', type: 'expense', icon: '🚗', color: '#f59e0b' },
        { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#ec4899' },
        { name: 'Utilities', type: 'expense', icon: '💡', color: '#6366f1' },
        { name: 'Rent', type: 'expense', icon: '🏠', color: '#14b8a6' },
        { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#a855f7' },
        { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#22c55e' },
        { name: 'Education', type: 'expense', icon: '📚', color: '#3b82f6' },
        { name: 'Travel', type: 'expense', icon: '✈️', color: '#0ea5e9' },
        { name: 'Personal Care', type: 'expense', icon: '💇', color: '#d946ef' },
        { name: 'EMI / Loans', type: 'expense', icon: '🏦', color: '#64748b' },
        { name: 'Gifts & Donations', type: 'expense', icon: '🎁', color: '#f97316' },
    ];

    const catIds = {};
    for (const cat of categoryDefs) {
        const rows = await knex('categories').insert({ ...cat, is_system: true }).returning('id');
        catIds[cat.name] = rows[0].id || rows[0];
    }

    // Also insert user-specific copies
    for (const uid of [userId1, userId2, userId3]) {
        for (const cat of categoryDefs) {
            await knex('categories').insert({ ...cat, user_id: uid, is_system: false });
        }
    }

    // ======== TRANSACTION GENERATION ========
    const merchants = {
        'Food & Dining': ['Swiggy', 'Zomato', 'Dominos', 'McDonald\'s', 'Haldirams', 'Barbeque Nation', 'Chai Point', 'Starbucks'],
        'Groceries': ['BigBasket', 'Zepto', 'D-Mart', 'Reliance Fresh', 'More Supermarket', 'Nature\'s Basket'],
        'Transport': ['Uber', 'Ola', 'Rapido', 'Indian Railways', 'Metro Card', 'Petrol Pump', 'Shell Petrol'],
        'Shopping': ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Croma', 'Reliance Digital', 'Decathlon'],
        'Utilities': ['Jio Fiber', 'Airtel', 'BESCOM', 'BWSSB', 'Piped Gas', 'DTH Recharge'],
        'Entertainment': ['Netflix', 'Spotify', 'BookMyShow', 'Hotstar', 'Sony LIV', 'PVR Cinemas'],
        'Healthcare': ['Apollo Pharmacy', 'Practo', 'PharmEasy', '1mg', 'Dr. Consultation'],
        'Education': ['Udemy', 'Coursera', 'Books', 'Stationery', 'Unacademy'],
        'Travel': ['MakeMyTrip', 'OYO Rooms', 'IRCTC', 'Cleartrip', 'Yatra'],
        'Personal Care': ['Nykaa', 'Salon Visit', 'Gym Membership', 'Cult.fit'],
        'EMI / Loans': ['Home Loan EMI', 'Car Loan EMI', 'Education Loan EMI', 'Credit Card Bill'],
    };

    const amountRanges = {
        'Food & Dining': [100, 2500], 'Groceries': [200, 5000], 'Transport': [50, 3000],
        'Shopping': [500, 15000], 'Utilities': [300, 5000], 'Rent': [15000, 35000],
        'Entertainment': [150, 2000], 'Healthcare': [200, 8000], 'Education': [500, 10000],
        'Travel': [2000, 30000], 'Personal Care': [200, 3000], 'EMI / Loans': [5000, 25000],
        'Gifts & Donations': [500, 10000],
    };

    const salaries = { [userId1]: 120000, [userId2]: 85000, [userId3]: 65000 };
    const freelanceAmounts = { [userId1]: [15000, 50000], [userId2]: [10000, 30000], [userId3]: [5000, 20000] };

    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randomDate(year, month) {
        const day = rand(1, 28);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const allTransactions = [];

    for (const userId of [userId1, userId2, userId3]) {
        // 6 months of data
        for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
            const d = new Date();
            d.setMonth(d.getMonth() - monthOffset);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;

            // Monthly salary
            allTransactions.push({
                user_id: userId, category_id: catIds['Salary'], type: 'income',
                amount: salaries[userId], description: 'Monthly Salary',
                merchant: 'Employer', payment_method: 'bank_transfer',
                transaction_date: `${year}-${String(month).padStart(2, '0')}-01`, data_source: 'manual',
            });

            // Random freelance (60% chance)
            if (Math.random() > 0.4) {
                const [fmin, fmax] = freelanceAmounts[userId];
                allTransactions.push({
                    user_id: userId, category_id: catIds['Freelance'], type: 'income',
                    amount: rand(fmin, fmax), description: pick(['Freelance Project', 'Consulting Fee', 'Contract Work']),
                    merchant: pick(['Client A', 'Upwork', 'Fiverr', 'Direct Client']),
                    payment_method: 'bank_transfer',
                    transaction_date: randomDate(year, month), data_source: 'manual',
                });
            }

            // Investment return (30% chance)
            if (Math.random() > 0.7) {
                allTransactions.push({
                    user_id: userId, category_id: catIds['Investments'], type: 'income',
                    amount: rand(2000, 15000), description: pick(['Dividend', 'FD Interest', 'MF Returns', 'SIP Return']),
                    merchant: pick(['Zerodha', 'Groww', 'HDFC Bank']),
                    payment_method: 'bank_transfer',
                    transaction_date: randomDate(year, month), data_source: 'manual',
                });
            }

            // Rent (fixed monthly)
            allTransactions.push({
                user_id: userId, category_id: catIds['Rent'], type: 'expense',
                amount: userId === userId1 ? 25000 : userId === userId2 ? 18000 : 12000,
                description: 'Monthly Rent', merchant: 'Landlord',
                payment_method: 'bank_transfer',
                transaction_date: `${year}-${String(month).padStart(2, '0')}-05`, data_source: 'manual',
            });

            // EMI (fixed monthly)
            allTransactions.push({
                user_id: userId, category_id: catIds['EMI / Loans'], type: 'expense',
                amount: userId === userId1 ? 15000 : userId === userId2 ? 8000 : 5000,
                description: pick(['Home Loan EMI', 'Education Loan EMI', 'Credit Card Bill']),
                merchant: pick(['HDFC Bank', 'SBI', 'ICICI Bank']),
                payment_method: 'bank_transfer',
                transaction_date: `${year}-${String(month).padStart(2, '0')}-10`, data_source: 'manual',
            });

            // Expense categories
            const expenseCategories = ['Food & Dining', 'Groceries', 'Transport', 'Shopping',
                'Utilities', 'Entertainment', 'Healthcare', 'Personal Care'];

            for (const catName of expenseCategories) {
                const txnCount = catName === 'Food & Dining' ? rand(8, 15) :
                    catName === 'Groceries' ? rand(3, 6) :
                        catName === 'Transport' ? rand(5, 12) :
                            catName === 'Shopping' ? rand(1, 4) :
                                catName === 'Utilities' ? rand(1, 3) :
                                    catName === 'Entertainment' ? rand(2, 5) :
                                        catName === 'Healthcare' ? rand(0, 2) :
                                            rand(1, 3);

                const [minAmt, maxAmt] = amountRanges[catName];
                const catMerchants = merchants[catName] || [catName];

                for (let i = 0; i < txnCount; i++) {
                    const merchant = pick(catMerchants);
                    allTransactions.push({
                        user_id: userId, category_id: catIds[catName], type: 'expense',
                        amount: rand(minAmt, maxAmt), description: `${merchant} purchase`,
                        merchant, payment_method: pick(['upi', 'credit_card', 'debit_card', 'cash']),
                        transaction_date: randomDate(year, month), data_source: pick(['manual', 'manual', 'manual', 'csv']),
                    });
                }
            }

            // Occasional travel / gifts
            if (Math.random() > 0.7) {
                const catName = pick(['Travel', 'Gifts & Donations', 'Education']);
                const [minA, maxA] = amountRanges[catName];
                const merch = merchants[catName] || [catName];
                allTransactions.push({
                    user_id: userId, category_id: catIds[catName], type: 'expense',
                    amount: rand(minA, maxA), description: `${pick(merch)} booking`,
                    merchant: pick(merch), payment_method: 'credit_card',
                    transaction_date: randomDate(year, month), data_source: 'manual',
                });
            }
        }
    }

    // Batch insert all transactions
    const batchSize = 50;
    for (let i = 0; i < allTransactions.length; i += batchSize) {
        await knex('transactions').insert(allTransactions.slice(i, i + batchSize));
    }

    console.log(`✅ Seeded ${allTransactions.length} transactions across 3 users`);

    // ======== BUDGETS ========
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-28`;

    const budgetDefs = [
        { userId: userId1, cat: 'Food & Dining', amount: 15000 },
        { userId: userId1, cat: 'Shopping', amount: 10000 },
        { userId: userId1, cat: 'Transport', amount: 5000 },
        { userId: userId1, cat: 'Entertainment', amount: 3000 },
        { userId: userId1, cat: 'Groceries', amount: 8000 },
        { userId: userId2, cat: 'Food & Dining', amount: 10000 },
        { userId: userId2, cat: 'Shopping', amount: 8000 },
        { userId: userId2, cat: 'Transport', amount: 4000 },
        { userId: userId3, cat: 'Food & Dining', amount: 8000 },
        { userId: userId3, cat: 'Transport', amount: 3000 },
        { userId: userId3, cat: 'Groceries', amount: 5000 },
    ];

    for (const b of budgetDefs) {
        await knex('budgets').insert({
            user_id: b.userId, category_id: catIds[b.cat], name: `${b.cat} Budget`,
            amount: b.amount, budget_type: 'monthly',
            start_date: monthStart, end_date: monthEnd, alert_threshold: 80,
        });
    }

    // ======== GROUPS ========
    const [grp1] = await knex('groups').insert({
        name: 'Goa Trip 2026', description: 'Group expenses for Goa trip', created_by: userId1,
    }).returning('id');
    const groupId1 = grp1.id || grp1;

    const [grp2] = await knex('groups').insert({
        name: 'Office Lunch Club', description: 'Daily lunch splits', created_by: userId2,
    }).returning('id');
    const groupId2 = grp2.id || grp2;

    // Add members
    await knex('group_members').insert([
        { group_id: groupId1, user_id: userId1, role: 'admin' },
        { group_id: groupId1, user_id: userId2, role: 'member' },
        { group_id: groupId1, user_id: userId3, role: 'member' },
        { group_id: groupId2, user_id: userId1, role: 'member' },
        { group_id: groupId2, user_id: userId2, role: 'admin' },
    ]);

    // Group transactions
    await knex('group_transactions').insert([
        { group_id: groupId1, paid_by: userId1, amount: 12000, description: 'Hotel booking', split_type: 'equal' },
        { group_id: groupId1, paid_by: userId2, amount: 6000, description: 'Cab from airport', split_type: 'equal' },
        { group_id: groupId1, paid_by: userId3, amount: 8500, description: 'Restaurant dinner', split_type: 'equal' },
        { group_id: groupId2, paid_by: userId1, amount: 1200, description: 'Monday lunch', split_type: 'equal' },
        { group_id: groupId2, paid_by: userId2, amount: 950, description: 'Tuesday lunch', split_type: 'equal' },
    ]);

    // ======== AI INSIGHTS ========
    await knex('ai_insights').insert([
        { user_id: userId1, insight_type: 'spending_spike', title: 'Shopping spike detected', description: 'Your shopping expenses are 45% higher than your 3-month average. Consider reviewing recent purchases.', severity: 'warning', category_id: catIds['Shopping'], metric_value: 45, is_actionable: true },
        { user_id: userId1, insight_type: 'budget_projection', title: 'Food budget on track', description: 'At current pace, you\'ll use 78% of your Food & Dining budget this month.', severity: 'info', category_id: catIds['Food & Dining'], metric_value: 78 },
        { user_id: userId1, insight_type: 'recurring_detected', title: 'Recurring payment found', description: 'Netflix ₹649/month appears to be a recurring subscription. Mark it as recurring?', severity: 'info', metric_value: 649, is_actionable: true, action_type: 'convert_to_recurring' },
        { user_id: userId2, insight_type: 'savings_milestone', title: 'Great saving this month!', description: 'You\'ve saved 32% of your income this month — best in 3 months!', severity: 'info', metric_value: 32 },
        { user_id: userId2, insight_type: 'category_creep', title: 'Transport costs rising', description: 'Transport spending has increased 20% over each of the last 3 months.', severity: 'warning', category_id: catIds['Transport'], metric_value: 20, is_actionable: true },
        { user_id: userId3, insight_type: 'unusual_transaction', title: 'Unusually large transaction', description: 'A ₹12,500 Shopping transaction is 3x your average. Was this intentional?', severity: 'warning', category_id: catIds['Shopping'], metric_value: 12500, is_actionable: true },
    ]);

    // ======== FORECAST DATA ========
    const forecastMonths = [];
    for (let i = 1; i <= 3; i++) {
        const fd = new Date(); fd.setMonth(fd.getMonth() + i);
        forecastMonths.push({
            month: `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}`,
            predicted: rand(45000, 75000), lower: rand(35000, 45000), upper: rand(75000, 95000),
            confidence: +(0.65 + Math.random() * 0.25).toFixed(2),
        });
    }

    await knex('forecast_results').insert({
        user_id: userId1, forecast_type: 'spending',
        forecast_data: JSON.stringify({ forecast: forecastMonths }),
        model_used: 'prophet', data_points_used: 6,
        accuracy_metrics: JSON.stringify({ mape: 12.5, mae: 6200, rmse: 8100 }),
        forecast_horizon_months: 3,
        valid_until: new Date(Date.now() + 7 * 86400000),
    });

    // ======== VOICE LOGS ========
    await knex('voice_logs').insert([
        { user_id: userId1, raw_transcript: 'Spent 450 rupees on Swiggy today', parsed_intent: 'EXPENSE', parsed_entities: JSON.stringify({ amount: 450, merchant: 'Swiggy', category: 'Food & Dining' }), confidence_score: 0.92, processing_status: 'confirmed' },
        { user_id: userId1, raw_transcript: 'Paid 2000 for uber cab yesterday', parsed_intent: 'EXPENSE', parsed_entities: JSON.stringify({ amount: 2000, merchant: 'Uber', category: 'Transport' }), confidence_score: 0.88, processing_status: 'confirmed' },
        { user_id: userId2, raw_transcript: 'Received salary 85000', parsed_intent: 'INCOME', parsed_entities: JSON.stringify({ amount: 85000, category: 'Salary' }), confidence_score: 0.95, processing_status: 'confirmed' },
    ]);

    // ======== AUDIT LOGS ========
    await knex('audit_logs').insert([
        { user_id: userId1, action: 'LOGIN', entity_type: 'auth', ip_address: '127.0.0.1', request_method: 'POST', request_path: '/api/v1/auth/login' },
        { user_id: userId1, action: 'CREATE', entity_type: 'transaction', ip_address: '127.0.0.1', request_method: 'POST', request_path: '/api/v1/transactions' },
        { user_id: userId2, action: 'LOGIN', entity_type: 'auth', ip_address: '127.0.0.1', request_method: 'POST', request_path: '/api/v1/auth/login' },
    ]);

    console.log('✅ Seed complete: 3 users, categories, budgets, groups, insights, forecasts, voice logs, audit logs');
};
