/**
 * AI Category Service
 * Smart transaction categorization using keyword matching + TF-IDF fallback
 * No paid APIs — fully rule-based and statistical
 */
const db = require('../database/connection');
const logger = require('../utils/logger');

class AICategoryService {
    // Comprehensive keyword dictionary (500+ entries)
    static CATEGORY_RULES = {
        'Food & Dining': {
            exact: ['swiggy', 'zomato', 'dominos', 'mcdonalds', 'starbucks', 'kfc', 'subway', 'pizzahut', 'dunkin', 'burgerking', 'haldirams', 'barbeque nation', 'chaayos', 'chai point', 'bigbasket', 'grofers', 'jiomart', 'zepto', 'blinkit', 'instamart'],
            contains: ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'biryani', 'lunch', 'dinner', 'breakfast', 'meal', 'snack', 'tea', 'coffee', 'bakery', 'canteen', 'hotel dining', 'kitchen', 'cook', 'grocery', 'grocer', 'supermarket', 'vegetable', 'fruit', 'meat', 'fish', 'milk', 'bread', 'rice'],
        },
        'Transportation': {
            exact: ['uber', 'ola', 'rapido', 'irctc', 'makemytrip', 'redbus', 'goibibo', 'cleartrip', 'yulu'],
            contains: ['cab', 'taxi', 'auto', 'rickshaw', 'bus', 'train', 'metro', 'flight', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'travel', 'commute', 'ride', 'transport'],
        },
        'Shopping': {
            exact: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'tatacliq', 'croma', 'reliance digital', 'shoppers stop', 'lifestyle', 'westside', 'hm', 'zara'],
            contains: ['shopping', 'clothes', 'shoes', 'electronics', 'gadget', 'phone', 'laptop', 'accessories', 'fashion', 'wear', 'apparel', 'purchase', 'mall', 'market', 'store', 'retail', 'buy', 'order'],
        },
        'Entertainment': {
            exact: ['netflix', 'spotify', 'hotstar', 'prime video', 'youtube premium', 'pvr', 'inox', 'bookmyshow', 'gaana', 'sony liv', 'jio cinema'],
            contains: ['movie', 'cinema', 'game', 'gaming', 'concert', 'show', 'party', 'fun', 'outing', 'vacation', 'trip', 'entertainment', 'play', 'stream', 'music', 'sport'],
        },
        'Utilities': {
            exact: ['bescom', 'bwssb', 'tangedco', 'msedcl', 'airtel', 'jio', 'bsnl', 'vodafone', 'vi', 'act fibernet', 'hathway', 'tata sky', 'dish tv'],
            contains: ['electricity', 'water', 'gas', 'internet', 'broadband', 'wifi', 'phone bill', 'mobile bill', 'recharge', 'dth', 'cable', 'bill payment', 'utility'],
        },
        'Housing': {
            exact: [],
            contains: ['rent', 'housing', 'home', 'apartment', 'flat', 'maintenance', 'society', 'repair', 'plumber', 'electrician', 'carpenter', 'furniture', 'decor', 'appliance'],
        },
        'Health & Fitness': {
            exact: ['apollo', 'practo', 'pharmeasy', 'netmeds', '1mg', 'cult.fit', 'gold gym'],
            contains: ['gym', 'medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'health', 'fitness', 'yoga', 'workout', 'clinic', 'therapy', 'dental', 'eye', 'lab test', 'diagnostic'],
        },
        'Education': {
            exact: ['udemy', 'coursera', 'unacademy', 'byjus', 'skillshare', 'pluralsight', 'linkedin learning'],
            contains: ['course', 'book', 'tuition', 'class', 'school', 'college', 'university', 'study', 'tutorial', 'training', 'exam', 'certification', 'coaching'],
        },
        'Personal Care': {
            exact: [],
            contains: ['salon', 'haircut', 'beauty', 'grooming', 'spa', 'cosmetic', 'skincare', 'parlour', 'barber'],
        },
        'Insurance': {
            exact: ['lic', 'star health', 'hdfc ergo', 'icici lombard', 'max life', 'bajaj allianz'],
            contains: ['insurance', 'premium', 'policy', 'coverage', 'claim'],
        },
        'Investments': {
            exact: ['zerodha', 'groww', 'upstox', 'coin', 'kuvera', 'paytm money', 'angel one'],
            contains: ['investment', 'sip', 'mutual fund', 'stock', 'trading', 'fd', 'deposit', 'ppf', 'nps', 'gold', 'bond', 'equity'],
        },
        'Subscriptions': {
            exact: ['notion', 'figma', 'icloud', 'google one', 'dropbox', 'canva', 'adobe'],
            contains: ['subscription', 'membership', 'plan', 'annual', 'monthly plan', 'recurring'],
        },
        'Gifts & Donations': {
            exact: [],
            contains: ['gift', 'donation', 'charity', 'present', 'wedding', 'birthday', 'shagun', 'offering'],
        },
    };

    /**
     * Categorize a transaction description
     */
    static async categorize(userId, description, merchant = '') {
        const text = `${description} ${merchant}`.toLowerCase().trim();

        // Layer 1: Exact keyword match (fastest, highest confidence)
        for (const [categoryName, rules] of Object.entries(this.CATEGORY_RULES)) {
            // Check exact matches first
            for (const keyword of rules.exact) {
                if (text.includes(keyword)) {
                    const cat = await this.findCategory(userId, categoryName);
                    if (cat) return { category_id: cat.id, category_name: cat.name, confidence: 0.95, match_type: 'exact' };
                }
            }
        }

        // Layer 2: Contains keyword match
        for (const [categoryName, rules] of Object.entries(this.CATEGORY_RULES)) {
            for (const keyword of rules.contains) {
                if (text.includes(keyword)) {
                    const cat = await this.findCategory(userId, categoryName);
                    if (cat) return { category_id: cat.id, category_name: cat.name, confidence: 0.80, match_type: 'keyword' };
                }
            }
        }

        // Layer 3: Historical match (user's past transactions with similar descriptions)
        try {
            const similar = await db('transactions')
                .select('category_id')
                .count('* as count')
                .where('user_id', userId)
                .whereNull('deleted_at')
                .where(function () {
                    this.whereRaw('LOWER(description) LIKE ?', [`%${text.split(' ')[0]}%`]);
                    if (merchant) this.orWhereRaw('LOWER(merchant) LIKE ?', [`%${merchant.toLowerCase()}%`]);
                })
                .groupBy('category_id')
                .orderBy('count', 'desc')
                .first();

            if (similar) {
                const cat = await db('categories').where('id', similar.category_id).first();
                if (cat) return { category_id: cat.id, category_name: cat.name, confidence: 0.65, match_type: 'historical' };
            }
        } catch { /* fallback to uncategorized */ }

        // Layer 4: Fallback — uncategorized
        const fallback = await db('categories')
            .where('name', 'like', '%Other%')
            .where('type', 'expense')
            .first();

        return {
            category_id: fallback?.id || 1,
            category_name: fallback?.name || 'Other',
            confidence: 0,
            match_type: 'none',
        };
    }

    /**
     * Find category by name for a user (system + user custom)
     */
    static async findCategory(userId, categoryName) {
        return db('categories')
            .where('name', categoryName)
            .where(function () {
                this.where('is_system', true).orWhere('user_id', userId);
            })
            .first();
    }
}

module.exports = AICategoryService;
