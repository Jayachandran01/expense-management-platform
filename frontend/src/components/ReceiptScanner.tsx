import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, X, Check, Loader2, Sparkles, Edit3, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { receiptService } from '../services/enterpriseServices';
import { parseAmountFromText, parseDateFromText, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

interface ReceiptScannerProps {
    onTransactionCreated?: (transaction: any) => void;
    onClose?: () => void;
    className?: string;
    isModal?: boolean;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
    onTransactionCreated,
    onClose,
    className,
    isModal = false,
}) => {
    const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'confirmed'>('upload');
    const [preview, setPreview] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [editedData, setEditedData] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            handleFile(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
    });

    const handleFile = async (file: File) => {
        // Create preview
        if (file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null); // No preview for PDF yet
        }

        setStep('processing');
        setIsProcessing(true);

        try {
            // Try real service first
            let data;
            try {
                // Attempt upload (might fail if backend is offline)
                // const response = await receiptService.uploadReceipt(file);
                // data = response.data;
                // For prototype consistency, we'll imply mock behavior immediately if not configured, 
                // but normally we'd call the service here.
                throw new Error("Backend not available");
            } catch (err) {
                // Mock fallback simulation
                console.log("Using mock OCR simulation");
                await new Promise(resolve => setTimeout(resolve, 2500));

                // Simulated OCR data
                data = {
                    success: true,
                    data: {
                        id: 'mock-receipt-123',
                        extracted_amount: 2450,
                        extracted_merchant: "Big Bazaar - MG Road",
                        extracted_date: new Date().toISOString().split('T')[0],
                        extracted_category: "Food & Dining",
                        ocr_confidence: 0.94,
                        extracted_items: ['Rice - 5kg', 'Cooking Oil', 'Vegetables']
                    }
                };
            }

            const result = data.data;
            setReceiptData(result);
            setEditedData({
                merchant: result.extracted_merchant || '',
                amount: result.extracted_amount || 0,
                date: result.extracted_date || new Date().toISOString().split('T')[0],
                category: result.extracted_category || 'Uncategorized',
                description: result.extracted_merchant ? `Receipt: ${result.extracted_merchant}` : 'Receipt Purchase',
            });
            setStep('review');
        } catch (error) {
            toast.error("Failed to process receipt");
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setIsProcessing(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const transaction = {
                ...editedData,
                id: Date.now(),
                type: 'expense',
                source: 'ocr',
                receipt_url: preview,
                confidence: receiptData?.ocr_confidence,
            };

            onTransactionCreated?.(transaction);
            setStep('confirmed');
            toast.success("Receipt saved successfully!");

            setTimeout(() => {
                if (onClose) onClose();
                else {
                    // Reset if no close handler
                    setStep('upload');
                    setPreview(null);
                    setReceiptData(null);
                }
            }, 1500);
        } catch (error) {
            toast.error("Failed to save transaction");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={clsx("bg-[var(--color-bg-elevated)]", className)}>
            {isModal && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">Scan Receipt</h3>
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            {step === 'upload' && (
                <div
                    {...getRootProps()}
                    className={clsx(
                        'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                        isDragActive
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-600/5'
                            : 'border-[var(--color-border-primary)] hover:border-brand-300 hover:bg-[var(--color-bg-secondary)]'
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center mb-4">
                        <Camera className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="text-body font-semibold text-[var(--color-text-primary)] mb-2">
                        Upload Receipt
                    </h3>
                    <p className="text-caption text-[var(--color-text-tertiary)] mb-4">
                        Drag & drop or click to browse
                    </p>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI OCR</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> JPG, PNG, PDF</span>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="py-12 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-[var(--color-bg-tertiary)] rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-brand-500 animate-pulse" />
                    </div>
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-2">
                        Scanning Receipt...
                    </h3>
                    <p className="text-body text-[var(--color-text-tertiary)]">
                        Extracting merchant, date, and amount
                    </p>
                </div>
            )}

            {step === 'review' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex gap-4">
                        {preview && (
                            <div className="w-24 h-32 rounded-xl border border-[var(--color-border-primary)] overflow-hidden flex-shrink-0 bg-[var(--color-bg-tertiary)]">
                                <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="badge badge-success flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Scan Complete
                                </span>
                                <span className={clsx(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                                    (receiptData?.ocr_confidence || 0) > 0.9 ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-600"
                                )}>
                                    {Math.round((receiptData?.ocr_confidence || 0) * 100)}% Confidence
                                </span>
                            </div>
                            <p className="text-caption text-[var(--color-text-tertiary)]">
                                Please review the extracted details below before saving.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'Merchant', key: 'merchant', type: 'text' },
                            { label: 'Amount', key: 'amount', type: 'number' },
                            { label: 'Date', key: 'date', type: 'date' },
                            { label: 'Category', key: 'category', type: 'text' },
                        ].map((field) => (
                            <div key={field.key}>
                                <label className="text-caption font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                    {field.label}
                                </label>
                                <div className="relative">
                                    <input
                                        type={field.type}
                                        value={editedData[field.key]}
                                        onChange={(e) => setEditedData({ ...editedData, [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                                        className="input-field"
                                    />
                                    {field.key === 'amount' && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-bold text-[var(--color-text-tertiary)]">
                                            INR
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => { setStep('upload'); setPreview(null); }}
                            className="btn-ghost flex-1 text-caption"
                        >
                            Re-scan
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className="btn-primary flex-1 text-caption flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Confirm & Save
                        </button>
                    </div>
                </div>
            )}

            {step === 'confirmed' && (
                <div className="py-12 text-center animate-scale-in">
                    <div className="w-16 h-16 mx-auto rounded-full bg-success-50 dark:bg-success-600/10 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success-600 dark:text-success-400" />
                    </div>
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-2">
                        Transaction Saved!
                    </h3>
                    <p className="text-body text-[var(--color-text-tertiary)]">
                        Receipt processed successfully.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReceiptScanner;
