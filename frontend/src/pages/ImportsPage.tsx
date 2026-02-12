import React, { useState, useCallback } from 'react';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    X,
    ArrowRight,
    Columns,
    AlertCircle,
    FileCheck,
    Loader2,
} from 'lucide-react';
import clsx from 'clsx';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

const mockPreviewData = [
    { date: '2026-01-15', description: 'Amazon Purchase', amount: '2499', category: 'Shopping', type: 'expense' },
    { date: '2026-01-16', description: 'Salary Credit', amount: '75000', category: 'Income', type: 'income' },
    { date: '2026-01-17', description: 'Uber Ride', amount: '245', category: 'Transport', type: 'expense' },
    { date: '2026-01-18', description: 'Grocery Store', amount: '1850', category: 'Food', type: 'expense' },
    { date: '2026-01-18', description: 'Netflix', amount: '649', category: 'Entertainment', type: 'expense' },
    { date: '2026-01-19', description: 'Electric Bill', amount: '1200', category: 'Utilities', type: 'expense' },
];

const columnOptions = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Payment Method', 'Notes', 'Skip'];

export const ImportsPage: React.FC = () => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [mappings, setMappings] = useState<Record<string, string>>({
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        category: 'Category',
        type: 'Type',
    });

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
            setUploadedFile(file);
            setStep('preview');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setStep('preview');
        }
    };

    const simulateImport = () => {
        setStep('importing');
        let p = 0;
        const interval = setInterval(() => {
            p += Math.random() * 15;
            if (p >= 100) {
                setProgress(100);
                clearInterval(interval);
                setTimeout(() => setStep('complete'), 500);
            } else {
                setProgress(Math.floor(p));
            }
        }, 200);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Import Transactions</h1>
                <p className="page-subtitle">Upload CSV files to bulk import your financial data</p>
            </div>

            {/* Steps indicator */}
            <div className="enterprise-card p-4">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {[
                        { key: 'upload', label: 'Upload', num: 1 },
                        { key: 'preview', label: 'Preview', num: 2 },
                        { key: 'mapping', label: 'Map Columns', num: 3 },
                        { key: 'complete', label: 'Complete', num: 4 },
                    ].map((s, i) => {
                        const isActive = ['upload', 'preview', 'mapping', 'importing', 'complete'].indexOf(step) >= ['upload', 'preview', 'mapping', 'complete'].indexOf(s.key);
                        const isCurrent = step === s.key || (step === 'importing' && s.key === 'complete');
                        return (
                            <React.Fragment key={s.key}>
                                {i > 0 && (
                                    <div className={clsx('flex-1 h-0.5 mx-2 rounded-full transition-colors', isActive ? 'bg-brand-500' : 'bg-[var(--color-border-primary)]')} />
                                )}
                                <div className="flex items-center gap-2">
                                    <div className={clsx(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold transition-all',
                                        isActive ? 'bg-brand-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                                    )}>
                                        {s.num}
                                    </div>
                                    <span className={clsx('text-caption font-medium hidden sm:block', isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>
                                        {s.label}
                                    </span>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            {step === 'upload' && (
                <div
                    className={clsx(
                        'enterprise-card p-12 text-center border-2 border-dashed transition-all duration-200 cursor-pointer',
                        isDragging
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-600/5'
                            : 'border-[var(--color-border-primary)] hover:border-brand-300'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('csv-file-input')?.click()}
                >
                    <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-600/10 flex items-center justify-center mb-4">
                        <Upload className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-2">
                        Drop your CSV file here
                    </h3>
                    <p className="text-body text-[var(--color-text-tertiary)] mb-4">
                        or click to browse • Supports .csv files up to 10MB
                    </p>
                    <div className="flex items-center justify-center gap-6 text-caption text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> CSV format</span>
                        <span className="flex items-center gap-1.5"><Columns className="w-3.5 h-3.5" /> Auto-mapping</span>
                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Duplicate detection</span>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="enterprise-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--color-border-secondary)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                            <div>
                                <h3 className="text-body font-semibold text-[var(--color-text-primary)]">{uploadedFile?.name || 'transactions.csv'}</h3>
                                <p className="text-[10px] text-[var(--color-text-tertiary)]">{mockPreviewData.length} rows detected</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="badge badge-warning"><AlertCircle className="w-3 h-3 mr-1" />1 possible duplicate</div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border-secondary)]">
                                    <th className="py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider text-left">#</th>
                                    {Object.keys(mockPreviewData[0]).map((key) => (
                                        <th key={key} className="py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider text-left">{key}</th>
                                    ))}
                                    <th className="py-3 px-4 text-caption font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockPreviewData.map((row, i) => (
                                    <tr key={i} className={clsx(
                                        'border-b border-[var(--color-border-secondary)]',
                                        i === 3 && 'bg-warning-50/50 dark:bg-warning-600/5'
                                    )}>
                                        <td className="py-3 px-4 text-caption text-[var(--color-text-tertiary)]">{i + 1}</td>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} className="py-3 px-4 text-body text-[var(--color-text-primary)]">{val}</td>
                                        ))}
                                        <td className="py-3 px-4">
                                            {i === 3 ? (
                                                <span className="badge badge-warning">Duplicate?</span>
                                            ) : (
                                                <span className="badge badge-success">Valid</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-[var(--color-border-secondary)] flex items-center justify-between">
                        <button onClick={() => setStep('upload')} className="btn-ghost text-caption">← Back</button>
                        <button onClick={() => setStep('mapping')} className="btn-primary flex items-center gap-2 text-caption">
                            Continue to Mapping <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {step === 'mapping' && (
                <div className="enterprise-card p-6">
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-1">Column Mapping</h3>
                    <p className="text-caption text-[var(--color-text-tertiary)] mb-6">Map your CSV columns to the correct fields</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        {Object.entries(mappings).map(([csvCol, appCol]) => (
                            <div key={csvCol} className="flex items-center gap-3">
                                <div className="flex-1 p-3 rounded-xl bg-[var(--color-bg-secondary)] text-body font-medium text-[var(--color-text-primary)] capitalize">
                                    {csvCol}
                                </div>
                                <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                                <select
                                    value={appCol}
                                    onChange={(e) => setMappings({ ...mappings, [csvCol]: e.target.value })}
                                    className="input-field flex-1"
                                >
                                    {columnOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-border-secondary)]">
                        <button onClick={() => setStep('preview')} className="btn-ghost text-caption">← Back</button>
                        <button onClick={simulateImport} className="btn-primary flex items-center gap-2 text-caption">
                            Start Import <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div className="enterprise-card p-12 text-center">
                    <Loader2 className="w-12 h-12 mx-auto text-brand-600 animate-spin mb-4" />
                    <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)] mb-2">Importing Transactions</h3>
                    <p className="text-body text-[var(--color-text-tertiary)] mb-6">Please wait while we process your file...</p>
                    <div className="max-w-md mx-auto">
                        <div className="progress-bar h-3">
                            <div
                                className="progress-bar-fill bg-gradient-to-r from-brand-500 to-brand-400"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-caption text-[var(--color-text-tertiary)] mt-2">{progress}% complete</p>
                    </div>
                </div>
            )}

            {step === 'complete' && (
                <div className="enterprise-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-success-50 dark:bg-success-600/10 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-success-500" />
                    </div>
                    <h3 className="text-heading-2 font-bold text-[var(--color-text-primary)] mb-2">Import Complete!</h3>
                    <p className="text-body text-[var(--color-text-tertiary)] mb-6">Successfully processed your CSV file</p>

                    <div className="max-w-sm mx-auto enterprise-card p-4 mb-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-heading-2 font-bold text-success-600">{mockPreviewData.length - 1}</p>
                                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Imported</p>
                            </div>
                            <div>
                                <p className="text-heading-2 font-bold text-warning-600">1</p>
                                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Skipped</p>
                            </div>
                            <div>
                                <p className="text-heading-2 font-bold text-danger-600">0</p>
                                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium">Errors</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <button onClick={() => { setStep('upload'); setUploadedFile(null); setProgress(0); }} className="btn-secondary text-caption">
                            Import Another
                        </button>
                        <button onClick={() => window.location.href = '/transactions'} className="btn-primary text-caption">
                            View Transactions
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
