import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { getSubscriptionStatus } from '../utils/subscription'
import { majorStocks } from '../data/stockList'

function Portfolio() {
  const [portfolioItems, setPortfolioItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [stockPrices, setStockPrices] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
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
      const priceMapRaw = await apiService.getPortfolioPrices(symbols)
      const priceMap = {}
      items.forEach(item => {
        const fullSymbol = item.symbol.match(/^\d+$/) ? `${item.symbol}.KS` : item.symbol
        const priceData = priceMapRaw[fullSymbol] || priceMapRaw[item.symbol]
        priceMap[item.symbol] = {
          price: priceData?.price || item.average_price,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0
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
      setError('모든 필수 항목을 입력해주세요.'); return
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
      setError(err.message || '종목 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('이 종목을 포트폴리오에서 삭제하시겠습니까?')) return
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

  const calcProfit = (item) => {
    const price = stockPrices[item.symbol]?.price
    const cost = item.average_price * item.quantity
    if (!price || price <= 0) return { profit: 0, profitPercent: 0, totalValue: cost, cost, price: item.average_price }
    const totalValue = price * item.quantity
    const profit = totalValue - cost
    return { profit, profitPercent: cost > 0 ? (profit / cost) * 100 : 0, totalValue, cost, price }
  }

  const totalValue = portfolioItems.reduce((s, i) => s + calcProfit(i).totalValue, 0)
  const totalCost = portfolioItems.reduce((s, i) => s + calcProfit(i).cost, 0)
  const totalProfit = totalValue - totalCost
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  const dailyPL = portfolioItems.reduce((s, item) => {
    const price = stockPrices[item.symbol]
    if (!price) return s
    return s + (price.change || 0) * item.quantity
  }, 0)

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

  // Concentration risk
  const maxWeight = stockWeights[0]?.pct || 0
  const hasConcenRisk = maxWeight > 30

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 font-display">
      <main className="flex-1 px-6 py-8 max-w-[1440px] mx-auto w-full flex gap-6">

        {/* Left Column: Portfolio Data */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] font-bold leading-tight">Asset Portfolio &amp; Risk Management</h1>
              <p className="text-text-muted text-sm">Real-time asset value, allocation breakdown, and risk analysis</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchStockPrices(portfolioItems)}
                className="flex items-center gap-2 rounded-lg h-9 px-4 bg-surface-dark border border-surface-dark-border hover:bg-surface-dark-border transition-colors text-slate-100 text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh Data
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 rounded-lg h-9 px-4 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Asset
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">{error}</div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="rounded-xl border border-surface-dark-border bg-surface-dark p-5">
              <h3 className="text-base font-bold mb-4">Add New Position</h3>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative" ref={searchRef}>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="Symbol (AAPL, 005930)"
                    className="w-full h-10 bg-background-dark border border-surface-dark-border rounded-lg px-4 text-sm text-slate-100 placeholder:text-text-muted focus:outline-none focus:border-primary"
                    required
                  />
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-surface-dark-border rounded-lg overflow-hidden shadow-2xl">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setFormData({ ...formData, symbol: s.symbol }); setShowSuggestions(false) }}
                          className="px-4 py-2 hover:bg-surface-dark cursor-pointer text-xs flex justify-between">
                          <span className="text-white font-bold">{s.symbol}</span>
                          <span className="text-text-muted">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" step="0.01" value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Quantity" required
                  className="h-10 bg-background-dark border border-surface-dark-border rounded-lg px-4 text-sm text-slate-100 placeholder:text-text-muted focus:outline-none focus:border-primary" />
                <input type="number" step="0.01" value={formData.averagePrice}
                  onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
                  placeholder="Avg Cost" required
                  className="h-10 bg-background-dark border border-surface-dark-border rounded-lg px-4 text-sm text-slate-100 placeholder:text-text-muted focus:outline-none focus:border-primary" />
                <button type="submit" disabled={loading}
                  className="h-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Adding...' : 'Save Position'}
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {loading && portfolioItems.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-dark border border-surface-dark-border shadow-sm">
              <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Asset Value</p>
              <p className="text-[28px] font-bold leading-tight">{fmt(totalValue, portfolioItems[0]?.symbol)}</p>
              <div className={`flex items-center gap-1 text-sm font-medium ${totalProfitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className="material-symbols-outlined text-[16px]">{totalProfitPct >= 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-dark border border-surface-dark-border shadow-sm">
              <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Daily P/L</p>
              <p className={`text-[28px] font-bold leading-tight ${dailyPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dailyPL >= 0 ? '+' : ''}{fmt(dailyPL, portfolioItems[0]?.symbol)}
              </p>
              <p className="text-text-muted text-sm font-medium">Based on today's price change</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-dark border border-surface-dark-border shadow-sm">
              <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Return</p>
              <p className={`text-[28px] font-bold leading-tight ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{fmt(totalProfit, portfolioItems[0]?.symbol)}
              </p>
              <div className={`flex items-center gap-1 text-sm font-medium ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className="material-symbols-outlined text-[16px]">{totalProfit >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                <span>{Math.abs(totalProfitPct).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Asset Allocation */}
          {portfolioItems.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Asset Allocation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sector Allocation Bars */}
                <div className="flex flex-col gap-4 rounded-xl border border-surface-dark-border bg-surface-dark p-6">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Allocation by Stock</p>
                    <p className="text-2xl font-bold mt-1">{stockWeights[0]?.symbol}: {stockWeights[0]?.pct.toFixed(0)}%</p>
                  </div>
                  <div className="grid gap-x-4 gap-y-3 items-center" style={{ gridTemplateColumns: '60px 1fr 40px' }}>
                    {stockWeights.map(({ symbol, pct, color }, i) => (
                      <>
                        <p key={`sym-${i}`} className="text-slate-100 text-sm font-medium truncate">{symbol}</p>
                        <div key={`bar-${i}`} className="h-2.5 w-full bg-background-dark rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 + i * 0.05 }}></div>
                        </div>
                        <p key={`pct-${i}`} className="text-text-muted text-xs text-right">{pct.toFixed(0)}%</p>
                      </>
                    ))}
                  </div>
                </div>

                {/* Stock Bar Chart */}
                <div className="flex flex-col gap-4 rounded-xl border border-surface-dark-border bg-surface-dark p-6">
                  <div>
                    <p className="text-text-muted text-sm font-medium">Value by Position</p>
                    <p className="text-2xl font-bold mt-1">{portfolioItems.length} Holdings</p>
                  </div>
                  <div className="h-[140px] flex items-end justify-between gap-2 mt-auto pt-4 border-b border-surface-dark-border/50">
                    {stockWeights.map(({ symbol, pct, color }, i) => (
                      <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                        <div className="w-full rounded-t-sm transition-all group-hover:opacity-80"
                          style={{ height: `${Math.max(pct, 5)}%`, backgroundColor: color, opacity: 0.8 - i * 0.1 }}></div>
                        <span className="text-xs font-medium text-text-muted">{symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Holdings Table */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Current Holdings</h2>
              <span className="text-sm text-text-muted">{portfolioItems.length} positions</span>
            </div>
            {portfolioItems.length > 0 ? (
              <div className="rounded-xl border border-surface-dark-border bg-surface-dark overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-dark-border text-text-muted text-xs uppercase tracking-wider bg-surface-dark-border/20">
                        <th className="p-4 font-medium">Asset</th>
                        <th className="p-4 font-medium text-right">Price</th>
                        <th className="p-4 font-medium text-right">Quantity</th>
                        <th className="p-4 font-medium text-right">Avg Cost</th>
                        <th className="p-4 font-medium text-right">Total Value</th>
                        <th className="p-4 font-medium text-right">Gain/Loss</th>
                        <th className="p-4 font-medium text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {portfolioItems.map((item) => {
                        const { profit, profitPercent, totalValue: tv, price } = calcProfit(item)
                        const kr = isKR(item.symbol)
                        return (
                          <tr key={item.id} className="border-b border-surface-dark-border/50 hover:bg-surface-dark-border/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.symbol.slice(0, 3)}
                                </div>
                                <div>
                                  <p className="font-bold">{item.symbol}</p>
                                  {item.notes && <p className="text-text-muted text-xs">{item.notes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium">{fmt(price, item.symbol)}</td>
                            <td className="p-4 text-right">{item.quantity}</td>
                            <td className="p-4 text-right text-text-muted">{fmt(item.average_price, item.symbol)}</td>
                            <td className="p-4 text-right font-bold">{fmt(tv, item.symbol)}</td>
                            <td className={`p-4 text-right font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}{fmt(profit, item.symbol)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteItem(item.id)}
                                className="text-text-muted hover:text-rose-400 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !loading && (
                <div className="rounded-xl border border-dashed border-surface-dark-border bg-surface-dark p-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-600 mb-4 block">account_balance_wallet</span>
                  <h3 className="text-lg font-bold mb-2">Portfolio is Empty</h3>
                  <p className="text-text-muted text-sm">Add positions to track your assets in real-time.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Sidebar: Risk Panel */}
        <div className="w-[340px] shrink-0 flex flex-col gap-6">
          {/* Risk Assessment */}
          <div className="rounded-xl border border-surface-dark-border bg-surface-dark p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                Risk Assessment
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {/* Portfolio Beta/Volatility */}
              <div className="p-3 bg-background-dark rounded-lg border border-surface-dark-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-100">Portfolio Volatility</span>
                  <span className="text-sm font-bold text-amber-500">
                    {portfolioItems.length > 0 ? `${portfolioItems.length} assets` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {portfolioItems.length === 0
                    ? 'Add positions to see risk analysis.'
                    : `Your portfolio contains ${portfolioItems.length} positions with a total value of ${fmt(totalValue, portfolioItems[0]?.symbol)}.`}
                </p>
              </div>

              {/* Concentration Risk */}
              {portfolioItems.length > 0 && hasConcenRisk && (
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-rose-500 text-[20px] mt-0.5">error</span>
                    <div>
                      <h3 className="text-sm font-bold text-rose-500 mb-1">Concentration Risk</h3>
                      <p className="text-xs text-rose-400/80">
                        High exposure to {stockWeights[0]?.symbol} ({stockWeights[0]?.pct.toFixed(0)}%). Consider diversifying to reduce concentration risk.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liquidity */}
              {portfolioItems.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-500 text-[20px] mt-0.5">check_circle</span>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-500 mb-1">Liquidity Status</h3>
                      <p className="text-xs text-emerald-400/80">Excellent. All your positions are liquid and can be sold within market hours.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit/Loss summary */}
              {portfolioItems.length > 0 && (
                <div className="p-3 bg-background-dark rounded-lg border border-surface-dark-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Return</span>
                    <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(Math.abs(totalProfitPct), 100)}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Premium Banner */}
          {!isPremium && (
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/30 p-6 flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-primary/10 group-hover:text-primary/20 transition-colors pointer-events-none">
                <span className="material-symbols-outlined text-[120px]">auto_awesome</span>
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2 py-1 bg-primary/30 text-[10px] font-bold uppercase tracking-wider rounded text-white mb-2 border border-primary/50">
                  Pro Feature
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Premium AI Reports</h3>
                <p className="text-sm text-text-muted mb-4">Unlock predictive portfolio modeling and advanced risk analysis for your holdings.</p>
                <Link to="/subscription"
                  className="w-full flex items-center justify-center gap-2 rounded-lg h-10 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold">
                  <span>Upgrade Now</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
