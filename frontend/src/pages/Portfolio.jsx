import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { getSubscriptionStatus } from '../utils/subscription'
import { majorStocks } from '../data/stockList'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

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
  const priceUpdateIntervalRef = useRef(null)
  const portfolioItemsRef = useRef(portfolioItems)
  
  // 폼 상태
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    averagePrice: '',
    notes: ''
  })

  // 포트폴리오 로드
  const fetchPortfolio = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await apiService.getPortfolio()
      setPortfolioItems(items)
      // 가격 정보 가져오기
      if (items.length > 0) {
        await fetchStockPrices(items)
      }
    } catch (err) {
      setError(err.message)
      console.error('포트폴리오 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 주식 가격 가져오기
  const fetchStockPrices = async (items) => {
    try {
      const symbols = items.map(item => {
        // 한국 종목 처리
        const symbol = item.symbol
        if (symbol.match(/^\d+$/)) {
          return `${symbol}.KS`
        }
        return symbol
      })

      const pricePromises = symbols.map(async (symbol, idx) => {
        try {
          // yfinance를 통한 가격 조회는 백엔드에서 해야 하므로
          // 기업 분석 API를 사용하여 현재가 가져오기
          const analysis = await apiService.getCompanyAnalysis(symbol.replace('.KS', ''), false)
          const price = analysis?.company_info?.currentPrice
          const fallback = items[idx]?.average_price || 0
          return {
            symbol: symbol.replace('.KS', ''),
            price: price && price > 0 ? price : fallback, // 가격 실패 시 평균단가로 폴백
            change: analysis?.company_info?.priceChange || 0,
            changePercent: analysis?.company_info?.priceChangePercent || 0
          }
        } catch (err) {
          console.error(`가격 조회 실패 (${symbol}):`, err)
          return {
            symbol: symbol.replace('.KS', ''),
            price: items[idx]?.average_price || 0, // 폴백
            change: 0,
            changePercent: 0
          }
        }
      })

      const prices = await Promise.all(pricePromises)
      const priceMap = {}
      prices.forEach(p => {
        priceMap[p.symbol] = p
      })
      setStockPrices(priceMap)
    } catch (err) {
      console.error('가격 조회 오류:', err)
    }
  }

  // 종목 추가
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!formData.symbol || !formData.quantity || !formData.averagePrice) {
      setError('모든 필수 항목을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiService.addPortfolioItem(
        formData.symbol,
        formData.quantity,
        formData.averagePrice,
        formData.notes
      )
      setFormData({ symbol: '', quantity: '', averagePrice: '', notes: '' })
      setShowAddForm(false)
      await fetchPortfolio()
    } catch (err) {
      // 프리미엄 제한 오류인 경우 특별 처리
      if (err.message && err.message.includes('최대')) {
        setError(`${err.message} 프리미엄으로 업그레이드하시면 무제한 포트폴리오가 가능합니다.`)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // 종목 삭제
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('이 종목을 포트폴리오에서 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiService.deletePortfolioItem(itemId)
      await fetchPortfolio()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  useEffect(() => {
    if (formData.symbol.trim()) {
      const filtered = majorStocks.filter(
        stock => 
          stock.symbol.toLowerCase().includes(formData.symbol.toLowerCase()) ||
          stock.name.toLowerCase().includes(formData.symbol.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [formData.symbol])

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

  // 구독 상태 확인
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

  // 초기 로드
  useEffect(() => {
    fetchPortfolio()
  }, [])

  // portfolioItems ref 업데이트 (최신 값 유지)
  useEffect(() => {
    portfolioItemsRef.current = portfolioItems
  }, [portfolioItems])

  // 실시간 가격 업데이트 (30초마다)
  useEffect(() => {
    if (portfolioItems.length > 0) {
      // 첫 로드
      fetchStockPrices(portfolioItems)
      
      // 30초마다 업데이트
      priceUpdateIntervalRef.current = setInterval(() => {
        // ref를 통해 최신 portfolioItems 사용
        fetchStockPrices(portfolioItemsRef.current)
      }, 30000)
      
      return () => {
        if (priceUpdateIntervalRef.current) {
          clearInterval(priceUpdateIntervalRef.current)
          priceUpdateIntervalRef.current = null
        }
      }
    }
  }, [portfolioItems.length]) // portfolioItems.length만 의존성으로 사용하여 무한 루프 방지

  // 수익률 계산
  const calculateProfit = (item) => {
    const price = stockPrices[item.symbol]?.price
    const cost = item.average_price * item.quantity
    if (!price || price <= 0) {
      return { profit: 0, profitPercent: 0, totalValue: cost, cost, price: 0, priceMissing: true }
    }
    
    const totalValue = price * item.quantity
    const profit = totalValue - cost
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0
    
    return { profit, profitPercent, totalValue, cost, price, priceMissing: false }
  }

  // 총 포트폴리오 가치 계산
  const totalPortfolioValue = portfolioItems.reduce((sum, item) => {
    const { totalValue } = calculateProfit(item)
    return sum + totalValue
  }, 0)

  const totalCost = portfolioItems.reduce((sum, item) => {
    return sum + (item.average_price * item.quantity)
  }, 0)

  const totalProfit = totalPortfolioValue - totalCost
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  // 한국 주식 여부 확인
  const isKoreanStock = (symbol) => {
    return symbol.match(/^\d+$/) !== null
  }

  // 파이차트 데이터 준비
  const pieChartData = portfolioItems.map((item) => {
    const { totalValue } = calculateProfit(item)
    return {
      name: item.symbol,
      value: totalValue,
      quantity: item.quantity
    }
  }).filter(item => item.value > 0)

  // 색상 팔레트
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0']

  // 시간대별 추이 데이터 (간단한 예시 - 실제로는 히스토리 데이터 필요)
  const timeSeriesData = portfolioItems.map((item, index) => {
    const { totalValue } = calculateProfit(item)
    return {
      date: `Day ${index + 1}`,
      value: totalValue,
      symbol: item.symbol
    }
  })

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* 헤더 */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              포트폴리오
            </h1>
            {isPremium && (
              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-xs font-semibold text-yellow-400">
                프리미엄
              </span>
            )}
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            보유 주식을 관리하고 실시간 수익률을 추적하세요
          </p>
          {!isPremium && (
            <p className="mt-2 text-sm text-gray-500">
              무료 사용자는 최대 10개까지 포트폴리오에 추가할 수 있습니다. <Link to="/subscription" className="text-blue-400 hover:text-blue-300 underline">프리미엄으로 업그레이드</Link>
            </p>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 총 포트폴리오 요약 */}
        {portfolioItems.length > 0 && (
          <>
            <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-400 mb-1">총 투자금</div>
                  <div className="text-2xl font-bold text-white">
                    {isKoreanStock(portfolioItems[0]?.symbol) ? 
                      `${Math.round(totalCost).toLocaleString()}원` : 
                      `$${totalCost.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">총 평가액</div>
                  <div className="text-2xl font-bold text-white">
                    {isKoreanStock(portfolioItems[0]?.symbol) ? 
                      `${Math.round(totalPortfolioValue).toLocaleString()}원` : 
                      `$${totalPortfolioValue.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">총 수익</div>
                  <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {isKoreanStock(portfolioItems[0]?.symbol) ? 
                      `${totalProfit >= 0 ? '+' : ''}${Math.round(totalProfit).toLocaleString()}원` : 
                      `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">수익률</div>
                  <div className={`text-2xl font-bold ${totalProfitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 차트 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 파이차트 - 자산 배분 */}
              {pieChartData.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 text-white">자산 배분</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => {
                          const isKR = isKoreanStock(pieChartData[0]?.name)
                          return isKR ? `${Math.round(value).toLocaleString()}원` : `$${value.toFixed(2)}`
                        }}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 성과 분석 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 text-white">성과 분석</h3>
                <div className="space-y-4">
                  {portfolioItems.map((item) => {
                    const { profit, profitPercent, totalValue } = calculateProfit(item)
                    const percentage = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-semibold">{item.symbol}</span>
                            <span className={`text-sm font-bold ${profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${profitPercent >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            비중: {percentage.toFixed(1)}% | 수익: {isKoreanStock(item.symbol) ? 
                              `${Math.round(profit).toLocaleString()}원` : 
                              `$${profit.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 종목 추가 버튼 */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">보유 종목</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            {showAddForm ? '취소' : '+ 종목 추가'}
          </button>
        </div>

        {/* 종목 추가 폼 */}
        {showAddForm && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-white">새 종목 추가</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative" ref={searchRef}>
                  <label className="block text-sm font-medium mb-2 text-gray-300">종목 심볼 *</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder="예: AAPL, 005930"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, symbol: suggestion.symbol })
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
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">보유 수량 *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="예: 10"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">평균 매수가 *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.averagePrice}
                    onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
                    placeholder="예: 150.00"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">메모 (선택)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="메모를 입력하세요"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '추가 중...' : '추가하기'}
              </button>
            </form>
          </div>
        )}

        {/* 포트폴리오 목록 */}
        {loading && portfolioItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-400">포트폴리오를 불러오는 중...</p>
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-gray-400 mb-4">포트폴리오가 비어있습니다.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              첫 종목 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {portfolioItems.map((item) => {
              const { profit, profitPercent, totalValue, priceMissing } = calculateProfit(item)
              const price = stockPrices[item.symbol]?.price || 0
              const change = stockPrices[item.symbol]?.change || 0
              const changePercent = stockPrices[item.symbol]?.changePercent || 0
              const isKR = isKoreanStock(item.symbol)

              return (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-2xl font-bold text-white">{item.symbol}</h3>
                        {price > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-white">
                              {isKR ? `${Math.round(price).toLocaleString()}원` : `$${price.toFixed(2)}`}
                            </span>
                            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-400">실시간 가격을 불러오지 못했습니다. 평균단가로 표시 중.</div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400 mb-1">보유 수량</div>
                          <div className="text-white font-semibold">{item.quantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">평균 매수가</div>
                          <div className="text-white font-semibold">
                            {isKR ? `${Math.round(item.average_price).toLocaleString()}원` : `$${item.average_price.toFixed(2)}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">평가액</div>
                          <div className="text-white font-semibold">
                            {isKR ? `${Math.round(totalValue).toLocaleString()}원` : `$${totalValue.toFixed(2)}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">수익률</div>
                          <div className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceMissing ? 'N/A' : `${profit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`}
                          </div>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="mt-2 text-sm text-gray-400">
                          <span className="font-medium">메모:</span> {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Portfolio
