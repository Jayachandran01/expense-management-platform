import React from 'react';
import clsx from 'clsx';

interface Badge props {
    children: React.ReactNode;
    variant ?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size ?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
    const variantClasses = {
        default: 'bg-slate-100 text-slate-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center font-medium rounded-full',
                variantClasses[variant],
                sizeClasses[size]
            )}
        >
            {children}
        </span>
    );
};
