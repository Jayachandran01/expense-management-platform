import React from 'react';
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface AlertProps {
    type?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, message, onClose }) => {
    const config = {
        info: {
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
            iconColor: 'text-blue-600',
            Icon: Info,
        },
        success: {
            bgColor: 'bg-green-50',
            textColor: 'text-green-800',
            iconColor: 'text-green-600',
            Icon: CheckCircle,
        },
        warning: {
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-800',
            iconColor: 'text-yellow-600',
            Icon: AlertCircle,
        },
        error: {
            bgColor: 'bg-red-50',
            textColor: 'text-red-800',
            iconColor: 'text-red-600',
            Icon: XCircle,
        },
    };

    const { bgColor, textColor, iconColor, Icon } = config[type];

    return (
        <div className={clsx('rounded-lg p-4', bgColor)}>
            <div className="flex">
                <div className="flex-shrink-0">
                    <Icon className={clsx('h-5 w-5', iconColor)} />
                </div>
                <div className="ml-3 flex-1">
                    {title && <h3 className={clsx('text-sm font-medium', textColor)}>{title}</h3>}
                    <p className={clsx('text-sm', title ? 'mt-1' : '', textColor)}>{message}</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className={clsx('ml-3', textColor, 'hover:opacity-75')}>
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};
