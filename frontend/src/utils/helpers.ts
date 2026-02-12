/**
 * Format currency to INR
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: string | Date): string => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
};

/**
 * Format relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

/**
 * Generate random color for categories
 */
export const generateColor = (): string => {
    const colors = [
        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
        '#10b981', '#06b6d4', '#6366f1', '#f97316',
        '#14b8a6', '#84cc16', '#a855f7', '#ef4444'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Get start and end of month
 */
export const getMonthRange = (date: Date = new Date()): { start: string; end: string } => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: formatDateForInput(start),
        end: formatDateForInput(end),
    };
};

/**
 * Get budget status color
 */
export const getBudgetStatusColor = (status: string): string => {
    switch (status) {
        case 'on_track':
            return 'text-green-600 bg-green-50';
        case 'warning':
            return 'text-yellow-600 bg-yellow-50';
        case 'exceeded':
            return 'text-red-600 bg-red-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
};

/**
 * Download file
 */
export const downloadFile = (data: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Parse amount from OCR text
 */
export const parseAmountFromText = (text: string): number | null => {
    // Match patterns like ₹1,234.56, 1234.56, etc.
    const amountRegex = /₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const matches = text.match(amountRegex);
    if (!matches || matches.length === 0) return null;

    // Get the largest amount (likely the total)
    const amounts = matches.map(match => {
        const cleanAmount = match.replace(/[₹,\s]/g, '');
        return parseFloat(cleanAmount);
    });

    return Math.max(...amounts);
};

/**
 * Parse date from OCR text
 */
export const parseDateFromText = (text: string): string | null => {
    // Match patterns like DD/MM/YYYY, DD-MM-YYYY, etc.
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const match = text.match(dateRegex);
    if (!match) return null;

    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
        year = '20' + year;
    }

    return `${year}-${month}-${day}`;
};
