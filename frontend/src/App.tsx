import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GroupsPage } from './pages/GroupsPage';
import { AssistantPage } from './pages/AssistantPage';
import { ImportsPage } from './pages/ImportsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="transactions" element={<TransactionsPage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="budgets" element={<BudgetsPage />} />
                        <Route path="groups" element={<GroupsPage />} />
                        <Route path="assistant" element={<AssistantPage />} />
                        <Route path="imports" element={<ImportsPage />} />
                        <Route path="receipts" element={<ReceiptsPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
