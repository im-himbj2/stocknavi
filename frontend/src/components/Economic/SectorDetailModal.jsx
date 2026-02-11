import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function SectorDetailModal({ sector, onClose }) {
    if (!sector) return null

    // 가상의 섹터 상세 데이터 (실제 API 연동 시 교체 필요)
    const chartData = [
        { date: '1M', value: 100 },
        { date: '2M', value: 100 + (sector.changesPercentage ? parseFloat(sector.changesPercentage) * 0.5 : 0) },
        { date: '3M', value: 100 + (sector.changesPercentage ? parseFloat(sector.changesPercentage) : 0) },
    ]

    // 섹터별 대표 종목 매핑 (예시)
    const sectorStocks = {
        'Technology': ['AAPL', 'MSFT', 'NVDA', 'ADBE', 'CRM'],
        'Financial Services': ['JPM', 'BAC', 'V', 'MA', 'GS'],
        'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'LLY'],
        'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
        'Industrials': ['CAT', 'HON', 'UPS', 'GE', 'LMT'],
        'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'TMUS'],
        'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'COST'],
        'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB'],
        'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP'],
        'Real Estate': ['PLD', 'AMT', 'CCI', 'SPG', 'PSA'],
        'Basic Materials': ['LIN', 'APD', 'SHW', 'NEM', 'FCX']
    }

    const topStocks = sectorStocks[sector.sector] || []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-gray-900 bg-opacity-95 backdrop-blur z-10">
                    <div>
                        <h3 className="text-2xl font-bold text-white">{sector.sector}</h3>
                        <p className={`text-lg font-semibold ${parseFloat(sector.changesPercentage) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(sector.changesPercentage) >= 0 ? '+' : ''}{parseFloat(sector.changesPercentage).toFixed(2)}%
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* 섹터 설명 (예시) */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Sector Performance</h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    <XAxis dataKey="date" stroke="#ffffff50" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#ffffff50" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                        itemStyle={{ color: '#f3f4f6' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={parseFloat(sector.changesPercentage) >= 0 ? '#4ade80' : '#f87171'}
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 주요 종목 */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Top Stocks in {sector.sector}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {topStocks.map(symbol => (
                                <div key={symbol} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer text-center">
                                    <div className="text-white font-bold text-lg mb-1">{symbol}</div>
                                    <div className="text-xs text-gray-400">View Analysis &rarr;</div>
                                </div>
                            ))}
                            {topStocks.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-4">
                                    주요 종목 정보가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SectorDetailModal
