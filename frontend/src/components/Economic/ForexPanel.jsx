import React from 'react'
import BloombergPanelWrapper, { Skeleton } from './BloombergPanelWrapper'

const ForexPanel = ({ forex = [], loading = false }) => {
  const dxy = forex.find(f => f.symbol === 'DXY')
  const pairs = forex.filter(f => f.symbol !== 'DXY')

  const fmtRate = (rate, symbol) => {
    if (!rate) return '—'
    if (symbol === 'USD/KRW') return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (symbol === 'USD/JPY') return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return rate.toFixed(4)
  }

  return (
    <BloombergPanelWrapper title="FX Rates" badge="FOREX">
      {loading
        ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1" />)
        : (
          <>
            {/* DXY highlight */}
            {dxy && (
              <div className="mb-2 pb-2 border-b border-[#1a3a5c]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#5ba4d4] uppercase tracking-widest">DXY Index</span>
                  <span className={`text-[9px] font-mono font-bold ${(dxy.change_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(dxy.change_percent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(dxy.change_percent ?? 0).toFixed(3)}%
                  </span>
                </div>
                <p className="text-[18px] font-mono font-bold text-white">{dxy.rate?.toFixed(2)}</p>
              </div>
            )}
            {/* Pairs */}
            {pairs.length > 0
              ? pairs.map(item => (
                  <div key={item.symbol} className="flex items-center justify-between py-1 border-b border-[#1a3a5c]/40 last:border-0">
                    <span className="text-[11px] font-mono text-gray-400 w-20">{item.symbol}</span>
                    <span className="text-[12px] font-mono text-white font-bold flex-1 text-right mr-2">
                      {fmtRate(item.rate, item.symbol)}
                    </span>
                    <span className={`text-[10px] font-mono font-bold w-14 text-right ${(item.change_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(item.change_percent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(item.change_percent ?? 0).toFixed(3)}%
                    </span>
                  </div>
                ))
              : <p className="text-[10px] text-gray-600 font-mono">No FX data</p>
            }
          </>
        )
      }
    </BloombergPanelWrapper>
  )
}

export default ForexPanel
