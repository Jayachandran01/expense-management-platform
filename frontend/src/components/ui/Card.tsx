import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    headerAction?: ReactNode;
    footer?: ReactNode;
    hover?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    className,
    headerAction,
    footer,
    hover = false,
    onClick,
}) => {
    return (
        <div
            className={clsx(
                'card p-6',
                hover && 'hover:shadow-md cursor-pointer transition-shadow duration-200',
                className
            )}
            onClick={onClick}
        >
            {(title || headerAction) && (
                <div className="flex items-center justify-between mb-4">
                    <div>
                        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
                        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                    </div>
                    {headerAction}
                </div>
            )}
            <div>{children}</div>
            {footer && <div className="mt-4 pt-4 border-t border-slate-200">{footer}</div>}
        </div>
    );
};
