import React from 'react';
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../store/appStore';

export const ConfirmModal: React.FC = () => {
    const { confirmModal, closeConfirmModal } = useAppStore();

    if (!confirmModal?.open) return null;

    const iconMap = {
        danger: <Trash2 className="w-6 h-6 text-danger-500" />,
        warning: <AlertTriangle className="w-6 h-6 text-warning-500" />,
        primary: <AlertCircle className="w-6 h-6 text-brand-500" />,
    };

    const buttonClasses = {
        danger: 'bg-danger-600 hover:bg-danger-700 text-white focus:ring-danger-500/40',
        warning: 'bg-warning-600 hover:bg-warning-700 text-white focus:ring-warning-500/40',
        primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500/40',
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
                onClick={closeConfirmModal}
            />
            <div className="relative w-full max-w-md mx-4 rounded-2xl shadow-modal border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-6 animate-scale-in">
                <div className="flex items-start gap-4">
                    <div className={clsx(
                        'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                        confirmModal.variant === 'danger' && 'bg-danger-50 dark:bg-danger-600/10',
                        confirmModal.variant === 'warning' && 'bg-warning-50 dark:bg-warning-600/10',
                        confirmModal.variant === 'primary' && 'bg-brand-50 dark:bg-brand-600/10',
                    )}>
                        {iconMap[confirmModal.variant]}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-heading-3 font-semibold text-[var(--color-text-primary)]">
                            {confirmModal.title}
                        </h3>
                        <p className="text-body text-[var(--color-text-secondary)] mt-1">
                            {confirmModal.message}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={closeConfirmModal}
                        className="btn-secondary px-4 py-2.5 rounded-xl text-body font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            confirmModal.onConfirm();
                            closeConfirmModal();
                        }}
                        className={clsx(
                            'px-4 py-2.5 rounded-xl text-body font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
                            buttonClasses[confirmModal.variant]
                        )}
                    >
                        {confirmModal.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
