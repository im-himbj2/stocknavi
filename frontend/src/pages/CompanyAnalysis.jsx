import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { getSubscriptionStatus } from '../utils/subscription'
import { majorStocks } from '../data/stockList'

function CompanyAnalysis() {
  const [searchSymbol, setSearchSymbol] = useState('')
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [includeTechnical, setIncludeTechnical] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const searchRef = useRef(null)

  // Search suggestions
  useEffect(() => {
    if (searchSymbol.trim()) {
      const searchLower = searchSymbol.trim().toLowerCase()
      const filtered = majorStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(searchLower) ||
        stock.name.toLowerCase().includes(searchLower) ||
        stock.name.includes(searchSymbol.trim())
      ).slice(0, 10)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    if (showSuggestions) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSuggestions])

  useEffect(() => {
    const checkPremium = async () => {
      try {
        const status = await getSubscriptionStatus()
        setIsPremium(status.is_active && status.tier === 'premium')
      } catch { setIsPremium(false) }
    }
    checkPremium()
  }, [])

  const fetchAnalysis = async (targetSymbol) => {
    const sym = targetSymbol || symbol
    if (!sym.trim()) { setError('심볼을 입력해주세요'); return }
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const data = await apiService.getCompanyAnalysis(sym.toUpperCase(), includeTechnical)
      setAnalysis(data)
    } catch (err) {
      setError(err.message || '기업 분석 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (symbol && symbol.trim()) fetchAnalysis()
  }, [symbol])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchSymbol.trim()) setSymbol(searchSymbol.trim().toUpperCase())
  }

  const handleStockSelect = (sym) => {
    setSearchSymbol(sym)
    setShowSuggestions(false)
    setSymbol(sym)
  }

  // Helper functions
  const getRatingLabel = (rating) => {
    const map = { strong_buy: 'Strong Buy', buy: 'Buy', hold: 'Hold', sell: 'Sell', strong_sell: 'Strong Sell' }
    return map[rating?.toLowerCase()] || rating || 'N/A'
  }

  const getRatingColor = (rating) => {
    const r = rating?.toLowerCase()
    if (r === 'strong_buy' || r === 'buy') return 'text-emerald-400'
    if (r === 'sell' || r === 'strong_sell') return 'text-rose-400'
    return 'text-amber-400'
  }

  const getSignalBadgeClass = (signal) => {
    const s = signal?.toLowerCase()
    if (s?.includes('buy') || s?.includes('bullish')) return 'bg-primary/10 text-blue-400'
    if (s?.includes('sell') || s?.includes('bearish')) return 'bg-rose-500/10 text-rose-400'
    return 'bg-slate-700 text-slate-300'
  }

  // Derive scores from category_analyses
  const getCategoryScore = (categories, name) => {
    if (!categories) return 0
    const cat = categories.find(c =>
      c.category?.toLowerCase().includes(name.toLowerCase())
    )
    return cat ? cat.score : 50
  }

  const getOverallHealthScore = (categories) => {
    if (!categories || categories.length === 0) return 0
    const total = categories.reduce((sum, c) => sum + (c.score || 0), 0)
    return (total / categories.length / 10).toFixed(1)
  }

  // Derive news sentiment
  const getNewsSentiment = (news) => {
    if (!news || news.length === 0) return { score: 50, label: 'NEUTRAL', positive: 50, negative: 25, neutral: 25 }
    const pos = news.filter(n => n.sentiment === 'positive').length
    const neg = news.filter(n => n.sentiment === 'negative').length
    const neu = news.length - pos - neg
    const score = Math.round((pos / news.length) * 100)
    const label = score >= 60 ? 'BULLISH' : score <= 40 ? 'BEARISH' : 'NEUTRAL'
    return {
      score,
      label,
      positive: Math.round((pos / news.length) * 100),
      negative: Math.round((neg / news.length) * 100),
      neutral: Math.round((neu / news.length) * 100)
    }
  }

  // Get indicator by name pattern
  const getIndicator = (indicators, pattern) => {
    if (!indicators) return null
    return indicators.find(i => i.name?.toLowerCase().includes(pattern.toLowerCase()))
  }

  // Radar chart polygon points from category scores
  const getRadarPoints = (categories) => {
    const profitability = getCategoryScore(categories, 'profit') / 100
    const stability = getCategoryScore(categories, 'stabil') / 100
    const valuation = getCategoryScore(categories, 'valuat') / 100
    const growth = getCategoryScore(categories, 'growth') / 100

    const cx = 50, cy = 50, r = 35
    return `${cx},${cy - r * profitability} ${cx + r * stability},${cy} ${cx},${cy + r * valuation} ${cx - r * growth},${cy}`
  }

  const info = analysis?.company_info
  const opinion = analysis?.investment_opinion
  const tech = analysis?.technical_analysis
  const categories = analysis?.category_analyses
  const news = analysis?.related_news
  const sentiment = news ? getNewsSentiment(news) : null

  const rsi = tech ? getIndicator(tech.indicators, 'rsi') : null
  const macd = tech ? getIndicator(tech.indicators, 'macd') : null
  const ma = tech ? getIndicator(tech.indicators, 'moving') || getIndicator(tech.indicators, 'ma') : null

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 font-display">
      <main className="flex-1 p-6 lg:px-10 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
        {/* Search Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold leading-tight">Deep Company Analysis</h1>
            <p className="text-slate-400 text-sm">AI-powered comprehensive stock analysis with technical indicators</p>
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-3" ref={searchRef}>
            <div className="relative">
              <div className="flex items-stretch rounded-lg h-10 bg-slate-800 border border-slate-700">
                <div className="text-slate-400 flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined text-xl">search</span>
                </div>
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search AAPL, MSFT, 삼성전자..."
                  className="w-64 bg-transparent px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none border-none"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => handleStockSelect(s.symbol)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0 flex justify-between">
                      <span className="font-bold text-white">{s.symbol}</span>
                      <span className="text-slate-400 text-sm">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={includeTechnical} onChange={(e) => setIncludeTechnical(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary" />
              Technical
            </label>
            <button type="submit" disabled={loading}
              className="px-6 h-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400">Analyzing {symbol}...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!analysis && !loading && !error && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">monitoring</span>
              <h2 className="text-2xl font-bold mb-2">Search a Stock to Analyze</h2>
              <p className="text-slate-400 mb-6">Enter a ticker symbol above to get AI-powered investment analysis, financial health scoring, and technical indicators.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'].map(s => (
                  <button key={s} onClick={() => handleStockSelect(s)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <>
            {/* Stock Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold leading-tight">{info?.name || symbol} ({analysis.symbol})</h1>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-sm font-medium text-slate-300">{info?.sector || 'N/A'}</span>
                </div>
                <p className="text-slate-400 text-base">{info?.industry || ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {info?.currentPrice && (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold">${info.currentPrice.toFixed(2)}</span>
                  </div>
                )}
                <span className="text-slate-400 text-sm">Updated: {new Date(analysis.updated_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Main 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column - AI Opinion + News Sentiment */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                {/* AI Investment Opinion */}
                {opinion && (
                  <div className="bg-surface-dark rounded-xl border border-surface-dark-border overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-br from-primary/80 to-[#003366] p-6 text-white relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 opacity-20">
                        <span className="material-symbols-outlined text-[80px]">smart_toy</span>
                      </div>
                      <div className="relative z-10 flex flex-col gap-2">
                        <p className="text-white/80 text-sm uppercase tracking-wider font-semibold">AI Investment Opinion</p>
                        <div className="flex items-end gap-3 mt-2">
                          <h3 className="text-3xl font-black">{getRatingLabel(opinion.rating)}</h3>
                          <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold mb-1">{opinion.score?.toFixed(0)}% CONFIDENCE</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col gap-5">
                      {/* Rating scale */}
                      <div className="flex justify-between items-center text-xs font-medium text-slate-400 px-1">
                        <span>Strong Sell</span>
                        <span>Sell</span>
                        <span>Hold</span>
                        <span>Buy</span>
                        <span className={getRatingColor(opinion.rating) + ' font-bold'}>Strong Buy</span>
                      </div>
                      <div className="relative w-full h-3 bg-slate-700 rounded-full">
                        <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 w-full opacity-30"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full shadow-md z-10"
                          style={{ left: `${Math.min(Math.max(opinion.score || 50, 5), 95)}%`, transform: 'translate(-50%, -50%)' }}></div>
                      </div>
                      {/* Reasoning */}
                      <div className="mt-2 text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
                        <p className="mb-3"><strong className="text-white">Reasoning:</strong> {opinion.thesis}</p>
                        {opinion.key_points?.length > 0 && (
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            {opinion.key_points.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* News Sentiment */}
                {news && news.length > 0 && sentiment && (
                  <div className="bg-surface-dark rounded-xl border border-surface-dark-border p-5 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">newspaper</span>
                      News Sentiment
                    </h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-2xl font-bold ${sentiment.score >= 60 ? 'text-emerald-400' : sentiment.score <= 40 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {sentiment.score}/100
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${sentiment.score >= 60 ? 'bg-emerald-900/30 text-emerald-400' : sentiment.score <= 40 ? 'bg-rose-900/30 text-rose-400' : 'bg-amber-900/30 text-amber-400'}`}>
                        {sentiment.label}
                      </span>
                    </div>
                    <div className="w-full flex h-2 rounded-full overflow-hidden mb-4">
                      <div className="bg-red-500" style={{ width: `${sentiment.negative}%` }}></div>
                      <div className="bg-yellow-500" style={{ width: `${sentiment.neutral}%` }}></div>
                      <div className="bg-emerald-500" style={{ width: `${sentiment.positive}%` }}></div>
                    </div>
                    <div className="space-y-3 mt-4">
                      {news.slice(0, 3).map((item, i) => (
                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                          className="flex gap-3 items-start p-2 hover:bg-slate-800/50 rounded transition-colors">
                          <span className={`material-symbols-outlined text-lg mt-0.5 ${item.sentiment === 'positive' ? 'text-emerald-500' : item.sentiment === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>
                            {item.sentiment === 'positive' ? 'trending_up' : item.sentiment === 'negative' ? 'trending_down' : 'trending_flat'}
                          </span>
                          <div>
                            <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                            <span className="text-xs text-slate-500">{item.publisher}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Center Column - Financial Health Scoring */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-surface-dark rounded-xl border border-surface-dark-border p-6 shadow-sm h-full flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">health_and_safety</span>
                      Financial Health Scoring
                    </h3>
                    <span className="text-2xl font-black text-blue-400">{getOverallHealthScore(categories)}<span className="text-sm text-slate-500 font-normal">/10</span></span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                    {/* Radar Chart */}
                    <div className="flex flex-col justify-center items-center relative aspect-square max-w-[240px] mx-auto opacity-80">
                      <svg className="w-full h-full drop-shadow-lg" viewBox="0 0 100 100">
                        <polygon fill="none" points="50,10 90,50 50,90 10,50" stroke="currentColor" className="text-slate-700" strokeWidth="1" />
                        <polygon fill="none" points="50,20 80,50 50,80 20,50" stroke="currentColor" className="text-slate-700" strokeWidth="1" />
                        <polygon fill="none" points="50,30 70,50 50,70 30,50" stroke="currentColor" className="text-slate-700" strokeWidth="1" />
                        <polygon fill="none" points="50,40 60,50 50,60 40,50" stroke="currentColor" className="text-slate-700" strokeWidth="1" />
                        <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" className="text-slate-700" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" className="text-slate-700" strokeWidth="1" strokeDasharray="2,2" />
                        <polygon points={getRadarPoints(categories)} fill="rgba(0, 73, 140, 0.3)" stroke="#00498C" strokeWidth="2" />
                      </svg>
                      <span className="absolute top-0 text-xs font-bold text-slate-300">Profitability</span>
                      <span className="absolute right-0 text-xs font-bold text-slate-300 translate-x-4">Stability</span>
                      <span className="absolute bottom-0 text-xs font-bold text-slate-300 translate-y-2">Valuation</span>
                      <span className="absolute left-0 text-xs font-bold text-slate-300 -translate-x-4">Growth</span>
                    </div>
                    {/* Score Bars */}
                    <div className="flex flex-col gap-5 justify-center">
                      {[
                        { name: 'Profitability', key: 'profit' },
                        { name: 'Stability', key: 'stabil' },
                        { name: 'Growth', key: 'growth' },
                        { name: 'Valuation', key: 'valuat' }
                      ].map(({ name, key }) => {
                        const score = getCategoryScore(categories, key)
                        const scoreDisplay = (score / 10).toFixed(1)
                        const cat = categories?.find(c => c.category?.toLowerCase().includes(key))
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{name}</span>
                              <span className={`font-bold ${score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{scoreDisplay}</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${score}%`, opacity: score >= 60 ? 1 : 0.7 }}></div>
                            </div>
                            {cat?.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{cat.summary}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Technical Analysis */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {tech ? (
                  <div className="bg-surface-dark rounded-xl border border-surface-dark-border p-6 shadow-sm h-full">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">candlestick_chart</span>
                        Technical Analysis
                      </h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${getSignalBadgeClass(tech.overall_signal)}`}>
                        {tech.overall_signal?.toUpperCase()} TREND
                      </span>
                    </div>
                    <div className="space-y-6">
                      {/* Moving Averages */}
                      <div className="flex items-center justify-between p-3 bg-[#152331] rounded-lg border border-slate-800">
                        <div>
                          <p className="text-sm font-semibold mb-1">Moving Averages (MA)</p>
                          <p className="text-xs text-slate-500">{ma ? `Value: ${ma.value?.toFixed(2)}` : 'Price vs 50-day & 200-day MA'}</p>
                        </div>
                        <div className={`flex items-center gap-2 ${getRatingColor(ma?.signal || tech.overall_signal)}`}>
                          <span className="font-bold text-sm">{ma?.signal?.replace('_', ' ') || tech.overall_signal?.replace('_', ' ')}</span>
                          <span className="material-symbols-outlined">trending_up</span>
                        </div>
                      </div>

                      {/* RSI */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold">RSI (14)</span>
                          <span className="text-sm font-bold">{rsi?.value?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-700 rounded-full mt-2">
                          <div className="absolute left-[30%] right-[30%] h-full bg-primary/20"></div>
                          {rsi?.value && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary border border-slate-800 rounded-full z-10"
                              style={{ left: `${Math.min(Math.max(rsi.value, 0), 100)}%`, marginLeft: '-6px' }}></div>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase">
                          <span>Oversold (&lt;30)</span>
                          <span>Neutral</span>
                          <span>Overbought (&gt;70)</span>
                        </div>
                      </div>

                      {/* MACD */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold">MACD (12,26,9)</span>
                          <div className={`flex items-center gap-1 ${getRatingColor(macd?.signal)}`}>
                            <span className="text-sm font-bold">{macd?.signal?.replace('_', ' ') || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-end gap-1 h-12 mt-2 pt-2 border-b border-slate-700">
                          {[2, 1, 2, 4, 6, 8, 10, 7, 5, 3, 2, 1].map((h, i) => (
                            <div key={i} className={`w-1/12 rounded-t-sm ${i < 2 ? 'bg-red-400/50' : 'bg-emerald-400/70'}`}
                              style={{ height: `${h * 10}%` }}></div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{tech.summary || 'MACD analysis based on current trend signals.'}</p>
                      </div>

                      {/* Additional indicators */}
                      {tech.indicators?.slice(0, 3).filter(i => !['rsi', 'macd', 'moving'].some(p => i.name?.toLowerCase().includes(p))).map((ind, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#152331] rounded-lg border border-slate-800">
                          <div>
                            <p className="text-sm font-semibold">{ind.name}</p>
                            <p className="text-xs text-slate-500">Value: {ind.value?.toFixed(2)}</p>
                          </div>
                          <span className={`text-sm font-bold ${getRatingColor(ind.signal)}`}>{ind.signal?.replace('_', ' ')}</span>
                        </div>
                      ))}

                      {/* Key levels */}
                      {tech.key_levels && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-3 bg-[#152331] rounded-lg border border-slate-800 text-center">
                            <p className="text-xs text-slate-500 mb-1">Support</p>
                            <p className="text-lg font-bold text-emerald-400">${tech.key_levels.support?.toFixed(2)}</p>
                          </div>
                          <div className="p-3 bg-[#152331] rounded-lg border border-slate-800 text-center">
                            <p className="text-xs text-slate-500 mb-1">Resistance</p>
                            <p className="text-lg font-bold text-rose-400">${tech.key_levels.resistance?.toFixed(2)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-dark rounded-xl border border-surface-dark-border p-6 shadow-sm flex items-center justify-center h-full">
                    <p className="text-slate-500 text-sm">Technical analysis not included. Enable the checkbox above.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default CompanyAnalysis
