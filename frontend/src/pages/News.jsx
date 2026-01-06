import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api'

function News() {
  const [country, setCountry] = useState('us')
  const [searchSymbol, setSearchSymbol] = useState('')
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newsData, setNewsData] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)

  // 주요 주식 목록 (자동완성용) - 한국어 이름 포함
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
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
    { symbol: 'HD', name: 'The Home Depot Inc.' },
    { symbol: 'DIS', name: 'The Walt Disney Company' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'ADBE', name: 'Adobe Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'CRM', name: 'Salesforce Inc.' },
    { symbol: 'INTC', name: 'Intel Corporation' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
    { symbol: 'NKE', name: 'Nike Inc.' },
    { symbol: 'T', name: 'AT&T Inc.' },
    { symbol: 'VZ', name: 'Verizon Communications Inc.' },
    { symbol: 'KO', name: 'The Coca-Cola Company' },
    { symbol: 'PEP', name: 'PepsiCo Inc.' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation' },
    { symbol: 'ABBV', name: 'AbbVie Inc.' },
    { symbol: 'AVGO', name: 'Broadcom Inc.' },
    // 한국 주요 종목
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
    { symbol: '035420', name: 'NAVER' },
    { symbol: '051910', name: 'LG화학' },
    { symbol: '006400', name: '삼성SDI' },
    { symbol: '035720', name: '카카오' },
    { symbol: '005380', name: '현대차' },
    { symbol: '003670', name: '포스코홀딩스' },
    { symbol: '028260', name: '삼성물산' },
    { symbol: '105560', name: 'KB금융' },
    { symbol: '032830', name: '삼성생명' },
    { symbol: '055550', name: '신한지주' },
    { symbol: '096770', name: 'SK이노베이션' },
    { symbol: '017670', name: 'SK텔레콤' },
    { symbol: '034730', name: 'SK' },
    { symbol: '000270', name: '기아' },
    { symbol: '003490', name: '대한항공' },
    { symbol: '006800', name: '미래에셋증권' },
    { symbol: '009150', name: '삼성전기' },
    { symbol: '012330', name: '현대모비스' }
  ]

  useEffect(() => {
    if (searchSymbol.trim()) {
      const searchLower = searchSymbol.toLowerCase()
      const filtered = majorStocks.filter(stock => {
        const symbolMatch = stock.symbol.toLowerCase().includes(searchLower)
        const nameMatch = stock.name.toLowerCase().includes(searchLower)
        const koreanMatch = stock.name.includes(searchSymbol)
        return symbolMatch || nameMatch || koreanMatch
      }).slice(0, 10)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchSymbol])

  // 외부 클릭 시 드롭다운 닫기
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

  useEffect(() => {
    fetchNews()
  }, [country])

  const fetchNews = async () => {
    setLoading(true)
    setError(null)
    setNewsData(null)

    try {
      console.log('[News] 뉴스 조회 시작:', { symbol, country })
      const data = await apiService.getNews(symbol || null, country, 30)
      console.log('[News] 뉴스 조회 성공:', data)
      setNewsData(data)
      
      if (!data || !data.news || data.news.length === 0) {
        setError('뉴스가 없습니다. 다른 종목이나 지역을 시도해보세요.')
      }
    } catch (err) {
      console.error('[News] 뉴스 조회 오류:', err)
      console.error('[News] 오류 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      setError(err.message || '뉴스 조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchNews()
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

  const getSentimentText = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return '긍정'
      case 'negative':
        return '부정'
      default:
        return '중립'
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
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            실시간 뉴스
          </h1>
          <p className="text-xl text-gray-400">
            최신 주식 시장 뉴스와 기업 소식을 확인하세요
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1" ref={searchRef}>
                <label className="block text-sm font-medium mb-2 text-gray-300">종목 심볼 (선택)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchSymbol}
                    onChange={(e) => {
                      setSearchSymbol(e.target.value.toUpperCase())
                      setSymbol(e.target.value.toUpperCase())
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    placeholder="예: AAPL, MSFT, 삼성전자, 005930 (비워두면 전체 뉴스)"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSymbol(suggestion.symbol)
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
              <div className="md:w-48">
                <label className="block text-sm font-medium mb-2 text-gray-300">지역</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="us">해외 (US)</option>
                  <option value="kr">한국 (KR)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? '조회 중...' : '조회'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 뉴스 리스트 */}
        {newsData && newsData.news && newsData.news.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {newsData.symbol ? `${newsData.symbol} 관련 뉴스` : '최신 뉴스'}
              </h2>
              <span className="text-sm text-gray-400">
                총 {newsData.total}개
              </span>
            </div>

            <div className="grid gap-4">
              {newsData.news.map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex gap-6">
                    {item.thumbnail && (
                      <div className="flex-shrink-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-32 h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        {item.sentiment && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getSentimentColor(item.sentiment)}`}>
                            {getSentimentText(item.sentiment)}
                          </span>
                        )}
                      </div>
                      {item.summary && (
                        <p className="text-gray-400 mb-3 line-clamp-2">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{item.publisher}</span>
                        <span>•</span>
                        <span>{formatDate(item.published_at)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : newsData && newsData.news && newsData.news.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">뉴스가 없습니다.</p>
          </div>
        ) : null}

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">뉴스를 불러오는 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default News

