import { useState, useEffect, useMemo } from 'react'
import apiService from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Treemap } from 'recharts'
import SectorDetailModal from '../components/Economic/SectorDetailModal'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload.item;
    return (
      <div className="bg-gray-900 border border-white/20 p-3 rounded-lg shadow-xl">
        <p className="text-white font-bold mb-1">{data.sector}</p>
        <p className={`${parseFloat(data.changesPercentage) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {parseFloat(data.changesPercentage) > 0 ? '+' : ''}
          {parseFloat(data.changesPercentage).toFixed(2)}%
        </p>
        <p className="text-xs text-gray-500 mt-1">클릭하여 상세 정보 보기</p>
      </div>
    );
  }
  return null;
};

function EconomicIndicators() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [marketIndices, setMarketIndices] = useState(null)
  const [marketSentiment, setMarketSentiment] = useState(null)
  const [sectorRotation, setSectorRotation] = useState(null)
  const [optionsFlow, setOptionsFlow] = useState(null)
  const [macroHighlights, setMacroHighlights] = useState(null)
  const [joblessClaims, setJoblessClaims] = useState(null)
  const [consumerConfidence, setConsumerConfidence] = useState(null)
  const [retailSales, setRetailSales] = useState(null)
  const [oilPrices, setOilPrices] = useState(null)
  const [pmi, setPmi] = useState(null)
  const [activeTab, setActiveTab] = useState('sentiment')
  const [selectedSector, setSelectedSector] = useState(null)

  // 매크로 지표 로드
  const fetchMacroHighlights = async () => {
    try {
      const data = await apiService.getEconomicHighlights()
      setMacroHighlights(data)
    } catch (err) {
      console.error('매크로 지표 조회 오류:', err)
    }
  }

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

  // 추가 경제지표 로드
  const fetchAdditionalIndicators = async () => {
    try {
      const [jobless, sentiment, retail, oil, pmiData] = await Promise.all([
        apiService.getJoblessClaims(),
        apiService.getConsumerConfidence(),
        apiService.getRetailSales(),
        apiService.getOilPrices(),
        apiService.getPMI()
      ])
      setJoblessClaims(jobless)
      setConsumerConfidence(sentiment)
      setRetailSales(retail)
      setOilPrices(oil)
      setPmi(pmiData)
    } catch (err) {
      console.error('추가 경제지표 조회 오류:', err)
    }
  }

  // 초기 로드
  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      fetchMacroHighlights(),
      fetchMarketIndices(),
      fetchMarketSentiment(),
      fetchSectorRotation(),
      fetchOptionsFlow(),
      fetchAdditionalIndicators()
    ]).finally(() => setLoading(false))
  }, [])

  // 심리 지수 색상 결정
  const getSentimentInfo = (value) => {
    if (value <= 25) return { color: '#ef4444', label: '극도의 공포', desc: '시장이 침체되어 있으며, 과매도 구간입니다.' }
    if (value <= 45) return { color: '#f59e0b', label: '공포', desc: '투자심리가 위축되어 하락 압력을 받고 있습니다.' }
    if (value <= 55) return { color: '#eab308', label: '중립', desc: '시장이 방향성을 결정하기 위해 대기 중입니다.' }
    if (value <= 75) return { color: '#22c55e', label: '탐욕', desc: '상승 에너지가 강하며 투자자들이 낙관적입니다.' }
    return { color: '#16a34a', label: '극도의 탐욕', desc: '시장이 과열 상태이며 탐욕이 최고조에 달했습니다.' }
  }

  // 지표 한글 이름 맵
  const macroNameMap = {
    'GDP': { name: '경제성장률', unit: '%', desc: '국가 내에서 생산된 모든 재화와 서비스의 가치' },
    'CPI': { name: '물가상승률', unit: '%', desc: '소비자가 구입하는 상품과 서비스의 가격 변동' },
    'unemploymentRate': { name: '실업률', unit: '%', desc: '경제활동인구 중 실업자가 차지하는 비율' },
    'interestRate': { name: '기준금리', unit: '%', desc: '중앙은행이 결정하는 정책 금리' },
    'US10Y': { name: '미국채 10년', unit: '%', desc: '시장 금리의 기준점이 되는 미국 국채 수익률' }
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
      const intensity = Math.min(Math.abs(change) / 3, 1)
      return `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`
    } else if (change < 0) {
      const intensity = Math.min(Math.abs(change) / 3, 1)
      return `rgba(239, 68, 68, ${0.1 + intensity * 0.2})`
    }
    return 'rgba(107, 114, 128, 0.05)'
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
    <div className="relative min-h-screen bg-[#020617] overflow-hidden pt-24 pb-12">
      {/* 배경 장식 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 text-white tracking-tight">
              거시 경제 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">지표</span>
            </h1>
            <p className="text-gray-400 text-lg">실시간 거시 경제 데이터 및 시장 심리 분석</p>
          </div>
          <div className="text-sm text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            마지막 업데이트: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {loading && !macroHighlights && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 1. 핵심 매크로 지표 하이라이트 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {macroHighlights?.data?.map((item, idx) => {
            const info = macroNameMap[item.name] || { name: item.name, unit: '', desc: '' }
            return (
              <div
                key={idx}
                className="group p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all cursor-help relative"
                title={info.desc}
              >
                <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                  {info.name}
                  <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white tracking-tight">{item.value?.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 font-bold">{info.unit}</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">{item.date}</div>
              </div>
            )
          })}

          {/* 추가 지표 카드들 */}
          {joblessClaims?.data && joblessClaims.data.length > 0 && (
            <div className="group p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-1.5">신규 실업수당</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {Math.round(joblessClaims.data[joblessClaims.data.length - 1]?.value).toLocaleString()}
                </span>
                <span className="text-sm text-gray-500 font-bold">건</span>
              </div>
              <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">Weekly</div>
            </div>
          )}

          {consumerConfidence?.data && consumerConfidence.data.length > 0 && (
            <div className="group p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-1.5">소비자 신뢰지수</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {Number(consumerConfidence.data[consumerConfidence.data.length - 1]?.value).toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">Monthly</div>
            </div>
          )}

          {retailSales?.data && retailSales.data.length > 0 && (
            <div className="group p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-1.5">소매 판매</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white tracking-tight">
                  ${(Number(retailSales.data[retailSales.data.length - 1]?.value) / 1000).toFixed(0)}B
                </span>
              </div>
              <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">Monthly</div>
            </div>
          )}

          {oilPrices?.data && oilPrices.data.length > 0 && (
            <div className="group p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-1.5">WTI 원유</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white tracking-tight">
                  ${Number(oilPrices.data[oilPrices.data.length - 1]?.Close).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-wider">Realtime</div>
            </div>
          )}

          {!macroHighlights && Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>

        {/* 2. 시장 심리 및 주요 지수 */}
        <div className="grid lg:grid-cols-12 gap-8 mb-8">
          {/* 시장 심리 (Fear & Greed) */}
          <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
              <div className="w-32 h-32 rounded-full bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                공포탐욕지수
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 uppercase tracking-widest">실시간</div>
            </div>

            {marketSentiment?.data?.map((item, idx) => {
              const info = getSentimentInfo(item.value)
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <svg className="w-56 h-56 transform -rotate-90">
                      <circle cx="112" cy="112" r="100" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                      <circle
                        cx="112" cy="112" r="100"
                        stroke={info.color} strokeWidth="12" fill="none"
                        strokeDasharray="628" strokeDashoffset={628 - (item.value / 100) * 628}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-black text-white">{item.value}</span>
                      <span className="text-xs uppercase font-bold tracking-widest mt-1" style={{ color: info.color }}>{info.label}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-300 text-sm leading-relaxed max-w-xs">{info.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 주요 지수 그리드 */}
          <div className="lg:col-span-12 xl:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6">글로벌 지수 현황</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['US', 'KR', 'JP', 'DE', 'GB', 'CN'].map((code) => {
                const group = groupIndicesByCountry(formatMarketIndicesData(marketIndices)).find(g => g.country.code === code)
                if (!group) return null
                return (
                  <div key={code} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all overflow-hidden relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{group.country.flag}</span>
                      <span className="text-xs font-bold text-gray-400">{group.country.name}</span>
                    </div>
                    <div className="space-y-4">
                      {group.indices.map((index, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase truncate pr-1">{index.name}</span>
                            <span className={`text-[11px] font-black ${index.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-lg font-bold text-white tabular-nums tracking-tight leading-none">
                            {index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="mt-1 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${index.change >= 0 ? 'bg-green-500/50' : 'bg-red-500/50'}`}
                              style={{ width: `${Math.min(Math.abs(index.change) * 20, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3. 섹터 로테이션 및 옵션 플로우 (탭 형식) */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
          <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-4">
            <button
              onClick={() => setActiveTab('sentiment')}
              className={`text-lg font-bold pb-2 transition-all relative ${activeTab === 'sentiment' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              섹터 로테이션
              {activeTab === 'sentiment' && <div className="absolute bottom-[-17px] left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`text-lg font-bold pb-2 transition-all relative ${activeTab === 'flow' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              옵션 플로우
              {activeTab === 'flow' && <div className="absolute bottom-[-17px] left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>}
            </button>
          </div>

          {activeTab === 'sentiment' && sectorRotation?.data && (
            <div className="animate-fade-in">
              <div className="h-[400px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={sectorRotation.data
                      .filter(item => item && item.change_percent !== undefined && item.change_percent !== null)
                      .map(item => ({
                        name: item.name || item.sector, // Backend name field
                        size: Math.abs(parseFloat(item.change_percent || 0)) + 1,
                        item: item
                      }))}
                    dataKey="size"
                    stroke="#1f2937"
                    fill="#8884d8"
                    content={(props) => {
                      const { x, y, width, height, payload, name } = props;
                      // payload나 item이 없는 경우 안전하게 처리
                      if (!payload || !payload.item) return null;

                      const item = payload.item;
                      let percent = 0;
                      if (item.change_percent !== undefined && item.change_percent !== null) {
                        if (typeof item.change_percent === 'string') {
                          percent = parseFloat(item.change_percent.replace('%', ''));
                        } else {
                          percent = parseFloat(item.change_percent);
                        }
                      }

                      if (isNaN(percent)) percent = 0;

                      let fillColor = percent >= 0 ? '#10b981' : '#ef4444';
                      const opacity = Math.min(Math.abs(percent) / 3 + 0.3, 1);

                      return (
                        <g>
                          <rect
                            x={x} y={y} width={width} height={height}
                            fill={fillColor} fillOpacity={opacity}
                            stroke="#111827" strokeWidth={2} rx={4} ry={4}
                            onClick={() => setSelectedSector(item)}
                            style={{ cursor: 'pointer' }}
                          />
                          {width > 60 && height > 40 && (
                            <>
                              <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold" pointerEvents="none">{name}</text>
                              <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="#fff" fontSize={11} pointerEvents="none">{percent > 0 ? '+' : ''}{percent.toFixed(2)}%</text>
                            </>
                          )}
                        </g>
                      );
                    }}
                  >
                    <Tooltip content={<CustomTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'flow' && optionsFlow?.data && (
            <div className="animate-fade-in grid md:grid-cols-2 gap-4">
              {optionsFlow.data.map((option, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 group hover:border-white/20 transition-all relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none ${option.sentiment === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">{option.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${option.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {option.sentiment === 'bullish' ? '강세' : '약세'}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs font-mono">{option.expiry}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 relative z-10">
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">행사가</div>
                      <div className="text-lg font-bold text-white">${option.strike}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">프리미엄</div>
                      <div className="text-lg font-bold text-white">${option.premium}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">거래량</div>
                      <div className="text-lg font-bold text-white">{option.volume.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 섹터 상세 모달 */}
      {selectedSector && (
        <SectorDetailModal
          sector={selectedSector}
          onClose={() => setSelectedSector(null)}
        />
      )}


    </div>
  )
}

export default EconomicIndicators
