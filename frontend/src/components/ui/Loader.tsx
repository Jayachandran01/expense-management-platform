import React from 'react';

export const Loader: React.FC<{ size?: 'sm' | 'md' | 'lg'; fullScreen?: boolean }> = ({
    size = 'md',
    fullScreen = false,
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const loader = (
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600`} />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                {loader}
            </div>
        );
    }

    return <div className="flex items-center justify-center p-4">{loader}</div>;
};
