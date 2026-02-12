import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Check, Loader2, Play, Square, ThumbsUp, ThumbsDown } from 'lucide-react';
import clsx from 'clsx';
import { voiceService } from '../../services/enterpriseServices';
import toast from 'react-hot-toast';

interface VoiceInputProps {
    onTransactionCreated?: (transaction: any) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTransactionCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [detectedData, setDetectedData] = useState<any>(null);

    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("Speech recognition not supported in this browser.");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            setTranscript('');
        };

        recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscript || interimTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
            toast.error("Microphone error");
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            if (transcript) processVoice(transcript);
        };

        recognitionRef.current.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const processVoice = async (text: string) => {
        setIsProcessing(true);
        try {
            // Try real service first
            // await voiceService.processTranscript(text);
            // Simulated AI logic for demo
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Extract amounts (simple regex mock)
            const amountMatch = text.match(/(\d+)/);
            const amount = amountMatch ? parseInt(amountMatch[0]) : 0;

            const mockResult = {
                description: text,
                amount: amount || (Math.floor(Math.random() * 2000) + 100),
                category: 'Uncategorized', // In real AI, this would be inferred
                date: new Date().toISOString().split('T')[0],
                confidence: 0.85 + Math.random() * 0.1,
            };

            setDetectedData(mockResult);
            setConfidence(mockResult.confidence);

        } catch (error) {
            toast.error("Failed to process voice command");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        if (detectedData) {
            onTransactionCreated?.({
                ...detectedData,
                id: Date.now(),
                type: 'expense',
                source: 'voice',
            });
            setIsOpen(false);
            setTranscript('');
            setDetectedData(null);
            toast.success("Transaction added via voice!");
        }
    };

    return (
        <>
            {/* Floating Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className={clsx(
                    "fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-brand-600 text-white shadow-elevated flex items-center justify-center transition-all duration-300 hover:bg-brand-700 hover:scale-110 active:scale-95",
                    isOpen && "translate-y-24 opacity-0 pointer-events-none"
                )}
            >
                <Mic className="w-6 h-6" />
            </button>

            {/* Voice Panel Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-overlay)] backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md mx-4 bg-[var(--color-bg-elevated)] rounded-3xl shadow-modal p-8 text-center animate-scale-in">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!detectedData ? (
                            <div className="py-4">
                                <div className={clsx(
                                    "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white mb-6 transition-all duration-500",
                                    isListening ? "bg-rose-500 animate-pulse-slow shadow-[0_0_30px_rgba(244,63,94,0.4)]" : "bg-brand-600 shadow-soft"
                                )}>
                                    <Mic className={clsx("w-10 h-10", isListening && "animate-pulse")} />
                                </div>

                                <h3 className="text-heading-2 font-bold text-[var(--color-text-primary)] mb-2">
                                    {isListening ? "Listening..." : "Tap to Speak"}
                                </h3>

                                {isListening ? (
                                    <p className="text-body text-[var(--color-text-secondary)] mb-8 min-h-[3rem]">
                                        "{transcript || "Go ahead, I'm listening..."}"
                                    </p>
                                ) : (
                                    <p className="text-caption text-[var(--color-text-tertiary)] mb-8">
                                        Try saying "Lunch at McDonalds for 250"
                                    </p>
                                )}

                                <div className="flex justify-center gap-4">
                                    {isListening ? (
                                        <button
                                            onClick={stopListening}
                                            className="btn-secondary px-8 py-3 rounded-full flex items-center gap-2"
                                        >
                                            <Square className="w-4 h-4 fill-current" /> Stop
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startListening}
                                            className="btn-primary px-8 py-3 rounded-full flex items-center gap-2 shadow-elevated"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> Start
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 animate-fade-in text-left">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="w-12 h-12 rounded-full bg-success-50 dark:bg-success-600/10 flex items-center justify-center">
                                        <Check className="w-6 h-6 text-success-600 dark:text-success-400" />
                                    </div>
                                </div>
                                <h3 className="text-heading-3 font-semibold text-center text-[var(--color-text-primary)] mb-6">
                                    Did I get that right?
                                </h3>

                                <div className="space-y-4 mb-8 bg-[var(--color-bg-secondary)] p-4 rounded-xl">
                                    <div>
                                        <span className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Description</span>
                                        <p className="text-body font-medium text-[var(--color-text-primary)]">{detectedData.description}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <span className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Amount</span>
                                            <p className="text-heading-3 font-bold text-[var(--color-text-primary)]">₹{detectedData.amount}</p>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Date</span>
                                            <p className="text-body font-medium text-[var(--color-text-primary)]">{detectedData.date}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDetectedData(null)}
                                        className="btn-ghost flex-1 text-caption"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="btn-primary flex-1 text-caption flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Confirm
                                    </button>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="absolute inset-0 bg-[var(--color-bg-elevated)]/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl animate-fade-in">
                                <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
                                <p className="text-body font-medium text-[var(--color-text-primary)]">Processing Voice...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
