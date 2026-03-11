import React from 'react'
import BloombergPanelWrapper, { Skeleton, MarketRow } from './BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'
import { useBullMode } from '../../contexts/BullModeContext'

const MarketGrid = ({ globalIndices = [], commodities = [], crypto = [], loading = false }) => {
  const { t } = useLanguage()
  const { bullMode } = useBullMode()

  const applyBull = (items) => bullMode ? items.filter(i => (i.change_percent ?? 0) > 0) : items

  const usIndices  = applyBull(globalIndices.filter(i => i.region === 'US'))
  const globalMkts = applyBull(globalIndices.filter(i => i.region !== 'US'))
  const filteredCommodities = applyBull(commodities)
  const filteredCrypto      = applyBull(crypto)

  const fmtCrypto = (price) => {
    if (!price) return '—'
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#1a3a5c]/30">
      {/* US Equities */}
      <BloombergPanelWrapper title={t('economic.usEquities')} badge="NYSE" className="rounded-none border-0">
        {loading && usIndices.length === 0
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1" />)
          : usIndices.length > 0
            ? usIndices.map(idx => (
                <MarketRow
                  key={idx.symbol}
                  name={idx.name}
                  price={idx.price}
                  changePercent={idx.change_percent}
                />
              ))
            : <p className="text-[10px] text-gray-600 font-mono">{t('economic.noData')}</p>
        }
      </BloombergPanelWrapper>

      {/* Global Markets */}
      <BloombergPanelWrapper title={t('economic.globalMarkets')} badge="INTL" className="rounded-none border-0">
        {loading && globalMkts.length === 0
          ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1" />)
          : globalMkts.length > 0
            ? globalMkts.map(idx => (
                <MarketRow
                  key={idx.symbol}
                  name={idx.name}
                  price={idx.price}
                  changePercent={idx.change_percent}
                />
              ))
            : <p className="text-[10px] text-gray-600 font-mono">{t('economic.noData')}</p>
        }
      </BloombergPanelWrapper>

      {/* Commodities */}
      <BloombergPanelWrapper title={t('economic.commodities')} badge="CME" className="rounded-none border-0">
        {loading && commodities.length === 0
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1" />)
          : filteredCommodities.length > 0
            ? filteredCommodities.map(item => (
                <MarketRow
                  key={item.symbol}
                  name={item.name}
                  price={item.price}
                  changePercent={item.change_percent}
                  unit={item.unit ? ` ${item.unit.split('/')[1] || ''}` : ''}
                />
              ))
            : <p className="text-[10px] text-gray-600 font-mono">{t('economic.noData')}</p>
        }
      </BloombergPanelWrapper>

      {/* Crypto */}
      <BloombergPanelWrapper title={t('economic.crypto')} badge="24H" className="rounded-none border-0">
        {loading && crypto.length === 0
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1" />)
          : filteredCrypto.length > 0
            ? filteredCrypto.map(item => (
                <div key={item.symbol} className="py-1 border-b border-[#1a3a5c]/40 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-mono">{item.symbol}</span>
                    <span className={`text-[10px] font-mono font-bold ${(item.change_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(item.change_percent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(item.change_percent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[13px] font-mono text-white font-bold">
                    ${fmtCrypto(item.price)}
                  </div>
                </div>
              ))
            : <p className="text-[10px] text-gray-600 font-mono">{t('economic.noData')}</p>
        }
      </BloombergPanelWrapper>
    </div>
  )
}

export default MarketGrid
