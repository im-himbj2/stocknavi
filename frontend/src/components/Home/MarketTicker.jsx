import React, { useState, useEffect } from 'react'
import apiService from '../../services/api'

const MarketTicker = () => {
    const [indices, setIndices] = useState([])

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                const data = await apiService.getMarketIndices()
                if (data && data.data) {
                    setIndices(data.data)
                }
            } catch (err) {
                console.error('Ticker data fetch failed:', err)
            }
        }
        fetchIndices()
        const interval = setInterval(fetchIndices, 60000)
        return () => clearInterval(interval)
    }, [])

    // 무한 롤링을 위해 복제
    const tickerItems = [...indices, ...indices]

    return (
        <div className="w-full bg-white/[0.02] backdrop-blur-xl border-b border-white/5 py-3 overflow-hidden whitespace-nowrap relative z-30">
            <div className="flex animate-ticker">
                {tickerItems.length > 0 ? (
                    tickerItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 px-8 border-r border-white/10">
                            <span className="text-gray-400 text-xs font-black tracking-tighter uppercase">{item.symbol}</span>
                            <span className="text-white text-sm font-black">
                                {item.price?.toLocaleString()}
                            </span>
                            <span className={`text-[10px] font-black ${parseFloat(item.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {parseFloat(item.changePercent) >= 0 ? '▲' : '▼'}{Math.abs(item.changePercent).toFixed(2)}%
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="px-8 text-gray-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Connecting to global markets...
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
        </div>
    )
}

export default MarketTicker
