import React from 'react';

export const Skeleton: React.FC<{ className?: string; count?: number }> = ({
    className = '',
    count = 1,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`animate-pulse bg-slate-200 rounded ${className}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                />
            ))}
        </>
    );
};

export const SkeletonCard: React.FC = () => (
    <div className="card p-6 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-10 w-1/4" />
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
        ))}
    </div>
);
