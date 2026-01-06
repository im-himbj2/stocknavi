import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api'
import ShelfDisplay from '../components/Shelf/ShelfDisplay'

function Home() {
  const location = useLocation()
  const [searchSymbol, setSearchSymbol] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [stockData, setStockData] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [timeframe, setTimeframe] = useState('1H')
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  // 주요 주식 목록
  const majorStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
    { symbol: '035420', name: 'NAVER' },
  ]

  // 검색 필터링
  useEffect(() => {
    if (searchSymbol.trim()) {
      const filtered = majorStocks.filter(
        stock => 
          stock.symbol.toLowerCase().includes(searchSymbol.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchSymbol.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 종목 데이터 및 뉴스 가져오기
  const fetchStockData = async (symbol) => {
    if (!symbol.trim()) return
    
    setLoading(true)
    try {
      // 기업 분석 데이터 가져오기
      const analysis = await apiService.getCompanyAnalysis(symbol, false)
      if (analysis && analysis.company_info) {
        setStockData({
          symbol: symbol,
          name: analysis.company_info.name,
          price: analysis.company_info.currentPrice || 0,
          change: analysis.company_info.priceChange || 0,
          changePercent: analysis.company_info.priceChangePercent || 0,
          logo: analysis.company_info.logo_url
        })
      }

      // 뉴스 데이터 가져오기
      try {
        const news = await apiService.getCompanyNews(symbol)
        if (news && news.news) {
          setNewsData({
            company: analysis?.company_info?.name || symbol,
            news: news.news.slice(0, 3),
            dcfValue: analysis?.investment_opinion?.score ? 
              (analysis.company_info.currentPrice * (1 + (analysis.investment_opinion.score - 50) / 100)).toFixed(2) : 
              '0.00',
            verdict: analysis?.investment_opinion?.score ? 
              (analysis.company_info.currentPrice > (analysis.company_info.currentPrice * (1 + (analysis.investment_opinion.score - 50) / 100)) ? 
                `Overvalued ${((analysis.company_info.currentPrice / (analysis.company_info.currentPrice * (1 + (analysis.investment_opinion.score - 50) / 100)) - 1) * 100).toFixed(1)}%` :
                `Undervalued ${((1 - analysis.company_info.currentPrice / (analysis.company_info.currentPrice * (1 + (analysis.investment_opinion.score - 50) / 100))) * 100).toFixed(1)}%`) :
              'Calculating...'
          })
        }
      } catch (newsError) {
        console.error('뉴스 가져오기 실패:', newsError)
      }
    } catch (error) {
      console.error('종목 데이터 가져오기 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSymbolSelect = (symbol) => {
    setSearchSymbol(symbol)
    setSelectedSymbol(symbol)
    setShowSuggestions(false)
    fetchStockData(symbol)
  }

  const handleAnalyze = () => {
    if (selectedSymbol) {
      fetchStockData(selectedSymbol)
    }
  }
  const features = [
    {
      title: '배당 분석',
      subtitle: 'Dividend Intelligence',
      description: '배당 이력과 수익률을 심층 분석하여 안정적인 수익 기회를 발견하세요.',
      link: '/dividend',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      title: '기업 분석',
      subtitle: 'Company Analytics',
      description: 'AI 기반 재무 분석과 기술적 지표로 투자 가치를 정확히 평가하세요.',
      link: '/company',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: '경제 지표',
      subtitle: 'Market Insights',
      description: '실시간 경제 데이터와 시장 동향을 한눈에 파악하세요.',
      link: '/economic',
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: '연설 요약',
      subtitle: 'Speech Summary',
      description: 'FOMC 회의록 및 경제 연설의 AI 기반 요약으로 핵심 정보를 빠르게 확인하세요.',
      link: '/speech',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      title: '포트폴리오',
      subtitle: 'Portfolio Management',
      description: '개인 포트폴리오를 체계적으로 관리하고 성과를 추적하세요.',
      link: '/portfolio',
      color: 'from-amber-500 to-orange-600'
    }
  ]

  // 빠른 이동 기능 탭
  const quickLinks = [
    { path: '/dividend', label: '배당', icon: '💰' },
    { path: '/company', label: '기업분석', icon: '📊' },
    { path: '/economic', label: '경제지표', icon: '📈' },
    { path: '/speech', label: '연설요약', icon: '📝' },
    { path: '/portfolio', label: '포트폴리오', icon: '💼' },
  ]

  return (
    <div className="bg-black text-white min-h-screen relative overflow-x-hidden">
      {/* Ambient Background Light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      {/* 빠른 이동 탭 */}
      <section className="sticky top-16 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Section - 첫 번째 칸 */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-gray-300 font-medium tracking-wide uppercase">New 2024 Edition</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight text-white">
              AI terminal for
              <br />
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                active traders
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Your clarity advantage in every market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/company"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                Run Analysis
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Quick Analysis Hub - 우리만의 특색 */}
      <section className="py-24 relative overflow-hidden border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                종합 투자 인텔리전스
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                배당, 재무, 경제 지표를 한눈에. 한국과 글로벌 시장을 아우르는 통합 분석 플랫폼
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Quick Search */}
              <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  빠른 종목 검색
                </h3>
                <div className="relative mb-4" ref={searchRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder="삼성전자, AAPL, NVDA..."
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSymbolSelect(suggestion.symbol)}
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
                {stockData && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      {stockData.logo && (
                        <img 
                          src={stockData.logo} 
                          alt={stockData.name}
                          className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold">{stockData.symbol}</span>
                          <span className="text-gray-400 text-xs">{stockData.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white">${stockData.price.toFixed(2)}</span>
                          <span className={`text-sm font-semibold ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.change >= 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedSymbol}
                  className="w-full mt-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? '분석 중...' : '종합 분석 시작'}
                </button>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 text-white">주요 기능</h3>
                <div className="space-y-4">
                  <Link to="/dividend" className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 font-bold">배당</span>
                      <span className="text-xs text-gray-400">Dividend</span>
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-gray-300">배당 이력 분석</p>
                  </Link>
                  <Link to="/company" className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400 font-bold">재무</span>
                      <span className="text-xs text-gray-400">Financial</span>
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-gray-300">AI 기업 분석</p>
                  </Link>
                  <Link to="/economic" className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-400 font-bold">경제</span>
                      <span className="text-xs text-gray-400">Economic</span>
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-gray-300">경제 지표 모니터링</p>
                  </Link>
                </div>
              </div>
            </div>

            {/* News & Insights */}
            {newsData && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{newsData.company} 인사이트</h3>
                  <Link to={`/news?symbol=${selectedSymbol}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                    더보기 →
                  </Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">최신 뉴스</h4>
                    <ul className="space-y-2">
                      {newsData.news.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                            idx === 0 ? 'bg-green-400' : idx === 1 ? 'bg-green-400' : 'bg-yellow-400'
                          }`} />
                          <span className="text-gray-300 flex-1">{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-1">공정 가치</div>
                      <div className="text-lg font-bold text-white">${newsData.dcfValue}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-1">평가</div>
                      <div className={`text-base font-bold ${
                        newsData.verdict.includes('Overvalued') ? 'text-red-400' : 
                        newsData.verdict.includes('Undervalued') ? 'text-green-400' : 
                        'text-gray-400'
                      }`}>
                        {newsData.verdict}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 핵심 기능 - Shelf Display 애니메이션 */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-gray-300 font-medium tracking-wide uppercase">New 2024 Edition</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
              종합 투자 분석 플랫폼
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xl font-light leading-relaxed">
              Experience the next generation of financial tools. <br/>
              Powerful, intuitive, and designed for clarity.
            </p>
          </div>

          {/* Shelf Display */}
          <ShelfDisplay />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Trade like the next generation.
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Your clarity advantage in any market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/company"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                Get started
              </Link>
            </div>

            {/* 법적 고지 */}
            <div className="border-t border-white/5 pt-8 max-w-3xl mx-auto">
              <div className="text-xs text-gray-500 space-y-3 leading-relaxed text-left">
                <p>
                  Trading and investing involve significant risk of loss. StockNavi provides AI-powered analysis tools for educational purposes only and does not constitute financial advice. Always consult a licensed financial advisor before making investment decisions. Past performance is not indicative of future results.
                </p>
                <p>
                  본 사이트는 <span className="text-gray-300">Yahoo Finance</span>, 
                  <span className="text-gray-300"> Financial Modeling Prep (FMP)</span> 및 
                  <span className="text-gray-300"> FRED</span> 데이터를 사용합니다.
                </p>
                <p>
                  <strong className="text-gray-400">FRED API:</strong> FRED API 사용 시 
                  <a 
                    href="https://fred.stlouisfed.org/docs/api/terms_of_use.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300 underline ml-1"
                  >
                    FRED API 이용약관
                  </a>
                  을 준수합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
