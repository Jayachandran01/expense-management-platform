import React, { useEffect, useState } from 'react';
import { forecastService } from '../services/enterpriseServices';

const ForecastChart: React.FC = () => {
    const [forecast, setForecast] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const { data } = await forecastService.getForecasts(3);
                setForecast(data.data.forecast);
            } catch (err: any) {
                setError(err.response?.data?.error?.message || 'Forecast unavailable');
            } finally {
                setLoading(false);
            }
        };
        fetchForecast();
    }, []);

    if (loading) return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 animate-pulse">
            <div className="h-5 bg-slate-700 rounded w-1/3 mb-4" />
            <div className="h-32 bg-slate-700 rounded" />
        </div>
    );

    if (error || !forecast?.forecast?.length) return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">📈 Spending Forecast</h3>
            <p className="text-slate-400 text-sm">{error || 'Need more transaction history for forecasting'}</p>
        </div>
    );

    const forecasts = forecast.forecast || forecast;
    const maxValue = Math.max(...forecasts.map((f: any) => f.upper || f.predicted));

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-100">📈 Spending Forecast</h3>
                    {forecast.metrics && forecast.metrics.mape && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">
                            Accuracy: ±{forecast.metrics.mape}% MAPE
                        </span>
                    )}
                </div>

                {/* Chart */}
                <div className="space-y-4">
                    {forecasts.map((f: any, i: number) => {
                        const barWidth = maxValue > 0 ? (f.predicted / maxValue * 100) : 0;
                        const lowerWidth = maxValue > 0 ? (f.lower / maxValue * 100) : 0;
                        const upperWidth = maxValue > 0 ? (f.upper / maxValue * 100) : 0;

                        return (
                            <div key={i} className="group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-slate-400 font-medium">
                                        {new Date(f.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-200">
                                        ₹{f.predicted.toLocaleString()}
                                    </span>
                                </div>

                                {/* Confidence range bar */}
                                <div className="relative h-6 bg-slate-700 rounded-lg overflow-hidden">
                                    {/* Confidence range background */}
                                    <div
                                        className="absolute top-0 h-full bg-indigo-500/15 rounded-lg transition-all duration-700"
                                        style={{ left: `${lowerWidth}%`, width: `${upperWidth - lowerWidth}%` }}
                                    />
                                    {/* Predicted value bar */}
                                    <div
                                        className="absolute top-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-lg transition-all duration-700 group-hover:from-indigo-500 group-hover:to-indigo-300"
                                        style={{ width: `${barWidth}%`, animationDelay: `${i * 200}ms` }}
                                    />
                                </div>

                                <div className="flex justify-between mt-1">
                                    <span className="text-xs text-slate-600">₹{f.lower.toLocaleString()}</span>
                                    <span className={`text-xs font-medium ${f.confidence >= 0.8 ? 'text-emerald-500' : f.confidence >= 0.6 ? 'text-amber-500' : 'text-rose-500'
                                        }`}>
                                        {Math.round(f.confidence * 100)}% confidence
                                    </span>
                                    <span className="text-xs text-slate-600">₹{f.upper.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-500 rounded" />
                        <span>Predicted</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-500/20 rounded" />
                        <span>Confidence Range</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForecastChart;
