import { useState, useEffect, useMemo } from 'react'
import apiService from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

function EconomicIndicators() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [marketIndices, setMarketIndices] = useState(null)
  const [marketSentiment, setMarketSentiment] = useState(null)
  const [sectorRotation, setSectorRotation] = useState(null)
  const [optionsFlow, setOptionsFlow] = useState(null)

  // 시장 지수 로드
  const fetchMarketIndices = async () => {
    try {
      const data = await apiService.getMarketIndices()
      setMarketIndices(data)
    } catch (err) {
      console.error('시장 지수 조회 오류:', err)
    }
  }

  // 시장 심리 지수 로드
  const fetchMarketSentiment = async () => {
    try {
      const data = await apiService.getMarketSentiment()
      setMarketSentiment(data)
    } catch (err) {
      console.error('시장 심리 지수 조회 오류:', err)
    }
  }

  // 섹터 로테이션 로드
  const fetchSectorRotation = async () => {
    try {
      const data = await apiService.getSectorRotation()
      setSectorRotation(data)
    } catch (err) {
      console.error('섹터 로테이션 조회 오류:', err)
    }
  }

  // 옵션 플로우 로드
  const fetchOptionsFlow = async () => {
    try {
      const data = await apiService.getOptionsFlow()
      setOptionsFlow(data)
    } catch (err) {
      console.error('옵션 플로우 조회 오류:', err)
    }
  }

  // 초기 로드
  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      fetchMarketIndices(),
      fetchMarketSentiment(),
      fetchSectorRotation(),
      fetchOptionsFlow()
    ]).finally(() => setLoading(false))
  }, [])

  // 심리 지수 색상 결정
  const getSentimentColor = (value) => {
    if (value >= 75) return '#ef4444' // Extreme Fear (빨강)
    if (value >= 55) return '#f59e0b' // Fear (주황)
    if (value >= 45) return '#eab308' // Neutral (노랑)
    if (value >= 25) return '#22c55e' // Greed (초록)
    return '#16a34a' // Extreme Greed (진한 초록)
  }

  const getSentimentLabel = (value) => {
    if (value >= 75) return 'Extreme Fear'
    if (value >= 55) return 'Fear'
    if (value >= 45) return 'Neutral'
    if (value >= 25) return 'Greed'
    return 'Extreme Greed'
  }

  // 심볼로 국가 판단
  const getCountryFromSymbol = (symbol) => {
    const sym = (symbol || '').toUpperCase()
    if (sym.includes('GSPC') || sym.includes('IXIC') || sym.includes('DJI') || sym.includes('RUT') || sym.includes('SPX')) {
      return { code: 'US', name: '미국', flag: '🇺🇸' }
    }
    if (sym.includes('KS11') || sym.includes('KOSPI') || sym.includes('KQ11') || sym.includes('KOSDAQ')) {
      return { code: 'KR', name: '한국', flag: '🇰🇷' }
    }
    if (sym.includes('N225') || sym.includes('NIKKEI')) {
      return { code: 'JP', name: '일본', flag: '🇯🇵' }
    }
    if (sym.includes('GDAXI') || sym.includes('DAX') || sym.includes('TECDAX')) {
      return { code: 'DE', name: '독일', flag: '🇩🇪' }
    }
    if (sym.includes('FTSE')) {
      return { code: 'GB', name: '영국', flag: '🇬🇧' }
    }
    if (sym.includes('SSEC') || sym.includes('SHANGHAI') || sym.includes('HSI')) {
      return { code: 'CN', name: '중국/홍콩', flag: '🇨🇳' }
    }
    return { code: 'GLOBAL', name: '글로벌', flag: '🌍' }
  }

  // 국가별 배경 색상
  const getCountryColor = (change) => {
    if (change > 0) {
      const intensity = Math.min(Math.abs(change) / 5, 1)
      return `rgba(34, 197, 94, ${0.2 + intensity * 0.3})`
    } else if (change < 0) {
      const intensity = Math.min(Math.abs(change) / 5, 1)
      return `rgba(239, 68, 68, ${0.2 + intensity * 0.3})`
    }
    return 'rgba(107, 114, 128, 0.1)'
  }

  // 표시 이름 맵
  const symbolDisplayName = {
    GSPC: 'S&P 500',
    DJI: 'DOW',
    IXIC: 'NASDAQ',
    RUT: 'Russell 2000',
    KS11: 'KOSPI',
    KQ11: 'KOSDAQ',
    N225: 'Nikkei 225',
    GDAXI: 'DAX 40',
    TECDAX: 'TecDAX',
    FTSE: 'FTSE 100',
    SSEC: '상하이 종합',
    HSI: '항셍'
  }

  const formatMarketIndicesData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) return []
    
    return data.data.map(item => {
      const rawSymbol = item.symbol || item.Symbol || 'N/A'
      const symbol = rawSymbol.replace('^', '')
      const country = getCountryFromSymbol(symbol)
      return {
        name: symbolDisplayName[symbol] || symbol,
        rawSymbol: symbol,
        value: parseFloat(item.price || item.Price || item.value || 0),
        change: parseFloat(item.change || item.Change || item.changePercent || 0),
        country: country
      }
    }).filter(item => !Number.isNaN(item.value))
  }

  // 국가별로 그룹화
  const groupIndicesByCountry = (indices) => {
    const grouped = {}
    indices.forEach(index => {
      const countryCode = index.country.code
      if (!grouped[countryCode]) {
        grouped[countryCode] = {
          country: index.country,
          indices: []
        }
      }
      grouped[countryCode].indices.push(index)
    })
    return Object.values(grouped).filter(g => g.indices.length > 0)
  }

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* 헤더 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            경제 지표
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            실시간 경제 데이터와 시장 동향을 한눈에 파악하세요
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-400">경제 지표를 불러오는 중...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 시장 심리 지수 */}
        {marketSentiment && marketSentiment.data && marketSentiment.data.length > 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">시장 심리 지수 (Fear & Greed Index)</h2>
            {marketSentiment.data.map((item, idx) => {
              const value = item.value || 50
              const color = getSentimentColor(value)
              const label = getSentimentLabel(value)
              
              return (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold mb-2" style={{ color }}>
                        {value}
                      </div>
                      <div className="text-lg text-gray-300">{label}</div>
                    </div>
                    <div className="w-32 h-32 relative">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke={color}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(value / 100) * 351.86} 351.86`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 섹터 로테이션 */}
        {sectorRotation && sectorRotation.data && sectorRotation.data.length > 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">섹터 로테이션 분석</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sectorRotation.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="change_percent" name="변동률 (%)">
                  {sectorRotation.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.change_percent >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sectorRotation.data.map((sector, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    sector.change_percent >= 0
                      ? 'bg-green-900/20 border-green-500/50'
                      : 'bg-red-900/20 border-red-500/50'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{sector.name}</div>
                  <div className={`text-lg font-bold ${
                    sector.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {sector.change_percent >= 0 ? '+' : ''}{sector.change_percent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-400">{sector.symbol}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 옵션 플로우 */}
        {optionsFlow && optionsFlow.data && optionsFlow.data.length > 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">옵션 플로우 분석</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {optionsFlow.data.map((option, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    option.sentiment === 'bullish'
                      ? 'bg-green-900/20 border-green-500/50'
                      : 'bg-red-900/20 border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-white">{option.symbol}</div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      option.sentiment === 'bullish'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {option.type.toUpperCase()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-400">Strike</div>
                      <div className="text-white font-semibold">${option.strike}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Volume</div>
                      <div className="text-white font-semibold">{option.volume.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Premium</div>
                      <div className="text-white font-semibold">${option.premium}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Expiry</div>
                      <div className="text-white font-semibold">{option.expiry}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시장 지수 */}
        {marketIndices && formatMarketIndicesData(marketIndices).length > 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4 text-white">주요 시장 지수</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {['US','KR','JP','DE','GB','CN'].map((code) => {
                const group = groupIndicesByCountry(formatMarketIndicesData(marketIndices)).find(g => g.country.code === code)
                if (!group) return null
                return (
                  <div key={code} className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
                      <span className="text-base">{group.country.flag}</span>
                      <span className="text-xs font-semibold text-white">{group.country.name}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.indices.map((index, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-md p-2 border border-white/10 hover:border-white/20 transition-all"
                          style={{ backgroundColor: getCountryColor(index.change) }}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="text-[10px] font-medium text-gray-300 truncate">{index.name}</div>
                            <div className={`text-[10px] font-bold whitespace-nowrap ml-1 ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-sm font-bold text-white truncate">
                            {index.value.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EconomicIndicators
