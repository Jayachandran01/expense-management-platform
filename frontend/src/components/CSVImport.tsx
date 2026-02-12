import React, { useState, useCallback } from 'react';
import { importService } from '../services/enterpriseServices';

interface CSVImportProps {
    onImportComplete?: () => void;
    onClose?: () => void;
}

const CSVImport: React.FC<CSVImportProps> = ({ onImportComplete, onClose }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'complete'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [importStatus, setImportStatus] = useState<any>(null);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.type === 'text/csv' || f.name.endsWith('.csv'))) {
            setFile(f);
            handleUpload(f);
        } else {
            setError('Please drop a CSV file');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            handleUpload(f);
        }
    };

    const handleUpload = async (f: File) => {
        setError('');
        try {
            const { data } = await importService.previewCSV(f);
            setPreview(data.data);
            setStep('mapping');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to parse CSV');
        }
    };

    const handleConfirmImport = async () => {
        if (!preview) return;
        setStep('processing');
        try {
            await importService.confirmImport(preview.import_id, preview.detected_mapping);

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const { data } = await importService.getImportStatus(preview.import_id);
                    setImportStatus(data.data);
                    if (data.data.processing_status === 'completed' || data.data.processing_status === 'failed') {
                        clearInterval(pollInterval);
                        setStep('complete');
                        if (data.data.processing_status === 'completed') onImportComplete?.();
                    }
                } catch {
                    clearInterval(pollInterval);
                }
            }, 2000);

            // Timeout after 2 min
            setTimeout(() => clearInterval(pollInterval), 120000);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Import failed');
            setStep('mapping');
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-100">📄 CSV Import</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        {['Upload', 'Map', 'Import', 'Done'].map((label, i) => (
                            <React.Fragment key={label}>
                                <span className={`px-2 py-1 rounded ${i <= ['upload', 'mapping', 'processing', 'complete'].indexOf(step)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-700 text-slate-500'
                                    }`}>
                                    {label}
                                </span>
                                {i < 3 && <span className="text-slate-600">→</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
                            }`}
                        onClick={() => document.getElementById('csv-file-input')?.click()}
                    >
                        <div className="text-4xl mb-3">📄</div>
                        <p className="text-slate-300 font-medium">Drop your CSV file here</p>
                        <p className="text-slate-500 text-sm mt-1">or click to browse</p>
                        <p className="text-slate-600 text-xs mt-3">Supports: .csv files up to 5MB</p>
                        <input
                            id="csv-file-input"
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 'mapping' && preview && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">File: {file?.name}</span>
                                <span className="text-slate-400">{preview.total_rows} rows detected</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">Detected Column Mapping</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(preview.detected_mapping as Record<string, string>).map(([field, header]) => (
                                    <div key={field} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                                        <span className="text-slate-400 capitalize">{field}:</span>
                                        <span className="text-emerald-400 font-mono text-xs">{header as string}</span>
                                        <span className="text-emerald-500 ml-auto">✓</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preview rows */}
                        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-x-auto">
                            <h4 className="text-sm font-semibold text-slate-300 p-3 border-b border-slate-700">Preview (first 5 rows)</h4>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        {Object.keys(preview.detected_mapping).map((field) => (
                                            <th key={field} className="text-left text-slate-400 px-3 py-2 font-medium capitalize">{field}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.preview_rows.map((row: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-800">
                                            {Object.keys(preview.detected_mapping).map((field) => (
                                                <td key={field} className="text-slate-300 px-3 py-2">{row[field] || '—'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => { setStep('upload'); setPreview(null); setFile(null); }}
                                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                                ← Back
                            </button>
                            <button onClick={handleConfirmImport}
                                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors">
                                Confirm & Import
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Processing */}
                {step === 'processing' && (
                    <div className="text-center py-8">
                        <div className="animate-spin w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-300 font-medium mb-2">Importing transactions...</p>
                        {importStatus && (
                            <div className="space-y-2 mt-4">
                                <div className="h-3 bg-slate-700 rounded-full overflow-hidden max-w-xs mx-auto">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${preview?.total_rows ? (importStatus.imported_rows / preview.total_rows * 100) : 0}%` }}
                                    />
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {importStatus.imported_rows || 0} / {preview?.total_rows || '?'} transactions
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === 'complete' && importStatus && (
                    <div className="text-center py-6">
                        <div className="text-5xl mb-3">{importStatus.processing_status === 'completed' ? '✅' : '❌'}</div>
                        <p className={`text-lg font-semibold ${importStatus.processing_status === 'completed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {importStatus.processing_status === 'completed' ? 'Import Complete!' : 'Import Failed'}
                        </p>
                        <div className="grid grid-cols-4 gap-3 mt-4 max-w-sm mx-auto">
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xl font-bold text-emerald-400">{importStatus.imported_rows}</p>
                                <p className="text-xs text-slate-500">Imported</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xl font-bold text-amber-400">{importStatus.skipped_rows}</p>
                                <p className="text-xs text-slate-500">Skipped</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xl font-bold text-blue-400">{importStatus.duplicate_rows}</p>
                                <p className="text-xs text-slate-500">Duplicates</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xl font-bold text-rose-400">{importStatus.failed_rows}</p>
                                <p className="text-xs text-slate-500">Failed</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="mt-6 px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                            Done
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 mt-4 text-center">
                        <p className="text-rose-400 text-sm">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CSVImport;
