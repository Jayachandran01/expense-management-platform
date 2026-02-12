import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Mail, Lock, TrendingUp } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
    });

    const [registerData, setRegisterData] = useState({
        email: '',
        password: '',
        full_name: '',
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(loginData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(registerData); // Will use register in real implementation
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <TrendingUp className="text-indigo-600" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">FinanceAI</h1>
                    <p className="text-indigo-100">Intelligent Expense Management Platform</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isLogin
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setIsLogin(false);
                                setError('');
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isLogin
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4 mt-6">
                            <Input
                                type="email"
                                label="Email"
                                placeholder="Enter your email"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                icon={<Mail size={20} />}
                                required
                            />
                            <Input
                                type="password"
                                label="Password"
                                placeholder="Enter your password"
                                value={loginData.password}
                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                icon={<Lock size={20} />}
                                required
                            />
                            <Button type="submit" isLoading={loading} className="w-full">
                                Sign In
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4 mt-6">
                            <Input
                                type="text"
                                label="Full Name"
                                placeholder="Enter your full name"
                                value={registerData.full_name}
                                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                                required
                            />
                            <Input
                                type="email"
                                label="Email"
                                placeholder="Enter your email"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                icon={<Mail size={20} />}
                                required
                            />
                            <Input
                                type="password"
                                label="Password"
                                placeholder="Create a password"
                                value={registerData.password}
                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                icon={<Lock size={20} />}
                                required
                            />
                            <Button type="submit" isLoading={loading} className="w-full">
                                Create Account
                            </Button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-white text-sm mt-6">
                    Powered by AI • Secure • Enterprise-Grade
                </p>
            </div>
        </div>
    );
};
