import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api'
import { majorStocks } from '../data/stockList'
import PopularStockCard from '../components/Stock/PopularStockCard'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Dividend() {
  const [searchSymbol, setSearchSymbol] = useState('')
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dividendData, setDividendData] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showOlderData, setShowOlderData] = useState(false)
  const [isKoreanStock, setIsKoreanStock] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  // 고배당주 데이터 (Yahoo Finance 심볼 형식)
  const highDividendStocks = [
    { symbol: 'T', name: 'AT&T', yield: '6.5%' },
    { symbol: 'VZ', name: 'Verizon', yield: '6.2%' },
    { symbol: 'MO', name: 'Altria', yield: '8.1%' },
    { symbol: 'O', name: 'Realty Income', yield: '5.2%' },
    { symbol: 'PFE', name: 'Pfizer', yield: '5.8%' },
    { symbol: 'KO', name: 'Coca-Cola', yield: '3.1%' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', yield: '3.0%' },
    { symbol: 'MAIN', name: 'Main Street Capital', yield: '6.8%' },
    { symbol: 'SCHD', name: 'Schwab US Dividend ETF', yield: '3.4%' },
    { symbol: 'JEPI', name: 'JPMorgan Equity Premium', yield: '7.5%' }
  ]

  const [prices, setPrices] = useState({})

  useEffect(() => {
    const fetchPopularPrices = async () => {
      const allSymbols = highDividendStocks.map(s => s.symbol)
      try {
        const data = await apiService.getPortfolioPrices(allSymbols)
        setPrices(data)
      } catch (err) {
        console.error('추천 종목 가격 조회 실패:', err)
      }
    }

    if (!dividendData) {
      fetchPopularPrices()
    }
  }, [dividendData])

  const handleStockSelect = (selectedSymbol) => {
    setSymbol(selectedSymbol)
    setSearchSymbol(selectedSymbol)
    setShowSuggestions(false)
    // 약간의 지연 후 분석 실행
    setTimeout(() => {
      // fetchDividendData는 useEffect[symbol]에 의해 호출됨
    }, 100)
  }

  useEffect(() => {
    // symbol이 있고 빈 문자열이 아닐 때만 검색 실행
    if (symbol && symbol.trim()) {
      fetchDividendData()
    }
  }, [symbol])

  useEffect(() => {
    if (searchSymbol.trim()) {
      const searchTerm = searchSymbol.trim()
      const searchLower = searchTerm.toLowerCase()
      const filtered = majorStocks.filter(stock => {
        // 심볼 검색 (대소문자 무시)
        const symbolMatch = stock.symbol.toLowerCase().includes(searchLower)
        // 영문 이름 검색 (대소문자 무시)
        const nameMatch = stock.name.toLowerCase().includes(searchLower)
        // 한글 이름 검색 (부분 일치)
        const koreanMatch = stock.name.includes(searchTerm)
        return symbolMatch || nameMatch || koreanMatch
      })
      // 관련도 순으로 정렬 (정확히 일치하는 것 우선)
      const sorted = filtered.sort((a, b) => {
        const aExact = a.symbol === searchTerm || a.name === searchTerm
        const bExact = b.symbol === searchTerm || b.name === searchTerm
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        // 한글이 포함된 이름 우선
        const aKorean = a.name.includes(searchTerm)
        const bKorean = b.name.includes(searchTerm)
        if (aKorean && !bKorean) return -1
        if (!aKorean && bKorean) return 1
        return 0
      }).slice(0, 10)
      setSuggestions(sorted)
      setShowSuggestions(sorted.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  const fetchDividendData = async () => {
    if (!symbol.trim()) {
      setError('심볼을 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)
    setDividendData(null)
    setCompanyInfo(null)
    setShowOlderData(false)

    try {
      // 한국 종목인지 확인
      const symbolClean = symbol.replace('.KS', '').replace('.KQ', '')
      const isKR = symbolClean.match(/^\d+$/) !== null || symbol.endsWith('.KS') || symbol.endsWith('.KQ')
      setIsKoreanStock(isKR)

      const data = await apiService.getDividendHistory(symbol.toUpperCase())

      // 통화 정보로 한국 주식 확인 (백엔드에서 반환한 currency 사용)
      if (data && data.currency) {
        setIsKoreanStock(data.currency === 'KRW')
      } else if (data && data.company_info) {
        const companyName = data.company_info.name || ''
        if (companyName.match(/[가-힣]/) || isKR) {
          setIsKoreanStock(true)
        }
      }

      if (data && data.dividends && data.dividends.length > 0) {
        setDividendData(data)
        setCompanyInfo(data.company_info)
      } else {
        setError('배당 데이터가 없습니다')
        if (data && data.company_info) {
          setCompanyInfo(data.company_info)
        }
      }
    } catch (err) {
      console.error('배당 분석 오류:', err)
      const errorMessage = err.message || '배당 분석 중 오류가 발생했습니다'
      setError(errorMessage)
      console.error('상세 에러:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        request: err.request
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchSymbol.trim()) {
      setSymbol(searchSymbol.toUpperCase())
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    const stock = typeof suggestion === 'string' ? { symbol: suggestion, name: suggestion } : suggestion
    setSearchSymbol(stock.symbol)
    setSymbol(stock.symbol)
    setShowSuggestions(false)
  }

  const calculateStats = () => {
    if (!dividendData || !dividendData.dividends || dividendData.dividends.length === 0) return null

    const amounts = dividendData.dividends.map(d => d.amount).filter(a => a !== null)
    if (amounts.length === 0) return null

    const total = amounts.reduce((sum, a) => sum + a, 0)
    const avg = total / amounts.length
    const max = Math.max(...amounts)
    const min = Math.min(...amounts)

    return {
      total,
      avg,
      max,
      min
    }
  }

  const stats = calculateStats()

  // 5년 이내와 이전 데이터 분리
  const getDividendSections = () => {
    if (!dividendData || !dividendData.dividends) return { recent: [], older: [] }

    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const recent = []
    const older = []

    dividendData.dividends.forEach(dividend => {
      const dividendDate = new Date(dividend.date)
      if (dividendDate >= fiveYearsAgo) {
        recent.push(dividend)
      } else {
        older.push(dividend)
      }
    })

    return { recent, older }
  }

  const { recent: recentDividends, older: olderDividends } = getDividendSections()

  return (
    <div className="relative min-h-screen">
      {/* 애니메이션 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        {/* 헤더 */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-4 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold backdrop-blur-sm">
            Professional Dividend Analysis
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            배당 분석
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            실시간 배당 데이터와 전문가 수준의 분석으로
            <br />
            <span className="text-green-400 font-semibold">배당 투자 전략</span>을 수립하세요
          </p>
        </div>

        {/* 검색 섹션 */}
        <div className="mb-8 animate-fade-in-up" style={{ position: 'relative', zIndex: 100 }}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="relative" ref={searchRef} style={{ zIndex: 100 }}>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full" style={{ position: 'relative', zIndex: 100 }}>
                  <label className="block text-sm font-medium mb-2 text-gray-300">주식 심볼</label>
                  <div className="relative" style={{ zIndex: 100 }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchSymbol}
                      onChange={(e) => {
                        setSearchSymbol(e.target.value.toUpperCase())
                      }}
                      onKeyDown={(e) => {
                        // 엔터키 처리
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (searchSymbol.trim()) {
                            handleSubmit(e)
                          }
                        }
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) {
                          setShowSuggestions(true)
                        }
                      }}
                      placeholder="예: AAPL, MSFT, TSLA, 삼성전자, 005930"
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ zIndex: 100 }}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto" style={{ zIndex: 9999, position: 'absolute' }}>
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSearchSymbol(suggestion.symbol)
                              setSymbol(suggestion.symbol)
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
                <button
                  type="submit"
                  disabled={loading || !searchSymbol.trim()}
                  className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      분석 중...
                    </span>
                  ) : (
                    '분석 시작'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {!dividendData && !loading && (
          <div className="mb-12 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-500 rounded-full"></span>
              고배당 추천 종목
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {highDividendStocks.map(stock => (
                <PopularStockCard
                  key={stock.symbol}
                  stock={stock}
                  priceData={prices[stock.symbol]}
                  onClick={() => handleStockSelect(stock.symbol)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 회사 정보 카드 */}
        {companyInfo && (
          <div className="mb-8 animate-fade-in-up" style={{ position: 'relative', zIndex: 1 }}>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6" style={{ position: 'relative', zIndex: 1 }}>
              <div className="flex items-center gap-6">
                {companyInfo.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={companyInfo.logo_url}
                      alt={companyInfo.name}
                      className="w-16 h-16 rounded-xl object-contain bg-white/5 p-2 border border-white/10"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{companyInfo.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{companyInfo.sector}</span>
                    <span>•</span>
                    <span>{companyInfo.industry}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">심볼</div>
                  <div className="text-xl font-bold text-white">
                    {symbol}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 animate-fade-in">
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-xl border-2 border-yellow-500/30 rounded-2xl p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-6 text-7xl animate-bounce">🚧</div>
                <h3 className="text-2xl font-bold mb-3 text-yellow-400">배당 데이터 없음</h3>
                <p className="text-gray-300 mb-2 text-lg">
                  <span className="font-semibold text-white">{symbol}</span>에 대한 배당 데이터를 찾을 수 없습니다.
                </p>
                <p className="text-sm text-gray-400 max-w-md">
                  일부 기업은 배당을 지급하지 않거나 데이터가 일시적으로 사용 불가능할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in-up">
            <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">총 배당금</p>
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {isKoreanStock ? `${Math.round(stats.total).toLocaleString()}원` : `$${stats.total.toFixed(2)}`}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">평균 배당</p>
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {isKoreanStock ? `${Math.round(stats.avg).toLocaleString()}원` : `$${stats.avg.toFixed(2)}`}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-105 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">최대 배당</p>
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📈</span>
                  </div>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {isKoreanStock ? `${Math.round(stats.max).toLocaleString()}원` : `$${stats.max.toFixed(2)}`}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-orange-500/50 transition-all duration-500 transform hover:scale-105 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">5년 상승률</p>
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                </div>
                {dividendData && dividendData.five_year_growth_rate !== null && dividendData.five_year_growth_rate !== undefined ? (
                  <>
                    <p className={`text-3xl font-bold ${dividendData.five_year_growth_rate >= 0 ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-red-400 to-orange-400'} bg-clip-text text-transparent`}>
                      {dividendData.five_year_growth_rate >= 0 ? '+' : ''}{dividendData.five_year_growth_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">5년간 평균 상승률</p>
                  </>
                ) : (
                  <p className="text-xl font-bold text-gray-500">N/A</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 배당 이력 및 그래프 (50/50 레이아웃) */}
        {dividendData && recentDividends.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                    배당 이력 및 분석
                  </h2>
                  <p className="text-sm text-gray-400">최근 5년간 배당 내역 및 성장률</p>
                </div>
                <div className="flex items-center gap-4">
                  {olderDividends.length > 0 && (
                    <button
                      onClick={() => setShowOlderData(!showOlderData)}
                      className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                    >
                      {showOlderData ? '이전 데이터 숨기기' : `${olderDividends.length}개 이전 데이터 보기`}
                    </button>
                  )}
                  <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <span className="text-green-400 font-semibold text-sm">{recentDividends.length}개 기록</span>
                  </div>
                </div>
              </div>

              {/* 50/50 그리드 레이아웃 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 왼쪽: 배당 이력 테이블 */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-700">
                        <th className="text-left py-4 px-6 text-gray-300 font-semibold uppercase text-sm tracking-wider">날짜</th>
                        <th className="text-right py-4 px-6 text-gray-300 font-semibold uppercase text-sm tracking-wider">배당금</th>
                        <th className="text-right py-4 px-6 text-gray-300 font-semibold uppercase text-sm tracking-wider">배당 수익률</th>
                        <th className="text-right py-4 px-6 text-gray-300 font-semibold uppercase text-sm tracking-wider">변화율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDividends.map((dividend, idx) => {
                        const prevDividend = idx < recentDividends.length - 1 ? recentDividends[idx + 1] : null
                        const changeRate = prevDividend && prevDividend.amount && dividend.amount
                          ? ((dividend.amount - prevDividend.amount) / prevDividend.amount) * 100
                          : null

                        return (
                          <tr
                            key={idx}
                            className="border-b border-gray-700/30 hover:bg-green-500/5 transition-colors duration-200 group"
                          >
                            <td className="py-4 px-6">
                              <div className="text-gray-300 group-hover:text-white transition-colors font-medium">
                                {new Date(dividend.date).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            </td>
                            <td className="text-right py-4 px-6">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                  {isKoreanStock
                                    ? `${dividend.amount ? Math.round(dividend.amount).toLocaleString() : 'N/A'}원`
                                    : `$${dividend.amount?.toFixed(2) || 'N/A'}`
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="text-right py-4 px-6">
                              {dividend.yield_ ? (
                                <span className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-semibold text-sm">
                                  {(dividend.yield_ * 100).toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                            <td className="text-right py-4 px-6">
                              {changeRate !== null ? (
                                <span className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${changeRate >= 0
                                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                  : 'bg-red-500/20 border border-red-500/30 text-red-400'
                                  }`}>
                                  {changeRate >= 0 ? '↑' : '↓'} {Math.abs(changeRate).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 오른쪽: 배당 성장률 그래프 */}
                <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">배당 성장률 추이</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={[...recentDividends].reverse().map((d, idx) => ({
                      date: new Date(d.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }),
                      amount: d.amount || 0,
                      year: new Date(d.date).getFullYear()
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 4 }}
                        name={isKoreanStock ? '배당금 (원)' : '배당금 ($)'}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* 연도별 배당 비교 바 차트 */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">연도별 배당 비교</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={(() => {
                        const yearData = {}
                        recentDividends.forEach(d => {
                          const year = new Date(d.date).getFullYear()
                          if (!yearData[year]) {
                            yearData[year] = { year: year, total: 0, count: 0 }
                          }
                          yearData[year].total += d.amount || 0
                          yearData[year].count += 1
                        })
                        return Object.values(yearData).map(y => ({
                          year: y.year.toString(),
                          avg: y.total / y.count
                        })).sort((a, b) => a.year.localeCompare(b.year))
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="year" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="avg" fill="#22c55e" name={isKoreanStock ? '평균 배당 (원)' : '평균 배당 ($)'} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 5년 이전 데이터 팝업 */}
              {showOlderData && olderDividends.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-300">5년 이전 배당 이력</h3>
                      <button
                        onClick={() => setShowOlderData(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700/50">
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">날짜</th>
                            <th className="text-right py-3 px-4 text-gray-400 font-semibold">배당금</th>
                            <th className="text-right py-3 px-4 text-gray-400 font-semibold">배당 수익률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {olderDividends.map((dividend, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-400">
                                {new Date(dividend.date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="text-right py-3 px-4 text-gray-300 font-medium">
                                {isKoreanStock
                                  ? `${dividend.amount ? Math.round(dividend.amount).toLocaleString() : 'N/A'}원`
                                  : `$${dividend.amount?.toFixed(2) || 'N/A'}`
                                }
                              </td>
                              <td className="text-right py-3 px-4">
                                {dividend.yield_ ? (
                                  <span className="text-gray-400">{(dividend.yield_ * 100).toFixed(2)}%</span>
                                ) : (
                                  <span className="text-gray-500">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-block relative">
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-gray-400 text-lg font-semibold">배당 데이터를 분석하는 중...</p>
            <p className="mt-2 text-gray-500 text-sm">잠시만 기다려주세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dividend
