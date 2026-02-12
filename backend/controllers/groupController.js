const db = require('../database/connection');
const logger = require('../utils/logger');

exports.getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const groups = await db('groups as g')
            .join('group_members as gm', 'g.id', 'gm.group_id')
            .where('gm.user_id', userId)
            .where('g.is_active', true)
            .select('g.*', 'gm.role as member_role')
            .orderBy('g.created_at', 'desc');

        // Add member counts and totals
        for (const group of groups) {
            const [{ count }] = await db('group_members').where('group_id', group.id).count('id as count');
            group.member_count = parseInt(count);

            const [{ total }] = await db('group_transactions').where('group_id', group.id).sum('amount as total');
            group.total_expense = parseFloat(total) || 0;
        }

        res.json({ success: true, data: { groups } });
    } catch (err) {
        logger.error('Get groups error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch groups' } });
    }
};

exports.getById = async (req, res) => {
    try {
        const group = await db('groups').where('id', req.params.id).first();
        if (!group) return res.status(404).json({ success: false, error: { message: 'Group not found' } });

        const members = await db('group_members as gm')
            .join('users as u', 'gm.user_id', 'u.id')
            .where('gm.group_id', group.id)
            .select('u.id', 'u.full_name', 'u.email', 'gm.role', 'gm.joined_at');

        const transactions = await db('group_transactions as gt')
            .join('users as u', 'gt.paid_by', 'u.id')
            .where('gt.group_id', group.id)
            .select('gt.*', 'u.full_name as paid_by_name')
            .orderBy('gt.transaction_date', 'desc');

        // Calculate balances
        const totalPerPerson = {};
        const paidPerPerson = {};
        members.forEach(m => { totalPerPerson[m.id] = 0; paidPerPerson[m.id] = 0; });

        transactions.forEach(t => {
            paidPerPerson[t.paid_by] = (paidPerPerson[t.paid_by] || 0) + parseFloat(t.amount);
            const share = parseFloat(t.amount) / members.length; // equal split
            members.forEach(m => { totalPerPerson[m.id] += share; });
        });

        const balances = members.map(m => ({
            user_id: m.id, name: m.full_name,
            paid: paidPerPerson[m.id] || 0,
            owe: totalPerPerson[m.id] || 0,
            balance: (paidPerPerson[m.id] || 0) - (totalPerPerson[m.id] || 0),
        }));

        res.json({ success: true, data: { group, members, transactions, balances } });
    } catch (err) {
        logger.error('Get group error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch group' } });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, error: { message: 'Group name is required' } });

        const [group] = await db('groups').insert({
            name, description, created_by: req.user.id,
        }).returning('*');

        // Add creator as admin
        await db('group_members').insert({ group_id: group.id, user_id: req.user.id, role: 'admin' });

        res.status(201).json({ success: true, data: { group } });
    } catch (err) {
        logger.error('Create group error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to create group' } });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { amount, description, split_type = 'equal', transaction_date } = req.body;
        if (!amount || !description) {
            return res.status(400).json({ success: false, error: { message: 'Amount and description are required' } });
        }

        const [txn] = await db('group_transactions').insert({
            group_id: req.params.id, paid_by: req.user.id,
            amount: parseFloat(amount), description, split_type,
            transaction_date: transaction_date || new Date(),
        }).returning('*');

        res.status(201).json({ success: true, data: { transaction: txn } });
    } catch (err) {
        logger.error('Add group transaction error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to add group transaction' } });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: { message: 'Email is required' } });

        const user = await db('users').where({ email: email.toLowerCase() }).first();
        if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

        const existing = await db('group_members').where({ group_id: req.params.id, user_id: user.id }).first();
        if (existing) return res.status(409).json({ success: false, error: { message: 'User is already a member' } });

        await db('group_members').insert({ group_id: req.params.id, user_id: user.id, role: 'member' });

        res.json({ success: true, message: 'Member added' });
    } catch (err) {
        logger.error('Add member error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to add member' } });
    }
};
