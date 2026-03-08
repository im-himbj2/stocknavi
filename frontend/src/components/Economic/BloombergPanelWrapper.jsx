import React from 'react'

const BloombergPanelWrapper = ({ title, badge, children, className = '' }) => {
  return (
    <div
      className={`bg-[#0d1b2a] border border-[#1a3a5c] rounded-sm overflow-hidden ${className}`}
      style={{ boxShadow: '0 0 0 1px rgba(0,112,204,0.1), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <div className="bg-[#0a1929] border-b border-[#1a3a5c] px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-[#5ba4d4] uppercase font-mono">{title}</span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[#0070cc]/20 text-[#0070cc] tracking-wider font-mono">
            {badge}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

export const Skeleton = ({ className = '' }) => (
  <div className={`bg-[#1a3a5c]/40 animate-pulse rounded ${className}`} />
)

export const MarketRow = ({ name, price, changePercent, unit = '', decimals = 2 }) => {
  const isPos = (changePercent ?? 0) >= 0
  const fmtPrice = (n) => {
    if (n == null) return '—'
    if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    if (n >= 100) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#1a3a5c]/40 last:border-0">
      <span className="text-[11px] text-gray-400 font-mono truncate flex-1 mr-2">{name}</span>
      <span className="text-[12px] font-mono text-white font-bold mr-2">{fmtPrice(price)}{unit && <span className="text-[9px] text-gray-500 ml-0.5">{unit}</span>}</span>
      <span className={`text-[10px] font-mono font-bold w-14 text-right ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '▲' : '▼'}{Math.abs(changePercent ?? 0).toFixed(2)}%
      </span>
    </div>
  )
}

export default BloombergPanelWrapper
