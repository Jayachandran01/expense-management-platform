import React, { useState, useRef, useEffect, useCallback } from 'react';
import { voiceService } from '../services/enterpriseServices';

interface VoiceInputProps {
    onTransactionCreated?: (transaction: any) => void;
    onClose?: () => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTransactionCreated, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [parsedResult, setParsedResult] = useState<any>(null);
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'parsed' | 'confirmed' | 'error'>('idle');
    const [error, setError] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-IN';

            recognition.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += t;
                    else interim += t;
                }
                if (final) setTranscript(final);
                setInterimTranscript(interim);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                setError(`Speech recognition error: ${event.error}`);
                setStatus('error');
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, []);

    const startListening = useCallback(() => {
        setError('');
        setTranscript('');
        setInterimTranscript('');
        setParsedResult(null);
        setStatus('listening');
        setIsListening(true);
        recognitionRef.current?.start();
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const processTranscript = useCallback(async () => {
        if (!transcript) return;
        setStatus('processing');
        try {
            const { data } = await voiceService.processTranscript(transcript);
            setParsedResult(data.data);
            setStatus('parsed');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to process');
            setStatus('error');
        }
    }, [transcript]);

    useEffect(() => {
        if (transcript && !isListening) processTranscript();
    }, [transcript, isListening, processTranscript]);

    const handleConfirm = async () => {
        if (!parsedResult) return;
        try {
            if (parsedResult.confirmation_required) {
                const { data } = await voiceService.confirmVoiceEntry(parsedResult.voice_log_id, {
                    category_id: parsedResult.entities.category?.category_id,
                    type: parsedResult.intent === 'INCOME' ? 'income' : 'expense',
                    amount: parsedResult.entities.amount,
                    description: parsedResult.entities.description,
                    merchant: parsedResult.entities.merchant,
                    transaction_date: parsedResult.entities.date,
                });
                onTransactionCreated?.(data.data.transaction);
            } else {
                onTransactionCreated?.(parsedResult.transaction);
            }
            setStatus('confirmed');
            setTimeout(() => onClose?.(), 1500);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to save');
            setStatus('error');
        }
    };

    const confidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-emerald-400';
        if (confidence >= 0.5) return 'text-amber-400';
        return 'text-rose-400';
    };

    const confidenceBarWidth = (confidence: number) => `${Math.round(confidence * 100)}%`;

    if (!recognitionRef.current && status === 'idle') {
        return (
            <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
                <p className="text-slate-400">Speech recognition is not supported in this browser.</p>
                <p className="text-slate-500 text-sm mt-2">Try Chrome or Edge for voice input.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    🎤 Voice Transaction Entry
                </h3>

                {/* Transcript display */}
                <div className="bg-slate-900 rounded-lg p-4 min-h-[80px] mb-4 border border-slate-700">
                    {transcript ? (
                        <p className="text-slate-200 text-lg">"{transcript}"</p>
                    ) : interimTranscript ? (
                        <p className="text-slate-400 text-lg italic">"{interimTranscript}"</p>
                    ) : (
                        <p className="text-slate-500 text-center mt-4">
                            {status === 'listening' ? 'Listening... speak now' : 'Tap the mic button to start'}
                        </p>
                    )}
                </div>

                {/* Mic button */}
                {(status === 'idle' || status === 'listening' || status === 'error') && (
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={isListening ? stopListening : startListening}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                                ? 'bg-rose-500 shadow-lg shadow-rose-500/30 animate-pulse scale-110'
                                : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105'
                                }`}
                        >
                            <span className="text-3xl">{isListening ? '⏹️' : '🎤'}</span>
                        </button>
                    </div>
                )}

                {/* Processing state */}
                {status === 'processing' && (
                    <div className="text-center py-4">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-slate-400">Understanding your voice...</p>
                    </div>
                )}

                {/* Parsed result */}
                {status === 'parsed' && parsedResult && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <span className="text-xs text-slate-500 uppercase">Amount</span>
                                <p className="text-xl font-bold text-emerald-400">
                                    ₹{parsedResult.entities.amount?.toLocaleString() || '—'}
                                </p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <span className="text-xs text-slate-500 uppercase">Type</span>
                                <p className={`text-xl font-bold ${parsedResult.intent === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {parsedResult.intent === 'INCOME' ? 'Income' : 'Expense'}
                                </p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <span className="text-xs text-slate-500 uppercase">Category</span>
                                <p className="text-lg text-slate-200">{parsedResult.entities.category?.category_name || 'Uncategorized'}</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <span className="text-xs text-slate-500 uppercase">Date</span>
                                <p className="text-lg text-slate-200">{parsedResult.entities.date || 'Today'}</p>
                            </div>
                        </div>

                        {parsedResult.entities.merchant && (
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <span className="text-xs text-slate-500 uppercase">Merchant</span>
                                <p className="text-lg text-slate-200">{parsedResult.entities.merchant}</p>
                            </div>
                        )}

                        {/* Confidence bar */}
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-slate-500 uppercase">Confidence</span>
                                <span className={`text-sm font-semibold ${confidenceColor(parsedResult.confidence)}`}>
                                    {Math.round(parsedResult.confidence * 100)}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                                    style={{ width: confidenceBarWidth(parsedResult.confidence) }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setStatus('idle'); setParsedResult(null); setTranscript(''); }}
                                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
                            >
                                ✓ Confirm & Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirmed */}
                {status === 'confirmed' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-3">✅</div>
                        <p className="text-emerald-400 font-semibold text-lg">Transaction saved!</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 mt-3 text-center">
                        <p className="text-rose-400 text-sm">{error}</p>
                        <button onClick={() => { setError(''); setStatus('idle'); }} className="text-rose-300 text-xs mt-1 underline">
                            Try again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceInput;
