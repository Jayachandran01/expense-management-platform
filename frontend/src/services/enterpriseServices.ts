import apiClient from '../utils/apiClient';

// Voice service
export const voiceService = {
    processTranscript: (transcript: string) =>
        apiClient.post('/voice/process', { transcript }),

    confirmVoiceEntry: (voiceLogId: string, transactionData: any) =>
        apiClient.post('/voice/confirm', { voice_log_id: voiceLogId, ...transactionData }),
};

// CSV Import service
export const importService = {
    previewCSV: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/imports/csv/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    confirmImport: (importId: string, columnMapping?: any) =>
        apiClient.post(`/imports/csv/confirm/${importId}`, { column_mapping: columnMapping }),

    getImportStatus: (importId: string) =>
        apiClient.get(`/imports/csv/${importId}/status`),
};

// Receipt/OCR service
export const receiptService = {
    uploadReceipt: (file: File) => {
        const formData = new FormData();
        formData.append('receipt', file);
        return apiClient.post('/receipts/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    getReceiptStatus: (receiptId: string) =>
        apiClient.get(`/receipts/${receiptId}`),

    confirmReceipt: (receiptId: string, transactionData: any) =>
        apiClient.post(`/receipts/${receiptId}/confirm`, transactionData),
};

// Insights service
export const insightService = {
    getInsights: (params?: { type?: string; severity?: string; unread?: boolean }) =>
        apiClient.get('/insights', { params }),

    generateInsights: () =>
        apiClient.post('/insights/generate'),

    markRead: (insightId: string) =>
        apiClient.put(`/insights/${insightId}/read`),

    dismiss: (insightId: string) =>
        apiClient.put(`/insights/${insightId}/dismiss`),
};

// Forecast service
export const forecastService = {
    getForecasts: (horizon?: number) =>
        apiClient.get('/insights/forecasts', { params: { horizon } }),

    getCategoryForecast: (categoryId: number) =>
        apiClient.get(`/insights/forecasts/category/${categoryId}`),
};

// Audit log service
export const auditService = {
    getLogs: (params?: any) =>
        apiClient.get('/audit-logs', { params }),

    getMyLogs: (params?: any) =>
        apiClient.get('/audit-logs/my', { params }),
};
