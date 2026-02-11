import { useState, useEffect } from 'react'
import apiService from '../../services/api'

function PopularStockCard({ stock, priceData, onClick }) {
    const loading = !priceData

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all duration-200 h-full flex flex-col justify-between"
        >
            <div>
                <div className="flex justify-between items-start mb-1">
                    <div className="text-sm font-bold text-white tracking-wider">{stock.symbol}</div>
                    {stock.yield && (
                        <div className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                            배당 {stock.yield}
                        </div>
                    )}
                </div>
                <div className="text-xs text-gray-400 mb-3 truncate">{stock.name}</div>
            </div>

            {loading ? (
                <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : priceData ? (
                <div>
                    <div className="text-lg font-bold text-white tracking-tight">
                        ${priceData.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-bold flex items-center gap-1 ${priceData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <span>{priceData.change >= 0 ? '▲' : '▼'}</span>
                        <span>{Math.abs(priceData.changePercent || 0).toFixed(2)}%</span>
                    </div>
                </div>
            ) : (
                <div className="text-xs text-gray-500 mt-auto">데이터 없음</div>
            )}
        </div>
    )
}

export default PopularStockCard
