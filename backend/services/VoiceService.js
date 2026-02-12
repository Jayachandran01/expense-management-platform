/**
 * Voice Processing Service
 * Handles speech-to-text transcript parsing, intent detection, and entity extraction
 * Uses rule-based NLP — no paid APIs
 */
const db = require('../database/connection');
const AuditService = require('./AuditService');
const logger = require('../utils/logger');

class VoiceService {
    // ==================== KEYWORD DICTIONARIES ====================
    static INTENT_PATTERNS = {
        EXPENSE: ['spent', 'paid', 'bought', 'purchased', 'cost', 'charged', 'expense', 'payment', 'bill'],
        INCOME: ['received', 'earned', 'got paid', 'salary', 'income', 'credited', 'deposited', 'refund', 'cashback'],
        TRANSFER: ['transferred', 'sent money', 'paid back', 'settled', 'repaid'],
    };

    static CATEGORY_KEYWORDS = {
        'Food & Dining': ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'biryani', 'swiggy', 'zomato', 'dominos', 'mcdonalds', 'starbucks', 'groceries', 'grocery', 'vegetables', 'fruits', 'supermarket', 'bigbazaar', 'dmart', 'kitchen', 'meal', 'snack', 'tea', 'hotel', 'canteen'],
        'Transportation': ['uber', 'ola', 'rapido', 'cab', 'taxi', 'auto', 'rickshaw', 'bus', 'train', 'metro', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'flight', 'travel', 'commute'],
        'Shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'shoes', 'electronics', 'gadget', 'phone', 'laptop', 'mall', 'market', 'store', 'purchase', 'ajio', 'nykaa'],
        'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'gaming', 'concert', 'show', 'party', 'fun', 'outing', 'trip', 'vacation', 'pvr'],
        'Utilities': ['electricity', 'water', 'gas', 'internet', 'broadband', 'wifi', 'phone bill', 'mobile', 'recharge', 'airtel', 'jio', 'dth', 'bill payment'],
        'Housing': ['rent', 'housing', 'home', 'apartment', 'flat', 'maintenance', 'society', 'repair'],
        'Health & Fitness': ['gym', 'medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'health', 'fitness', 'yoga', 'workout', 'clinic'],
        'Education': ['course', 'book', 'tuition', 'class', 'udemy', 'coursera', 'school', 'college', 'study', 'tutorial', 'training'],
        'Personal Care': ['salon', 'haircut', 'beauty', 'grooming', 'spa', 'cosmetic', 'skincare'],
        'Insurance': ['insurance', 'premium', 'lic', 'policy'],
        'Investments': ['investment', 'sip', 'mutual fund', 'stock', 'trading', 'fd', 'deposit'],
        'Subscriptions': ['subscription', 'membership', 'plan', 'premium', 'annual', 'monthly plan'],
        'Gifts & Donations': ['gift', 'donation', 'charity', 'present', 'wedding', 'birthday'],
        'Salary': ['salary', 'paycheck', 'wage', 'compensation', 'pay'],
        'Freelance': ['freelance', 'project', 'client payment', 'gig', 'consulting'],
    };

    /**
     * Process a voice transcript and extract structured transaction data
     */
    static async processTranscript(userId, transcript) {
        const startTime = Date.now();
        const lowerTranscript = transcript.toLowerCase().trim();

        try {
            // Step 1: Detect intent
            const intent = this.detectIntent(lowerTranscript);

            // Step 2: Extract entities
            const entities = this.extractEntities(lowerTranscript);

            // Step 3: Match category
            const categoryMatch = await this.matchCategory(userId, lowerTranscript);

            // Step 4: Calculate confidence
            const confidence = this.calculateConfidence(intent, entities, categoryMatch);

            // Step 5: Save voice log
            const voiceLog = await db('voice_logs').insert({
                user_id: userId,
                raw_transcript: transcript,
                parsed_intent: intent,
                parsed_entities: JSON.stringify({ ...entities, category: categoryMatch }),
                confidence_score: confidence,
                processing_status: confidence >= 0.5 ? 'parsed' : 'failed',
                processing_time_ms: Date.now() - startTime,
            }).returning('*');

            // Step 6: If high confidence, auto-create transaction
            let transaction = null;
            if (confidence >= 0.8 && entities.amount && intent !== 'UNKNOWN') {
                transaction = await this.createTransactionFromVoice(userId, {
                    intent,
                    entities,
                    categoryMatch,
                    voiceLogId: voiceLog[0].id,
                });

                // Update voice log
                await db('voice_logs').where('id', voiceLog[0].id).update({
                    processing_status: 'confirmed',
                    resulting_txn_id: transaction.id,
                });
            }

            return {
                voice_log_id: voiceLog[0].id,
                intent,
                entities: { ...entities, category: categoryMatch },
                confidence,
                confirmation_required: confidence < 0.8,
                transaction,
            };
        } catch (err) {
            logger.error('Voice processing error:', err);

            await db('voice_logs').insert({
                user_id: userId,
                raw_transcript: transcript,
                processing_status: 'failed',
                error_message: err.message,
                processing_time_ms: Date.now() - startTime,
            });

            throw err;
        }
    }

    /**
     * Intent detection using keyword matching
     */
    static detectIntent(text) {
        for (const [intent, keywords] of Object.entries(this.INTENT_PATTERNS)) {
            if (keywords.some((kw) => text.includes(kw))) {
                return intent;
            }
        }
        return 'UNKNOWN';
    }

    /**
     * Entity extraction using regex patterns
     */
    static extractEntities(text) {
        const entities = {};

        // Amount extraction
        const amountPatterns = [
            /(?:₹|rs\.?|inr|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i,
            /(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees?)/i,
            /(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:bucks|dollars)/i,
            /(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s|$)/,
        ];

        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                entities.amount = parseFloat(match[1].replace(/,/g, ''));
                if (entities.amount > 0 && entities.amount < 10000000) break;
                else entities.amount = null;
            }
        }

        // Date extraction
        const today = new Date();
        const dateKeywords = {
            'today': 0, 'yesterday': -1, 'day before yesterday': -2,
            'day before': -2, 'last week': -7, 'two days ago': -2,
            'three days ago': -3, '2 days ago': -2, '3 days ago': -3,
        };

        for (const [keyword, offset] of Object.entries(dateKeywords)) {
            if (text.includes(keyword)) {
                const d = new Date(today);
                d.setDate(d.getDate() + offset);
                entities.date = d.toISOString().split('T')[0];
                break;
            }
        }

        // Explicit date pattern DD/MM/YYYY or DD-MM-YYYY
        if (!entities.date) {
            const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1;
                const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : today.getFullYear();
                if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                    const d = new Date(year, month, day);
                    entities.date = d.toISOString().split('T')[0];
                }
            }
        }

        if (!entities.date) {
            entities.date = today.toISOString().split('T')[0];
        }

        // Merchant extraction
        const merchantMatch = text.match(/(?:at|from|to|on|via)\s+([a-zA-Z][a-zA-Z\s]{1,30})/i);
        if (merchantMatch) {
            entities.merchant = merchantMatch[1].trim().replace(/\s+(yesterday|today|on|for|rs|rupees).*/i, '').trim();
            if (entities.merchant.length < 2) entities.merchant = null;
        }

        // Description generation
        entities.description = text.charAt(0).toUpperCase() + text.slice(1);
        if (entities.description.length > 200) {
            entities.description = entities.description.substring(0, 200);
        }

        return entities;
    }

    /**
     * Match transcript text to a category
     */
    static async matchCategory(userId, text) {
        // Check keyword dictionary
        for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
            if (keywords.some((kw) => text.includes(kw))) {
                // Find category in DB
                const cat = await db('categories')
                    .where('name', category)
                    .where(function () {
                        this.whereNull('user_id').orWhere('user_id', userId);
                    })
                    .first();

                if (cat) {
                    return { category_id: cat.id, category_name: cat.name, match_type: 'keyword' };
                }
            }
        }

        return { category_id: null, category_name: 'Uncategorized', match_type: 'none' };
    }

    /**
     * Calculate confidence score
     */
    static calculateConfidence(intent, entities, categoryMatch) {
        let confidence = 0;
        if (intent !== 'UNKNOWN') confidence += 0.35;
        if (entities.amount) confidence += 0.25;
        if (entities.date) confidence += 0.1;
        if (entities.merchant) confidence += 0.15;
        if (categoryMatch.category_id) confidence += 0.15;
        return Math.min(confidence, 1.0);
    }

    /**
     * Create a transaction from voice parsed data
     */
    static async createTransactionFromVoice(userId, { intent, entities, categoryMatch, voiceLogId }) {
        const type = intent === 'INCOME' ? 'income' : 'expense';
        const txn = await db('transactions').insert({
            user_id: userId,
            category_id: categoryMatch.category_id || 1, // fallback to first category
            type,
            amount: entities.amount,
            description: entities.description || 'Voice entry',
            merchant: entities.merchant,
            transaction_date: entities.date,
            data_source: 'voice',
            source_reference_id: voiceLogId,
            ai_categorized: categoryMatch.match_type === 'keyword',
            ai_confidence: categoryMatch.category_id ? 0.85 : 0,
        }).returning('*');

        await AuditService.log({
            userId,
            action: 'CREATE',
            entityType: 'transaction',
            entityId: txn[0].id,
            newValues: txn[0],
        });

        return txn[0];
    }

    /**
     * Confirm a parsed voice entry (when confidence < 0.8)
     */
    static async confirmVoiceEntry(userId, voiceLogId, transactionData) {
        const txn = await db('transactions').insert({
            ...transactionData,
            user_id: userId,
            data_source: 'voice',
            source_reference_id: voiceLogId,
        }).returning('*');

        await db('voice_logs').where('id', voiceLogId).update({
            processing_status: 'confirmed',
            resulting_txn_id: txn[0].id,
        });

        await AuditService.log({
            userId,
            action: 'CREATE',
            entityType: 'transaction',
            entityId: txn[0].id,
            newValues: txn[0],
        });

        return txn[0];
    }
}

module.exports = VoiceService;
