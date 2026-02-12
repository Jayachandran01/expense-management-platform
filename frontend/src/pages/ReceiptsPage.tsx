import React, { useState } from 'react';
import {
    Sparkles,
    FileText,
    Check,
    Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ReceiptScanner } from '../components/ReceiptScanner';

interface ReceiptResult {
    merchant: string;
    amount: number;
    date: string;
    category: string;
    confidence: number;
    items: string[];
}

const mockReceipts = [
    { id: 1, merchant: 'Big Bazaar', amount: 2450, date: '2026-02-10', thumbnail: '🛒', confidence: 94 },
    { id: 2, merchant: 'Swiggy Order', amount: 580, date: '2026-02-08', thumbnail: '🍕', confidence: 87 },
    { id: 3, merchant: 'Shell Petrol', amount: 3200, date: '2026-02-05', thumbnail: '⛽', confidence: 91 },
    { id: 4, merchant: 'Apollo Pharmacy', amount: 1150, date: '2026-02-03', thumbnail: '💊', confidence: 78 },
];

export const ReceiptsPage: React.FC = () => {
    const [receipts, setReceipts] = useState(mockReceipts);

    const handleTransactionCreated = (transaction: any) => {
        const newReceipt = {
            id: Date.now(),
            merchant: transaction.merchant || 'Unknown Merchant',
            amount: transaction.amount || 0,
            date: transaction.date || new Date().toISOString().split('T')[0],
            thumbnail: '🧾',
            confidence: Math.round((transaction.confidence || 0.9) * 100),
        };
        setReceipts([newReceipt, ...receipts]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Receipt Scanner</h1>
                <p className="page-subtitle">Upload receipts and automatically extract transaction data with AI</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {/* Scanner Component */}
                <div className="space-y-6">
                    <div className="enterprise-card p-1">
                        <ReceiptScanner onTransactionCreated={handleTransactionCreated} className="rounded-xl" />
                    </div>

                    <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-600/10 border border-brand-100 dark:border-brand-600/20">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5" />
                            <div>
                                <h4 className="text-body font-semibold text-brand-900 dark:text-brand-100">AI Processing</h4>
                                <p className="text-caption text-brand-700 dark:text-brand-300 mt-1">
                                    Our OCR engine automatically extracts merchant name, date, total amount, and line items. Review and edit before saving.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Receipt History */}
                <div className="enterprise-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--color-border-secondary)] flex items-center justify-between">
                        <div>
                            <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Receipt History</h3>
                            <p className="text-caption text-[var(--color-text-tertiary)] mt-0.5">Previously scanned receipts</p>
                        </div>
                        <span className="badge badge-brand">{receipts.length} Receipts</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 max-h-[600px] overflow-y-auto">
                        {receipts.map((receipt) => (
                            <div
                                key={receipt.id}
                                className="p-4 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer group border border-transparent hover:border-[var(--color-border-primary)]"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">{receipt.thumbnail}</span>
                                    <span className={clsx(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-lg',
                                        receipt.confidence >= 90
                                            ? 'bg-success-50 text-success-600 dark:bg-success-600/10 dark:text-success-400'
                                            : receipt.confidence >= 75
                                                ? 'bg-warning-50 text-warning-600 dark:bg-warning-600/10 dark:text-warning-400'
                                                : 'bg-danger-50 text-danger-600 dark:bg-danger-600/10 dark:text-danger-400'
                                    )}>
                                        {receipt.confidence}% match
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-body font-medium text-[var(--color-text-primary)] truncate" title={receipt.merchant}>
                                        {receipt.merchant}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-caption text-[var(--color-text-tertiary)] flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(receipt.date)}
                                        </p>
                                        <p className="text-body font-semibold text-[var(--color-text-primary)]">
                                            {formatCurrency(receipt.amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
