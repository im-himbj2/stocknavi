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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [isPremium, setIsPremium] = useState(false)
  const [viewMode, setViewMode] = useState('simple') // 'simple' or 'detailed'
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (searchSymbol.trim()) {
      const searchTerm = searchSymbol.trim()
      const searchLower = searchTerm.toLowerCase()
      const filtered = majorStocks.filter(stock => {
        // ?щ낵 寃??(??뚮Ц??臾댁떆)
        const symbolMatch = stock.symbol.toLowerCase().includes(searchLower)
        // ?곷Ц ?대쫫 寃??(??뚮Ц??臾댁떆)
        const nameMatch = stock.name.toLowerCase().includes(searchLower)
        // ?쒓? ?대쫫 寃??(遺遺??쇱튂)
        const koreanMatch = stock.name.includes(searchTerm)
        return symbolMatch || nameMatch || koreanMatch
      })
      // 愿?⑤룄 ?쒖쑝濡??뺣젹 (?뺥솗???쇱튂?섎뒗 寃??곗꽑)
      const sorted = filtered.sort((a, b) => {
        const aExact = a.symbol === searchTerm || a.name === searchTerm
        const bExact = b.symbol === searchTerm || b.name === searchTerm
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        // ?쒓????ы븿???대쫫 ?곗꽑
        const aKorean = a.name.includes(searchTerm)
        const bKorean = b.name.includes(searchTerm)
        if (aKorean && !bKorean) return -1
        if (!aKorean && bKorean) return 1
        return 0
      }).slice(0, 10)
      setSuggestions(sorted)
      setShowSuggestions(sorted.length > 0)
      
      // ?쒕∼?ㅼ슫 ?꾩튂 ?낅뜲?댄듃
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width
        })
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  // ?몃? ?대┃ ???쒕∼?ㅼ슫 ?リ린
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  // 援щ룆 ?곹깭 ?뺤씤
  useEffect(() => {
    const checkPremium = async () => {
      try {
        const status = await getSubscriptionStatus()
        setIsPremium(status.is_active && status.tier === 'premium')
      } catch (err) {
        setIsPremium(false)
      }
    }
    checkPremium()
  }, [])

  const fetchAnalysis = async () => {
    if (!symbol.trim()) {
      setError('심볼을 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const data = await apiService.getCompanyAnalysis(symbol.toUpperCase(), includeTechnical)
      setAnalysis(data)
    } catch (err) {
      console.error('기업 분석 오류:', err)
      // 프리미엄 관련 오류인 경우 처리
      if (err.message && err.message.includes('구독')) {
        setError(`${err.message} 프리미엄으로 업그레이드하면 무제한 분석이 가능합니다.`)
      } else {
        const errorMessage = err.message || '기업 분석 중 오류가 발생했습니다'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (symbol && symbol.trim()) {
      fetchAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchSymbol.trim()) {
      setSymbol(searchSymbol.trim().toUpperCase())
    }
  }

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-400'
    if (score >= 60) return 'text-green-300'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getSignalColor = (signal) => {
    switch (signal?.toLowerCase()) {
      case 'strong_buy':
      case 'buy':
        return 'text-green-400'
      case 'strong_sell':
      case 'sell':
        return 'text-red-400'
      default:
        return 'text-yellow-400'
    }
  }

  const getSignalBadgeColor = (signal) => {
    switch (signal?.toLowerCase()) {
      case 'strong_buy':
        return 'bg-green-600 text-white'
      case 'buy':
        return 'bg-green-500 text-white'
      case 'hold':
        return 'bg-yellow-500 text-white'
      case 'sell':
        return 'bg-red-500 text-white'
      case 'strong_sell':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'negative':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* ?ㅻ뜑 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              기업 분석
            </h1>
            {isPremium && (
              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-xs font-semibold text-yellow-400">
                프리미엄
              </span>
            )}
          </div>
          <p className="text-xl text-gray-400 mb-2">
            종합적인 기업 분석과 투자 인사이트를 제공합니다.          </p>
          {!isPremium && (
            <p className="text-sm text-gray-500">
              무료 사용자는 매일 5개 기업 분석만 가능합니다. <Link to="/subscription" className="text-blue-400 hover:text-blue-300 underline">프리미엄으로 업그레이드</Link>
            </p>
          )}
        </div>

        {/* 寃????(Sticky) */}
        <form onSubmit={handleSubmit} className="sticky top-0 z-50 mb-8 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative" ref={searchRef} style={{ zIndex: 1000 }}>
              <label className="block text-sm font-medium mb-2 text-gray-300">주식 검색</label>
              <div className="relative" style={{ zIndex: 1000 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => {
                    setSearchSymbol(e.target.value.toUpperCase())
                    // ?쒕∼?ㅼ슫 ?꾩튂 ?낅뜲?댄듃
                    if (e.target && inputRef.current) {
                      const rect = inputRef.current.getBoundingClientRect()
                      setDropdownPosition({
                        top: rect.bottom + window.scrollY + 8,
                        left: rect.left + window.scrollX,
                        width: rect.width
                      })
                    }
                  }}
                  onFocus={(e) => {
                    // ?쒕∼?ㅼ슫 ?꾩튂 怨꾩궛
                    const rect = e.target.getBoundingClientRect()
                    setDropdownPosition({
                      top: rect.bottom + window.scrollY + 8,
                      left: rect.left + window.scrollX,
                      width: rect.width
                    })
                    if (suggestions.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  placeholder="예: AAPL, MSFT, TSLA, 삼성전자, 005930"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ zIndex: 1000 }}
                />
                {showSuggestions && suggestions.length > 0 && dropdownPosition.width > 0 && (
                  <div 
                    className="fixed bg-black border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto" 
                    style={{ 
                      zIndex: 99999,
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`
                    }}
                  >
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchSymbol(suggestion.symbol)
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors duration-200 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{suggestion.symbol}</span>
                        <span className="text-gray-400 text-sm">{suggestion.name}</span>
                      </div>
                    </button>
                  ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeTechnical"
                checked={includeTechnical}
                onChange={(e) => setIncludeTechnical(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/50 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="includeTechnical" className="text-sm text-gray-300">기술적 분석 포함</label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
            >
              {loading ? '분석 중...' : '분석 실행'}
            </button>
          </div>
        </form>

        {/* ?먮윭 硫붿떆吏 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 遺꾩꽍 寃곌낵 */}
        {analysis && (
          <div className="space-y-8">
            {/* ?뚯궗 ?뺣낫 移대뱶 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{analysis.company_info.name}</h2>
                  <p className="text-gray-400">{analysis.symbol}</p>
                </div>
                {analysis.company_info.currentPrice && (
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">?꾩옱媛</p>
                    <p className="text-3xl font-bold">${analysis.company_info.currentPrice.toFixed(2)}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/10">
                <div>
                  <p className="text-sm text-gray-400 mb-1">?뱁꽣</p>
                  <p className="text-lg font-semibold">{analysis.company_info.sector || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">?곗뾽</p>
                  <p className="text-lg font-semibold">{analysis.company_info.industry || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">?쒓?珥앹븸</p>
                  <p className="text-lg font-semibold">
                    {analysis.company_info.marketCap
                      ? `$${(analysis.company_info.marketCap / 1e9).toFixed(2)}B`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">?낅뜲?댄듃</p>
                  <p className="text-sm font-semibold text-gray-300">
                    {new Date(analysis.updated_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>

            {/* ?ъ옄 ?섍껄 & 湲곗닠??遺꾩꽍 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ?ъ옄 ?섍껄 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6">?ъ옄 ?섍껄</h2>
                <div className="flex items-center gap-4 mb-6">
                  <span className={`px-5 py-2 rounded-lg font-bold text-sm ${getSignalBadgeColor(analysis.investment_opinion.rating)}`}>
                    {analysis.investment_opinion.rating}
                  </span>
                  <span className={`text-3xl font-bold ${getScoreColor(analysis.investment_opinion.score)}`}>
                    {analysis.investment_opinion.score.toFixed(1)}
                  </span>
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">{analysis.investment_opinion.thesis}</p>
                {analysis.investment_opinion.key_points.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-green-400">二쇱슂 ?ъ씤주요 포인트</h3>
                    <ul className="space-y-2">
                      {analysis.investment_opinion.key_points.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.investment_opinion.risks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-400">由ъ뒪위험</h3>
                    <ul className="space-y-2">
                      {analysis.investment_opinion.risks.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-red-300">
                          <span className="text-red-400 mt-1">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 기술적 분석 */}
              {analysis.technical_analysis && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold mb-6">湲곗닠??遺꾩꽍</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <span className={`px-5 py-2 rounded-lg font-bold text-sm ${getSignalBadgeColor(analysis.technical_analysis.overall_signal)}`}>
                      {analysis.technical_analysis.overall_signal.toUpperCase()}
                    </span>
                    <span className={`text-3xl font-bold ${getScoreColor(analysis.technical_analysis.overall_score)}`}>
                      {analysis.technical_analysis.overall_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed">{analysis.technical_analysis.summary}</p>
                  <div className="space-y-3 mb-6">
                    {analysis.technical_analysis.indicators.slice(0, 4).map((indicator, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                        <div>
                          <span className="font-semibold text-gray-200">{indicator.name}</span>
                          <span className="ml-2 text-sm text-gray-400">{indicator.value.toFixed(2)}</span>
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded ${getSignalColor(indicator.signal)}`}>
                          {indicator.signal.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  {analysis.technical_analysis.key_levels && (
                    <div className="pt-6 border-t border-white/10">
                      <h3 className="text-lg font-semibold mb-4">주요 수준</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-black/30 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">지지선</p>
                          <p className="text-xl font-bold text-green-400">
                            {analysis.technical_analysis.key_levels.support?.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 bg-black/30 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">저항</p>
                          <p className="text-xl font-bold text-red-400">
                            {analysis.technical_analysis.key_levels.resistance?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 뉴스 섹션 */}
            {analysis.related_news && analysis.related_news.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6">관련 뉴스</h2>
                <div className="space-y-4">
                  {analysis.related_news.slice(0, 5).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group hover:bg-white/5 p-4 rounded-lg transition-colors"
                    >
                      <div className="flex gap-4">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors line-clamp-2">
                              {item.title}
                            </h3>
                            {item.sentiment && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getSentimentColor(item.sentiment)}`}>
                                {item.sentiment === 'positive' ? '긍정' : item.sentiment === 'negative' ? '부정' : '중립'}
                              </span>
                            )}
                          </div>
                          {item.summary && (
                            <p className="text-sm text-gray-400 mb-2 line-clamp-2">{item.summary}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{item.publisher}</span>
                            <span>·</span>
                            <span>{formatDate(item.published_at)}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 재무 지표 분석 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">주요 재무 지표</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.financial_metrics.slice(0, 9).map((metric, idx) => (
                  <div key={idx} className="bg-black/30 rounded-lg p-5 border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-200">{metric.name}</h3>
                      {metric.score !== null && (
                        <span className={`text-sm font-bold px-2 py-1 rounded ${getScoreColor(metric.score)}`}>
                          {metric.score.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-2">
                      {metric.value !== null && metric.value !== undefined
                        ? `${metric.value.toFixed(2)}${metric.unit || ''}`
                        : 'N/A'}
                    </p>
                    {metric.interpretation && (
                      <p className="text-xs text-gray-400 leading-relaxed">{metric.interpretation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 카테고리 분석 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">카테고리 분석</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.category_analyses.map((category, idx) => (
                  <div key={idx} className="bg-black/30 rounded-lg p-5 border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">{category.category}</h3>
                      <span className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                        {category.score.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{category.summary}</p>
                    {category.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-green-400 font-semibold mb-1">장점</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          {category.strengths.slice(0, 2).map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-400">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {category.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs text-red-400 font-semibold mb-1">약점</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          {category.weaknesses.slice(0, 2).map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-400">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 위험 분석 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">위험 분석</h2>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">전체 위험</span>
                  <span className={`text-3xl font-bold ${getScoreColor(100 - analysis.risk_analysis.overall_risk)}`}>
                    {analysis.risk_analysis.overall_risk.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${analysis.risk_analysis.overall_risk}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { label: '유동성', value: analysis.risk_analysis.liquidity_risk },
                  { label: '수익성', value: analysis.risk_analysis.profitability_risk },
                  { label: '성장', value: analysis.risk_analysis.growth_risk },
                  { label: '변동성', value: analysis.risk_analysis.volatility_risk },
                ].map((risk, idx) => (
                  <div key={idx} className="bg-black/30 rounded-lg p-4 border border-white/5">
                    <p className="text-sm text-gray-400 mb-2">{risk.label}</p>
                    <p className={`text-2xl font-bold ${getScoreColor(100 - risk.value)}`}>
                      {risk.value.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
              {analysis.risk_analysis.risk_factors.length > 0 && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-lg font-semibold mb-3 text-red-400">위험</h3>
                  <ul className="space-y-2">
                    {analysis.risk_analysis.risk_factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-300">
                        <span className="text-red-400 mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 濡쒕뵫 ?곹깭 */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">분석 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanyAnalysis

