import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import { getSubscriptionStatus } from '../utils/subscription'
import { majorStocks } from '../data/stockList'
import { useLanguage } from '../contexts/LanguageContext'

function Portfolio() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [portfolioItems, setPortfolioItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [stockPrices, setStockPrices] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [usdKrwRate, setUsdKrwRate] = useState(1400)
  const searchRef = useRef(null)

  const [formData, setFormData] = useState({
    symbol: '', quantity: '', averagePrice: '', notes: ''
  })

  const fetchPortfolio = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await apiService.getPortfolio()
      setPortfolioItems(items)
      if (items.length > 0) await fetchStockPrices(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStockPrices = async (items) => {
    if (!items || items.length === 0) return
    try {
      const symbols = items.map(item => item.symbol.match(/^\d+$/) ? `${item.symbol}.KS` : item.symbol)
      const response = await apiService.getPortfolioPrices(symbols)
      // Support both new {prices, usd_krw_rate} format and legacy flat map
      const rawPrices = response?.prices || response
      const rate = response?.usd_krw_rate
      if (rate) setUsdKrwRate(rate)
      const priceMap = {}
      items.forEach(item => {
        const fullSymbol = item.symbol.match(/^\d+$/) ? `${item.symbol}.KS` : item.symbol
        const priceData = rawPrices[fullSymbol] || rawPrices[item.symbol]
        priceMap[item.symbol] = {
          price: priceData?.price || item.average_price,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0,
          currency: priceData?.currency || (isKR(item.symbol) ? 'KRW' : 'USD')
        }
      })
      setStockPrices(priceMap)
    } catch (err) {
      console.error('Price fetch error:', err)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!formData.symbol || !formData.quantity || !formData.averagePrice) {
      setError(t('portfolio.errorRequired')); return
    }
    setLoading(true); setError(null)
    try {
      const newItem = await apiService.addPortfolioItem(formData.symbol, formData.quantity, formData.averagePrice, formData.notes)
      const updated = [...portfolioItems, newItem]
      setPortfolioItems(updated)
      await fetchStockPrices(updated)
      setFormData({ symbol: '', quantity: '', averagePrice: '', notes: '' })
      setShowAddForm(false)
    } catch (err) {
      setError(err.message || t('portfolio.errorAdd'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm(t('portfolio.deleteConfirm'))) return
    try {
      await apiService.deletePortfolioItem(itemId)
      await fetchPortfolio()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (formData.symbol.trim()) {
      const filtered = majorStocks.filter(s =>
        s.symbol.toLowerCase().includes(formData.symbol.toLowerCase()) ||
        s.name.toLowerCase().includes(formData.symbol.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([]); setShowSuggestions(false)
    }
  }, [formData.symbol])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getSubscriptionStatus()
        setIsPremium(status.is_active && status.tier === 'premium')
      } catch { setIsPremium(false) }
      fetchPortfolio()
    }
    init()
  }, [])

  useEffect(() => {
    if (portfolioItems.length > 0) {
      const timer = setInterval(() => fetchStockPrices(portfolioItems), 60000)
      return () => clearInterval(timer)
    }
  }, [portfolioItems])

  // Computations
  const isKR = (sym) => sym?.match(/^\d+$/) !== null

  // Convert a value in item's native currency to USD
  const toUsd = (item, value) => {
    const currency = stockPrices[item.symbol]?.currency || (isKR(item.symbol) ? 'KRW' : 'USD')
    return currency === 'KRW' ? value / usdKrwRate : value
  }

  const calcProfit = (item) => {
    const priceData = stockPrices[item.symbol]
    const price = priceData?.price
    const currency = priceData?.currency || (isKR(item.symbol) ? 'KRW' : 'USD')
    const cost = item.average_price * item.quantity
    if (!price || price <= 0) return { profit: 0, profitPercent: 0, totalValue: cost, cost, price: item.average_price, currency }
    const totalValue = price * item.quantity
    const profit = totalValue - cost
    return { profit, profitPercent: cost > 0 ? (profit / cost) * 100 : 0, totalValue, cost, price, currency }
  }

  // 대주주 요건 체크 (2025 기준: 보유금액 10억원 이상)
  const MAJOR_HOLDER_THRESHOLD_KRW = 1_000_000_000  // 10억원
  const checkMajorHolder = (item) => {
    if (!isKR(item.symbol)) return false
    const { totalValue: tv } = calcProfit(item)
    return tv >= MAJOR_HOLDER_THRESHOLD_KRW
  }
  const majorHolderItems = portfolioItems.filter(checkMajorHolder)

  // 양도세 계산기로 이동 (포트폴리오 항목 데이터 프리필)
  const goToTaxSim = (item) => {
    const { price } = calcProfit(item)
    const isMajor = checkMajorHolder(item)
    const params = new URLSearchParams({
      symbol: item.symbol,
      qty: item.quantity,
      buyPrice: item.average_price,
      currentPrice: price || item.average_price,
      stockType: isMajor ? 'domestic_major' : 'domestic_small',
    })
    navigate(`/tax?${params.toString()}`)
  }

  // All totals in USD
  const totalValue = portfolioItems.reduce((s, i) => s + toUsd(i, calcProfit(i).totalValue), 0)
  const totalCost = portfolioItems.reduce((s, i) => s + toUsd(i, calcProfit(i).cost), 0)
  const totalProfit = totalValue - totalCost
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  const dailyPL = portfolioItems.reduce((s, item) => {
    const priceData = stockPrices[item.symbol]
    if (!priceData) return s
    return s + toUsd(item, (priceData.change || 0) * item.quantity)
  }, 0)

  const hasKrStocks = portfolioItems.some(i => isKR(i.symbol))

  // Sector allocation (simplified by first letter / known sectors)
  const SECTOR_COLORS = { Tech: '#00498C', Finance: '#10b981', Health: '#8b5cf6', Energy: '#f59e0b', Consumer: '#ef4444' }
  const STOCK_COLORS = ['#00498C', '#00498C', '#00498C', '#10b981', '#8b5cf6']

  // Compute stock weights for bar chart
  const stockWeights = portfolioItems.map((item, i) => ({
    symbol: item.symbol,
    pct: totalValue > 0 ? (calcProfit(item).totalValue / totalValue) * 100 : 0,
    color: STOCK_COLORS[i % STOCK_COLORS.length],
    opacity: Math.max(0.4, 1 - i * 0.15)
  })).sort((a, b) => b.pct - a.pct).slice(0, 5)

  const fmt = (v, sym) => isKR(sym)
    ? `₩${Math.round(v).toLocaleString()}`
    : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fmtUsd = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Concentration risk
  const maxWeight = stockWeights[0]?.pct || 0
  const hasConcenRisk = maxWeight > 30

  // 국장·미장 분리 수익률 비교
  const krItems = portfolioItems.filter(i => isKR(i.symbol))
  const usItems = portfolioItems.filter(i => !isKR(i.symbol))

  const calcGroupStats = (items) => {
    if (items.length === 0) return null
    const totalVal = items.reduce((s, i) => {
      const { totalValue: tv } = calcProfit(i)
      const currency = stockPrices[i.symbol]?.currency || 'USD'
      return s + (currency === 'KRW' ? tv / usdKrwRate : tv)
    }, 0)
    const totalCostVal = items.reduce((s, i) => {
      const { cost } = calcProfit(i)
      const currency = stockPrices[i.symbol]?.currency || 'USD'
      return s + (currency === 'KRW' ? cost / usdKrwRate : cost)
    }, 0)
    const profit = totalVal - totalCostVal
    const pct = totalCostVal > 0 ? (profit / totalCostVal) * 100 : 0
    return { totalVal, totalCostVal, profit, pct, count: items.length }
  }

  const krStats = calcGroupStats(krItems)
  const usStats = calcGroupStats(usItems)
  const hasBothMarkets = krStats && usStats

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">
      <main className="px-6 py-8 max-w-[1440px] mx-auto w-full flex gap-8">

        {/* Left Column: Portfolio Data */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-bold font-headline leading-tight text-on-surface">{t('portfolio.title')}</h1>
              <button
                onClick={() => fetchStockPrices(portfolioItems)}
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </button>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 rounded-full h-10 px-5 bg-primary-container hover:opacity-90 transition-all text-on-primary-container text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('portfolio.addAsset')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-sm">{error}</div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
              <h3 className="text-base font-bold font-headline mb-4">{t('portfolio.addPosition')}</h3>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative" ref={searchRef}>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder={t('portfolio.symbolPlaceholder')}
                    className="w-full h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                    required
                  />
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden shadow-2xl">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setFormData({ ...formData, symbol: s.symbol }); setShowSuggestions(false) }}
                          className="px-4 py-2.5 hover:bg-surface-container-high cursor-pointer text-xs flex justify-between">
                          <span className="text-on-surface font-bold">{s.symbol}</span>
                          <span className="text-on-surface-variant">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" step="0.01" value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={t('portfolio.qtyPlaceholder')} required
                  className="h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary" />
                <input type="number" step="0.01" value={formData.averagePrice}
                  onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
                  placeholder={t('portfolio.costPlaceholder')} required
                  className="h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary" />
                <button type="submit" disabled={loading}
                  className="h-10 bg-primary-container hover:opacity-90 text-on-primary-container font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                  {loading ? t('portfolio.saving') : t('portfolio.save')}
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {loading && portfolioItems.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}

          {/* Hero Stats — Robinhood style */}
          <section className="py-2">
            {hasKrStocks && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/15 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-[11px] font-bold text-on-surface-variant">
                  USD/KRW {usdKrwRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} · 실시간
                </span>
              </div>
            )}
            <p className="text-sm text-on-surface-variant mb-1">Total Balance</p>
            <h2 className="text-[52px] font-black font-headline text-on-surface tracking-tighter leading-none">{fmtUsd(totalValue)}</h2>
            <div className="flex items-baseline gap-3 mt-3">
              <span className={`font-bold font-headline text-lg ${totalProfit >= 0 ? 'text-secondary' : 'text-error'}`}>
                {totalProfit >= 0 ? '+' : ''}{fmtUsd(totalProfit)} ({totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%) 전체
              </span>
              <span className={`text-sm font-medium ${dailyPL >= 0 ? 'text-secondary/70' : 'text-error/70'}`}>
                {dailyPL >= 0 ? '+' : ''}{fmtUsd(dailyPL)} 오늘
              </span>
            </div>
          </section>

          {/* Asset Allocation */}
          {portfolioItems.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold font-headline text-on-surface">{t('portfolio.allocation')}</h2>
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
                <p className="text-xs font-bold text-on-surface-variant/60 mb-3 uppercase tracking-wider">{t('portfolio.allocationSub')}</p>
                {/* Stacked horizontal bar */}
                <div className="h-3 rounded-full overflow-hidden flex mb-4">
                  {stockWeights.map(({ symbol, pct, color }, i) => (
                    <div key={i} title={`${symbol}: ${pct.toFixed(1)}%`}
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 + i * 0.06 }}></div>
                  ))}
                </div>
                <div className="grid gap-x-4 gap-y-2.5 items-center" style={{ gridTemplateColumns: '70px 1fr 40px' }}>
                  {stockWeights.map(({ symbol, pct, color }, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.7 + i * 0.06 }}></span>
                        <p className="text-on-surface text-sm font-medium truncate">{symbol}</p>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}></div>
                      </div>
                      <p className="text-on-surface-variant text-xs text-right">{pct.toFixed(0)}%</p>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 국장·미장 통합 수익률 비교 */}
          {hasBothMarkets && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold font-headline text-on-surface">국장 · 미장 수익률 비교</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 국내주식 */}
                <div className="rounded-2xl border-l-4 border-error/50 bg-surface-container-low p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 opacity-5">
                    <span className="material-symbols-outlined text-5xl">south</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">🇰🇷 국내 주식 KR</p>
                    <span className="text-xs text-on-surface-variant">{krStats.count}종목</span>
                  </div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">{fmtUsd(krStats.totalVal)}</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">₩{Math.round(krStats.totalVal * usdKrwRate).toLocaleString()}</p>
                  <div className={`flex items-center gap-1 text-sm font-bold mt-3 ${krStats.pct >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[16px]">{krStats.pct >= 0 ? 'trending_up' : 'trending_down'}</span>
                    <span>{krStats.pct >= 0 ? '+' : ''}{krStats.pct.toFixed(2)}%</span>
                    <span className="font-normal text-xs ml-1 text-on-surface-variant">({krStats.profit >= 0 ? '+' : ''}{fmtUsd(krStats.profit)})</span>
                  </div>
                </div>

                {/* 미국주식 */}
                <div className="rounded-2xl border-l-4 border-primary-container bg-surface-container-low p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 opacity-5">
                    <span className="material-symbols-outlined text-5xl">public</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">🇺🇸 미국 주식 US</p>
                    <span className="text-xs text-on-surface-variant">{usStats.count}종목</span>
                  </div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">{fmtUsd(usStats.totalVal)}</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">₩{Math.round(usStats.totalVal * usdKrwRate).toLocaleString()}</p>
                  <div className={`flex items-center gap-1 text-sm font-bold mt-3 ${usStats.pct >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[16px]">{usStats.pct >= 0 ? 'trending_up' : 'trending_down'}</span>
                    <span>{usStats.pct >= 0 ? '+' : ''}{usStats.pct.toFixed(2)}%</span>
                    <span className="font-normal text-xs ml-1 text-on-surface-variant">({usStats.profit >= 0 ? '+' : ''}{fmtUsd(usStats.profit)})</span>
                  </div>
                </div>
              </div>

              {/* 비교 배너 */}
              <div className="rounded-2xl bg-surface-container p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#a5c8ff]">compare_arrows</span>
                  <span className="text-sm font-medium text-on-surface">
                    <span className={`font-bold ${usStats.pct > krStats.pct ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      🇺🇸 미국 {usStats.pct >= 0 ? '+' : ''}{usStats.pct.toFixed(2)}%
                    </span>
                    <span className="text-on-surface-variant mx-2">vs</span>
                    <span className={`font-bold ${krStats.pct >= usStats.pct ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      🇰🇷 국내 {krStats.pct >= 0 ? '+' : ''}{krStats.pct.toFixed(2)}%
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-black text-[#a5c8ff]/60 uppercase tracking-widest">
                  USD · ₩{usdKrwRate.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Holdings List — Stitch Robinhood style */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-lg font-bold font-headline text-on-surface">
                {t('portfolio.holdings')} <span className="text-[#a5c8ff] ml-1">{portfolioItems.length} positions</span>
              </h2>
            </div>
            {portfolioItems.length > 0 ? (
              <div className="space-y-3">
                {portfolioItems.map((item) => {
                  const { profit, profitPercent, totalValue: tv, price, currency } = calcProfit(item)
                  const kr = currency === 'KRW'
                  return (
                    <div key={item.id} className="group flex items-center p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center font-black text-xs text-on-surface shrink-0 border border-outline-variant/10">
                        {item.symbol.slice(0, 4)}
                      </div>
                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-on-surface">{item.symbol}</h4>
                          {checkMajorHolder(item) && (
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">대주주</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">{fmt(price, item.symbol)} {item.notes ? `· ${item.notes}` : ''}</p>
                      </div>
                      {/* Profit % */}
                      <div className="text-right mr-4">
                        <p className={`text-sm font-black ${profit >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                        </p>
                        <p className="text-xs text-on-surface-variant">수익률</p>
                      </div>
                      {/* Total value */}
                      <div className="text-right mr-2">
                        <p className="font-bold text-on-surface">{fmt(tv, item.symbol)}</p>
                        {kr && <p className="text-[10px] text-on-surface-variant">≈ {fmtUsd(tv / usdKrwRate)}</p>}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isKR(item.symbol) && (
                          <button onClick={() => goToTaxSim(item)}
                            className="bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-black px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">receipt</span>
                            양도세
                          </button>
                        )}
                        <button onClick={() => handleDeleteItem(item.id)}
                          className="text-on-surface-variant hover:text-error transition-colors p-1">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              !loading && (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container p-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">account_balance_wallet</span>
                  <h3 className="text-lg font-bold font-headline mb-2">{t('portfolio.emptyTitle')}</h3>
                  <p className="text-on-surface-variant text-sm">{t('portfolio.emptyDesc')}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Sidebar: Risk Panel */}
        <div className="w-[320px] shrink-0 flex flex-col gap-5">
          <h3 className="text-xs font-black font-headline text-on-surface-variant uppercase tracking-[0.2em] px-1">{t('portfolio.riskTitle')}</h3>

          {/* Volatility info */}
          {portfolioItems.length === 0 && (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/10 text-sm text-on-surface-variant">
              {t('portfolio.emptyRisk')}
            </div>
          )}

          {/* Concentration Risk */}
          {portfolioItems.length > 0 && hasConcenRisk && (
            <div className="p-5 rounded-2xl bg-error/5 border border-error/20 flex gap-4">
              <span className="material-symbols-outlined text-error mt-0.5">pie_chart</span>
              <div>
                <p className="text-sm font-bold text-error mb-1">{t('portfolio.concentration')}</p>
                <p className="text-xs text-error/70 leading-relaxed">
                  {stockWeights[0]?.symbol}이 포트폴리오의 {stockWeights[0]?.pct.toFixed(0)}%를 차지합니다. 분산 투자를 권장합니다.
                </p>
              </div>
            </div>
          )}

          {/* Major Holder Warning */}
          {majorHolderItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
              <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-200 mb-1">세금 주의보</p>
                <p className="text-xs text-amber-100/70 leading-relaxed mb-3">
                  {majorHolderItems.map(i => i.symbol).join(', ')} 보유금액 10억원 초과. 연말 매도 시 양도세 20~25% 적용 대상입니다.
                </p>
                <button onClick={() => goToTaxSim(majorHolderItems[0])}
                  className="text-xs px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors font-bold">
                  양도세 시뮬레이터 →
                </button>
              </div>
            </div>
          )}

          {/* Liquidity */}
          {portfolioItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-secondary/5 border border-secondary/20 flex gap-4">
              <span className="material-symbols-outlined text-secondary mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-bold text-secondary mb-1">{t('portfolio.liquidity')}</p>
                <p className="text-xs text-secondary/70 leading-relaxed">{t('portfolio.liquidityGood')}</p>
              </div>
            </div>
          )}

          {/* Profit summary */}
          {portfolioItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-on-surface">{t('portfolio.totalReturn')}</span>
                <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-secondary' : 'text-error'}`}>
                  {totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%
                </span>
              </div>
              <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${totalProfit >= 0 ? 'bg-secondary' : 'bg-error'}`}
                  style={{ width: `${Math.min(Math.abs(totalProfitPct), 100)}%` }}></div>
              </div>
            </div>
          )}

          {/* Premium Banner */}
          {!isPremium && (
            <div className="relative group cursor-pointer overflow-hidden rounded-3xl p-7 bg-gradient-to-br from-primary-container to-[#00315e] border border-white/10">
              <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
              <div className="relative z-10 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest">Premium Tier</span>
                <div>
                  <h4 className="text-xl font-black text-white font-headline leading-tight">{t('portfolio.premiumTitle')}</h4>
                  <p className="mt-2 text-sm text-primary-fixed/80 font-medium">{t('portfolio.premiumDesc')}</p>
                </div>
                <Link to="/subscription"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-primary-container rounded-xl font-bold text-sm hover:shadow-xl transition-all">
                  {t('portfolio.upgradeNow')}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Portfolio
