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

  // 주식 가격 가져오기 (배치 방식)
  const fetchStockPrices = async (items) => {
    if (!items || items.length === 0) return

    try {
      const symbols = items.map(item => {
        const symbol = item.symbol
        if (symbol.match(/^\d+$/)) {
          return `${symbol}.KS`
        }
        return symbol
      })

      // 배치 API 호출
      const priceMapRaw = await apiService.getPortfolioPrices(symbols)

      const priceMap = {}
      items.forEach(item => {
        const fullSymbol = item.symbol.match(/^\d+$/) ? `${item.symbol}.KS` : item.symbol
        const priceData = priceMapRaw[fullSymbol] || priceMapRaw[item.symbol]

        priceMap[item.symbol] = {
          symbol: item.symbol,
          price: priceData?.price || item.average_price,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || 0
        }
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
      const newItem = await apiService.addPortfolioItem(
        formData.symbol,
        formData.quantity,
        formData.averagePrice,
        formData.notes
      )

      // 상태 업데이트로 즉시 반영 (새로고침 제거)
      setPortfolioItems(prev => [...prev, newItem])

      // 새로운 종목의 가격 정보도 가져오기
      await fetchStockPrices([...portfolioItems, newItem])

      setFormData({ symbol: '', quantity: '', averagePrice: '', notes: '' })
      setShowAddForm(false)

      // 성공 알림 (선택 사항, 여기선 생략하거나 로깅)
      console.log('종목 추가 성공:', newItem)
    } catch (err) {
      if (err.message && err.message.includes('최대')) {
        setError(`${err.message} 프리미엄으로 업그레이드하시면 무제한 포트폴리오가 가능합니다.`)
      } else {
        setError(err.message || '종목 추가 중 오류가 발생했습니다.')
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
      fetchPortfolio()
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

  // 초기 로드
  useEffect(() => {
    const init = async () => {
      const status = await getSubscriptionStatus()
      setIsPremium(status.is_active && status.tier === 'premium')
      fetchPortfolio()
    }
    init()
  }, [])

  // 실시간 가격 업데이트 (60초마다)
  useEffect(() => {
    if (portfolioItems.length > 0) {
      const timer = setInterval(() => {
        fetchStockPrices(portfolioItems)
      }, 60000)
      return () => clearInterval(timer)
    }
  }, [portfolioItems])

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

  const isKoreanStock = (symbol) => symbol?.match(/^\d+$/) !== null

  // 차트 데이터
  const pieChartData = portfolioItems.map((item) => {
    const { totalValue } = calculateProfit(item)
    return { name: item.symbol, value: totalValue }
  }).filter(item => item.value > 0)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  return (
    <div className="min-h-screen bg-[#020617] pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 상단 요약 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">총 자산</div>
            <div className="text-3xl font-black text-white mb-2">
              {isKoreanStock(portfolioItems[0]?.symbol) ? `₩${Math.round(totalPortfolioValue).toLocaleString()}` : `$${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </div>
            <div className={`text-sm font-bold flex items-center gap-1 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? '▲' : '▼'} {Math.abs(totalProfitPercent).toFixed(2)}%
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">총 매수 금액</div>
              <div className="text-xl font-bold text-white">
                {isKoreanStock(portfolioItems[0]?.symbol) ? `₩${Math.round(totalCost).toLocaleString()}` : `$${totalCost.toFixed(2)}`}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">총 수익</div>
              <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{isKoreanStock(portfolioItems[0]?.symbol) ? `${Math.round(totalProfit).toLocaleString()}` : totalProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl hidden md:block">
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">보유 종목 수</div>
              <div className="text-xl font-bold text-white">{portfolioItems.length} 종목</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* 자산 배분 도넛 차트 */}
          <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter">자산 배분</h3>
            <div className="h-[280px] w-full relative">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-600 font-bold uppercase tracking-widest text-xs">데이터 없음</div>
              )}
              {/* 중앙 정보 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">비중 1위</div>
                <div className="text-sm font-black text-white">{pieChartData[0]?.name || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieChartData.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-[10px] font-bold text-gray-400">{item.name}</span>
                  <span className="text-[10px] font-black text-white ml-auto">{((item.value / totalPortfolioValue) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 종목별 상세 리스트 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">보유 종목 리스트</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                {showAddForm ? '닫기' : '+ 종목 추가'}
              </button>
            </div>

            {showAddForm && (
              <div className="bg-white/10 border border-white/20 rounded-3xl p-6 animate-fade-in">
                <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative" ref={searchRef}>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                      placeholder="심볼 (AAPL, 005930)"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        {suggestions.map((s, i) => (
                          <div
                            key={i}
                            onClick={() => { setFormData({ ...formData, symbol: s.symbol }); setShowSuggestions(false); }}
                            className="px-4 py-2 hover:bg-white/5 cursor-pointer text-xs flex justify-between"
                          >
                            <span className="text-white font-bold">{s.symbol}</span>
                            <span className="text-gray-500">{s.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number" step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="보유 수량"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="number" step="0.01"
                    value={formData.averagePrice}
                    onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
                    placeholder="평균 단가"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <div className="md:col-span-3 flex gap-2">
                    <button type="submit" className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:bg-gray-200 transition-all">저장하기</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {portfolioItems.map((item) => {
                const { profit, profitPercent, totalValue, price } = calculateProfit(item)
                const isKR = isKoreanStock(item.symbol)

                return (
                  <div key={item.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-lg font-black text-white group-hover:bg-blue-500 group-hover:text-white transition-all">
                          {item.symbol[0]}
                        </div>
                        <div>
                          <div className="text-lg font-black text-white">{item.symbol}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.quantity} 주</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-500 font-bold uppercase">현재가</div>
                          <div className="text-sm font-black text-white">{isKR ? `₩${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 font-bold uppercase">평가손익</div>
                          <div className={`text-sm font-black ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* 하단 바 (수익률 시각화) */}
                    <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                      <div
                        className={`h-full transition-all duration-1000 ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(profitPercent), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}

              {portfolioItems.length === 0 && (
                <div className="bg-white/5 border border-dashed border-white/20 rounded-3xl p-20 text-center">
                  <span className="text-4xl mb-4 block">📈</span>
                  <div className="text-lg font-black text-white mb-1">포트폴리오가 비어 있습니다</div>
                  <p className="text-gray-500 text-sm">추적하고 싶은 종목을 추가하여 성과를 관리하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Portfolio
