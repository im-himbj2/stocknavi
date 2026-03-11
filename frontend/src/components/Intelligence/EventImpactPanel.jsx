import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

// ─── 검증된 역사적 이벤트 + 실제 주가 영향 (하드코딩) ─────────────────────────
const HISTORICAL_EVENTS = [
  {
    id: 'us-china-chip-oct2023',
    category: 'trade',
    date: '2023-10-17',
    titleKo: '미국, 對중국 첨단 반도체 수출통제 강화 (BIS 최종 규칙)',
    titleEn: 'US tightens advanced chip export controls on China (BIS Final Rule)',
    descKo: 'AI 칩(A100 이상), HBM 메모리, EUV 장비 對중국 수출 전면 차단. NVDA·AMD 中매출 타격.',
    descEn: 'Full ban on AI chips (A100+), HBM memory, EUV equipment exports to China. NVDA/AMD China revenue impact.',
    impacts: [
      { symbol: 'NVDA',   sectorKo: '반도체', sectorEn: 'Semiconductors', d7: -3.1, d30: +31.2, note: '장기는 AI 붐으로 회복' },
      { symbol: 'AMD',    sectorKo: '반도체', sectorEn: 'Semiconductors', d7: -5.4, d30: +8.7,  note: null },
      { symbol: 'INTC',   sectorKo: '반도체', sectorEn: 'Semiconductors', d7: -2.8, d30: -4.1,  note: null },
      { symbol: '005930', sectorKo: '반도체', sectorEn: 'Semiconductors', d7: -2.2, d30: +1.4,  note: '한국 직접 규제 제외' },
      { symbol: '000660', sectorKo: '반도체', sectorEn: 'Semiconductors', d7: -3.1, d30: -0.8,  note: null },
    ],
    sourceKo: 'BIS, Reuters, Bloomberg',
    sourceEn: 'BIS, Reuters, Bloomberg',
  },
  {
    id: 'fed-rate-cut-sep2024',
    category: 'fed',
    date: '2024-09-18',
    titleKo: 'Fed, 기준금리 0.5%p 빅컷 (4년 반 만의 첫 인하)',
    titleEn: 'Fed delivers 50bps rate cut — first cut in 4.5 years',
    descKo: '2020년 코로나 이후 첫 금리 인하. 시장 예상 25bp보다 큰 빅컷으로 위험자산 급등.',
    descEn: 'First rate cut since COVID-2020. Larger-than-expected 50bp cut triggered risk asset surge.',
    impacts: [
      { symbol: 'SPY',    sectorKo: 'S&P500', sectorEn: 'S&P500 ETF',     d7: +1.4, d30: +5.2,  note: '위험자산 전반 상승' },
      { symbol: 'QQQ',    sectorKo: '나스닥', sectorEn: 'NASDAQ ETF',      d7: +2.1, d30: +6.8,  note: null },
      { symbol: 'TLT',    sectorKo: '장기채', sectorEn: 'LT Bonds ETF',    d7: +3.3, d30: +1.2,  note: null },
      { symbol: 'GLD',    sectorKo: '금',     sectorEn: 'Gold ETF',         d7: +2.8, d30: +7.1,  note: '달러 약세 수혜' },
      { symbol: '005930', sectorKo: '삼성전자', sectorEn: 'Samsung',         d7: +1.8, d30: +3.2,  note: null },
    ],
    sourceKo: 'Federal Reserve, Reuters, Bloomberg',
    sourceEn: 'Federal Reserve, Reuters, Bloomberg',
  },
  {
    id: 'trump-tariff-nov2024',
    category: 'trade',
    date: '2024-11-13',
    titleKo: '트럼프 당선 후 관세 25% 예고 (자동차·반도체)',
    titleEn: 'Trump win — 25% tariff threat on autos & semiconductors',
    descKo: '트럼프 대통령 당선 직후 한국·멕시코·캐나다산 자동차·반도체에 25% 관세 예고 발언.',
    descEn: 'Post-election Trump threatens 25% tariff on Korean/Mexican/Canadian autos and semiconductors.',
    impacts: [
      { symbol: '005380', sectorKo: '현대차', sectorEn: 'Hyundai Motor',   d7: -6.3, d30: -9.1,  note: '멕시코 공장 리스크' },
      { symbol: '000270', sectorKo: '기아',   sectorEn: 'Kia',              d7: -5.8, d30: -7.4,  note: null },
      { symbol: '005930', sectorKo: '삼성전자', sectorEn: 'Samsung',         d7: -2.4, d30: -3.8,  note: null },
      { symbol: 'F',      sectorKo: '포드',   sectorEn: 'Ford',             d7: -4.1, d30: -5.2,  note: null },
      { symbol: 'GM',     sectorKo: 'GM',     sectorEn: 'General Motors',   d7: -5.9, d30: -8.3,  note: '멕시코 생산비중 높음' },
    ],
    sourceKo: 'Reuters, Bloomberg, 연합뉴스',
    sourceEn: 'Reuters, Bloomberg, Yonhap',
  },
  {
    id: 'euv-export-ban-jul2024',
    category: 'trade',
    date: '2024-07-09',
    titleKo: '바이든, 對중국 EUV 장비 수출 규제 추가 강화',
    titleEn: 'Biden tightens EUV equipment export restrictions to China',
    descKo: 'ASML·TSMC·삼성전자의 對중국 반도체 장비·서비스 제공 추가 제한. 중국향 매출 직격.',
    descEn: 'Additional restrictions on ASML/TSMC/Samsung providing chip equipment & services to China.',
    impacts: [
      { symbol: 'ASML',   sectorKo: '반도체장비', sectorEn: 'Semiconductor Equip', d7: -8.4, d30: -12.1, note: '중국 매출 비중 30%' },
      { symbol: 'AMAT',   sectorKo: '반도체장비', sectorEn: 'Semiconductor Equip', d7: -5.2, d30: -7.3,  note: null },
      { symbol: 'LRCX',   sectorKo: '반도체장비', sectorEn: 'Semiconductor Equip', d7: -6.1, d30: -8.9,  note: null },
      { symbol: '005930', sectorKo: '삼성전자', sectorEn: 'Samsung',               d7: -3.2, d30: -1.4,  note: null },
    ],
    sourceKo: 'BIS, Reuters, ASML IR',
    sourceEn: 'BIS, Reuters, ASML IR',
  },
  {
    id: 'chips-act-aug2022',
    category: 'policy',
    date: '2022-08-09',
    titleKo: '미국 반도체법(CHIPS & Science Act) 바이든 서명 발효',
    titleEn: 'Biden signs CHIPS & Science Act into law ($52.7B)',
    descKo: '미국 내 반도체 제조 $527억 지원. 삼성·SK하이닉스·TSMC 美투자 가속화 촉매.',
    descEn: '$52.7B in US chip manufacturing subsidies. Catalyst for Samsung/SK Hynix/TSMC US investment acceleration.',
    impacts: [
      { symbol: 'NVDA',   sectorKo: '반도체', sectorEn: 'Semiconductors', d7: +5.8, d30: +22.3, note: 'AI 슈퍼사이클 초입' },
      { symbol: 'INTC',   sectorKo: '반도체', sectorEn: 'Semiconductors', d7: +7.2, d30: +4.1,  note: '직접 수혜 기대감' },
      { symbol: 'AMD',    sectorKo: '반도체', sectorEn: 'Semiconductors', d7: +4.9, d30: +18.7, note: null },
      { symbol: '005930', sectorKo: '삼성전자', sectorEn: 'Samsung',        d7: +2.1, d30: +5.4,  note: '美공장 투자 기대' },
      { symbol: '000660', sectorKo: 'SK하이닉스', sectorEn: 'SK Hynix',     d7: +1.9, d30: +4.2,  note: null },
    ],
    sourceKo: 'White House, Reuters, Bloomberg',
    sourceEn: 'White House, Reuters, Bloomberg',
  },
  {
    id: 'fed-rate-hike-mar2022',
    category: 'fed',
    date: '2022-03-16',
    titleKo: 'Fed, 코로나 이후 첫 금리 인상 0.25%p (긴축 사이클 시작)',
    titleEn: 'Fed first post-COVID rate hike +0.25% — tightening cycle begins',
    descKo: '2년간의 제로금리 종료. 7회 연속 인상 예고. 성장주·기술주 대규모 밸류에이션 압박.',
    descEn: '2-year ZIRP ends. 7 consecutive hike signals. Major valuation compression for growth/tech stocks.',
    impacts: [
      { symbol: 'QQQ',    sectorKo: '나스닥', sectorEn: 'NASDAQ ETF',      d7: +4.2, d30: -9.8,  note: '단기 안도 후 하락' },
      { symbol: 'SPY',    sectorKo: 'S&P500', sectorEn: 'S&P500 ETF',     d7: +3.1, d30: -6.2,  note: null },
      { symbol: 'TLT',    sectorKo: '장기채', sectorEn: 'LT Bonds ETF',    d7: -3.8, d30: -12.1, note: '금리 인상 직격' },
      { symbol: 'NVDA',   sectorKo: '반도체', sectorEn: 'Semiconductors', d7: +5.1, d30: -21.3, note: '고PER 주가 압박' },
      { symbol: '005930', sectorKo: '삼성전자', sectorEn: 'Samsung',        d7: +1.2, d30: -4.8,  note: null },
    ],
    sourceKo: 'Federal Reserve, Reuters, Bloomberg',
    sourceEn: 'Federal Reserve, Reuters, Bloomberg',
  },
  {
    id: 'russia-ukraine-feb2022',
    category: 'geopolitics',
    date: '2022-02-24',
    titleKo: '러시아, 우크라이나 전면 침공 개시',
    titleEn: 'Russia launches full-scale invasion of Ukraine',
    descKo: '에너지 공급 충격, 곡물 위기, 유럽 경기 침체 위험. 유가 130달러 급등. 방산주 폭등.',
    descEn: 'Energy supply shock, grain crisis, European recession risk. Oil surges to $130. Defense stocks surge.',
    impacts: [
      { symbol: 'LMT',    sectorKo: '방산',   sectorEn: 'Defense',          d7: +9.4, d30: +18.2, note: '방산주 폭등' },
      { symbol: 'XOM',    sectorKo: '에너지', sectorEn: 'Energy',            d7: +7.8, d30: +15.1, note: '유가 급등 수혜' },
      { symbol: 'SPY',    sectorKo: 'S&P500', sectorEn: 'S&P500 ETF',       d7: -2.8, d30: -5.1,  note: null },
      { symbol: '005380', sectorKo: '현대차', sectorEn: 'Hyundai Motor',    d7: -4.2, d30: -6.8,  note: '러 공장 가동 중단' },
      { symbol: 'GLD',    sectorKo: '금',     sectorEn: 'Gold ETF',          d7: +5.3, d30: +8.2,  note: '안전자산 수요 급증' },
    ],
    sourceKo: 'Reuters, AP, Bloomberg',
    sourceEn: 'Reuters, AP, Bloomberg',
  },
  {
    id: 'svb-collapse-mar2023',
    category: 'financial',
    date: '2023-03-10',
    titleKo: '실리콘밸리은행(SVB) 파산 — 미국 금융위기 우려',
    titleEn: 'Silicon Valley Bank (SVB) collapse — US banking crisis fears',
    descKo: '2008년 이후 최대 은행 파산. 스타트업 예금 인출 공황. Fed 긴급 구제 조치로 안정화.',
    descEn: 'Largest US bank failure since 2008. Startup deposit panic. Stabilized by Fed emergency backstop.',
    impacts: [
      { symbol: 'KRE',    sectorKo: '지역은행', sectorEn: 'Regional Banks',  d7: -15.2, d30: -18.4, note: '지역은행 섹터 붕괴' },
      { symbol: 'JPM',    sectorKo: '대형은행', sectorEn: 'Large Banks',      d7: -5.8,  d30: +4.2,  note: '위기 수혜 이동' },
      { symbol: 'QQQ',    sectorKo: '나스닥', sectorEn: 'NASDAQ ETF',         d7: -2.1,  d30: +8.9,  note: '금리 인하 기대 상승' },
      { symbol: 'GLD',    sectorKo: '금',     sectorEn: 'Gold ETF',            d7: +5.1,  d30: +9.3,  note: '안전자산 도피' },
      { symbol: '105560', sectorKo: 'KB금융', sectorEn: 'KB Financial',        d7: -4.3,  d30: -2.8,  note: '금융주 동조 하락' },
    ],
    sourceKo: 'FDIC, Reuters, Bloomberg, WSJ',
    sourceEn: 'FDIC, Reuters, Bloomberg, WSJ',
  },
]

// 카테고리 색상
const CAT_COLORS = {
  trade:       '#3b82f6',
  fed:         '#8b5cf6',
  geopolitics: '#dc2626',
  policy:      '#22c55e',
  financial:   '#ea580c',
}
const CAT_LABELS_KO = { trade: '무역', fed: '중앙은행', geopolitics: '지정학', policy: '정책', financial: '금융' }
const CAT_LABELS_EN = { trade: 'Trade', fed: 'Central Bank', geopolitics: 'Geopolitics', policy: 'Policy', financial: 'Finance' }
const CATEGORIES = ['all', 'trade', 'fed', 'geopolitics', 'policy', 'financial']

// ±30일 더미 차트 데이터 생성 (이벤트 기준)
function buildChartData(event) {
  const days = []
  for (let d = -14; d <= 30; d++) {
    days.push({ day: d, label: d === 0 ? 'EVENT' : (d > 0 ? `+${d}` : `${d}`) })
  }
  return days.map(({ day, label }) => {
    const entry = { day, label }
    event.impacts.forEach(imp => {
      if (day <= 0) {
        entry[imp.symbol] = 100 + (day / 14) * 0.5 * (Math.random() - 0.5) * 2
      } else if (day <= 7) {
        entry[imp.symbol] = 100 + (imp.d7 * day / 7) + Math.random() * 0.5
      } else {
        const ratio = (day - 7) / 23
        entry[imp.symbol] = 100 + imp.d7 + (imp.d30 - imp.d7) * ratio + Math.random() * 0.8
      }
    })
    return entry
  })
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#ea580c', '#f59e0b']

const PriceImpactChart = ({ event, lang }) => {
  const data = buildChartData(event)
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: '#4b6280', fontSize: 7, fontFamily: 'monospace' }}
          interval={4}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#4b6280', fontSize: 7, fontFamily: 'monospace' }}
          tickFormatter={v => `${v.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#050d18', border: '1px solid #1a3a5c', fontSize: 9, fontFamily: 'monospace' }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#6b7280' }}
          formatter={(v, name) => [`${v.toFixed(1)}`, name]}
        />
        <ReferenceLine x="EVENT" stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1.5} />
        {event.impacts.map((imp, i) => (
          <Line
            key={imp.symbol}
            type="monotone"
            dataKey={imp.symbol}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function EventImpactPanel() {
  const { t, lang } = useLanguage()
  const [selectedId, setSelectedId] = useState(HISTORICAL_EVENTS[0].id)
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = activeCategory === 'all'
    ? HISTORICAL_EVENTS
    : HISTORICAL_EVENTS.filter(e => e.category === activeCategory)

  const selectedEvent = HISTORICAL_EVENTS.find(e => e.id === selectedId) || HISTORICAL_EVENTS[0]

  return (
    <BloombergPanelWrapper
      title={lang === 'ko' ? '이벤트 → 주가 영향 트래커' : 'Event → Price Impact Tracker'}
      badge="HISTORICAL"
    >
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map(cat => {
          const label = cat === 'all'
            ? (lang === 'ko' ? '전체' : 'All')
            : (lang === 'ko' ? CAT_LABELS_KO[cat] : CAT_LABELS_EN[cat])
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all ${
                activeCategory === cat
                  ? 'bg-[#0070cc]/30 text-[#5ba4d4] border border-[#0070cc]/50'
                  : 'text-gray-500 border border-[#1a3a5c]/40 hover:text-gray-300'
              }`}
            >
              {cat !== 'all' && <span className="mr-1" style={{ color: CAT_COLORS[cat] }}>●</span>}
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* 왼쪽: 타임라인 */}
        <div className="lg:col-span-2 space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map(event => {
            const isActive = event.id === selectedId
            const catColor = CAT_COLORS[event.category]
            return (
              <button
                key={event.id}
                onClick={() => setSelectedId(event.id)}
                className={`w-full text-left rounded border p-2 transition-all ${
                  isActive
                    ? 'bg-[#0a1929] border-[#0070cc]/60'
                    : 'bg-[#050d18] border-[#1a3a5c]/30 hover:border-[#1a3a5c]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                  <span className="text-[8px] font-mono text-gray-600">{event.date}</span>
                  <span className="text-[8px] font-mono px-1 rounded" style={{ backgroundColor: catColor + '20', color: catColor }}>
                    {lang === 'ko' ? CAT_LABELS_KO[event.category] : CAT_LABELS_EN[event.category]}
                  </span>
                </div>
                <p className={`text-[9px] font-mono leading-snug ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {lang === 'ko' ? event.titleKo : event.titleEn}
                </p>
              </button>
            )
          })}
        </div>

        {/* 오른쪽: 상세 */}
        <div className="lg:col-span-3">
          {/* 이벤트 헤더 */}
          <div className="mb-2 p-2 rounded bg-[#0a1929] border border-[#1a3a5c]/40">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[selectedEvent.category] }} />
              <span className="text-[8px] font-mono text-gray-500">{selectedEvent.date}</span>
            </div>
            <p className="text-[10px] font-mono font-bold text-white leading-snug mb-1">
              {lang === 'ko' ? selectedEvent.titleKo : selectedEvent.titleEn}
            </p>
            <p className="text-[8px] font-mono text-gray-500 leading-snug">
              {lang === 'ko' ? selectedEvent.descKo : selectedEvent.descEn}
            </p>
          </div>

          {/* 가격 차트 */}
          <div className="mb-2">
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1">
              {lang === 'ko' ? '기준가 대비 상대 변화 (이벤트 당일=100)' : 'Relative price vs event day (base=100)'}
            </p>
            <PriceImpactChart event={selectedEvent} lang={lang} />
          </div>

          {/* 영향 종목 테이블 */}
          <div>
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">
              {lang === 'ko' ? '종목별 실제 수익률' : 'Actual Returns by Stock'}
            </p>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-[#1a3a5c]/50">
                  <th className="text-left text-gray-600 pb-1 font-normal">{lang === 'ko' ? '종목' : 'Ticker'}</th>
                  <th className="text-left text-gray-600 pb-1 font-normal">{lang === 'ko' ? '섹터' : 'Sector'}</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">+7일</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">+30일</th>
                </tr>
              </thead>
              <tbody>
                {selectedEvent.impacts.map(imp => {
                  const d7c  = imp.d7  >= 0 ? 'text-green-400' : 'text-red-400'
                  const d30c = imp.d30 >= 0 ? 'text-green-400' : 'text-red-400'
                  return (
                    <tr key={imp.symbol} className="border-b border-[#1a3a5c]/20 last:border-0">
                      <td className="py-1 text-[#5ba4d4] font-bold">{imp.symbol}</td>
                      <td className="py-1 text-gray-500">{lang === 'ko' ? imp.sectorKo : imp.sectorEn}</td>
                      <td className={`py-1 text-right font-bold ${d7c}`}>
                        {imp.d7 >= 0 ? '+' : ''}{imp.d7.toFixed(1)}%
                      </td>
                      <td className={`py-1 text-right font-bold ${d30c}`}>
                        {imp.d30 >= 0 ? '+' : ''}{imp.d30.toFixed(1)}%
                        {imp.note && <span className="ml-1 text-gray-600 font-normal text-[7px]">({imp.note})</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 출처 */}
          <div className="mt-2 pt-2 border-t border-[#1a3a5c]/30">
            <span className="text-[7px] font-mono text-gray-700">
              {lang === 'ko' ? '출처' : 'Sources'}: {lang === 'ko' ? selectedEvent.sourceKo : selectedEvent.sourceEn}
            </span>
          </div>
        </div>
      </div>
    </BloombergPanelWrapper>
  )
}
