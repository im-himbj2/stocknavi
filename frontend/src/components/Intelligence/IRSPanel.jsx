import React, { useState, useMemo } from 'react'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

// ─── IRS 계산용 하드코딩 데이터 ────────────────────────────────────────────────
// 지정학 리스크 점수 (본사/주요 생산기지 기반)
const GEOPOLITICAL_SCORES = {
  // 대만 기반 (TSMC 의존, 긴장)
  'TSM':    { geo: 78, supply: 92, macro: 55, news: 65 },
  // 한국 기반 (반도체, 평택)
  '005930': { geo: 52, supply: 70, macro: 58, news: 48 },
  '000660': { geo: 55, supply: 68, macro: 58, news: 52 },
  // 미국 빅테크
  'NVDA':   { geo: 35, supply: 72, macro: 52, news: 55 },
  'AAPL':   { geo: 45, supply: 78, macro: 50, news: 42 },
  'MSFT':   { geo: 25, supply: 30, macro: 52, news: 28 },
  'GOOGL':  { geo: 28, supply: 32, macro: 52, news: 35 },
  'META':   { geo: 22, supply: 25, macro: 52, news: 40 },
  'AMZN':   { geo: 30, supply: 35, macro: 52, news: 38 },
  'AMD':    { geo: 38, supply: 65, macro: 52, news: 48 },
  'INTC':   { geo: 32, supply: 52, macro: 52, news: 60 },
  'QCOM':   { geo: 42, supply: 68, macro: 52, news: 45 },
  // 자동차 (관세 위험)
  '005380': { geo: 55, supply: 62, macro: 58, news: 65 },
  '000270': { geo: 55, supply: 60, macro: 58, news: 62 },
  'TSLA':   { geo: 45, supply: 65, macro: 55, news: 72 },
  // 에너지
  'XOM':    { geo: 68, supply: 45, macro: 62, news: 42 },
  // 배터리
  '373220': { geo: 55, supply: 75, macro: 58, news: 45 },
  '006400': { geo: 55, supply: 72, macro: 58, news: 48 },
  // ETF (낮은 위험)
  'SPY':    { geo: 25, supply: 25, macro: 50, news: 30 },
  'QQQ':    { geo: 28, supply: 32, macro: 52, news: 35 },
}

// 기본값 (등록되지 않은 종목)
const DEFAULT_SCORES = { geo: 45, supply: 50, macro: 55, news: 45 }

// IRS 계산 (지정학30% + 공급망25% + 거시25% + 뉴스20%)
function calcIRS(scores) {
  return Math.round(
    scores.geo    * 0.30 +
    scores.supply * 0.25 +
    scores.macro  * 0.25 +
    scores.news   * 0.20
  )
}

// 위험 레벨
function getRiskLevel(irs) {
  if (irs >= 80) return { level: 'CRITICAL', color: '#dc2626', labelKo: '매우 위험', emoji: '🔴' }
  if (irs >= 60) return { level: 'HIGH',     color: '#ea580c', labelKo: '높은 위험', emoji: '🟠' }
  if (irs >= 30) return { level: 'MODERATE', color: '#ca8a04', labelKo: '중간 위험', emoji: '🟡' }
  return             { level: 'LOW',      color: '#22c55e', labelKo: '낮은 위험', emoji: '🟢' }
}

// ─── 세미서클 게이지 SVG ──────────────────────────────────────────────────────
const SemiGauge = ({ value, color, size = 120 }) => {
  const r = 44
  const cx = size / 2
  const cy = size * 0.65
  const circumference = Math.PI * r
  const progress = (value / 100) * circumference

  // 배경 arc (빨강→노랑→초록 그라데이션)
  const segments = [
    { start: 0,    end: 0.30, color: '#22c55e' },
    { start: 0.30, end: 0.60, color: '#ca8a04' },
    { start: 0.60, end: 0.80, color: '#ea580c' },
    { start: 0.80, end: 1.00, color: '#dc2626' },
  ]

  const polarToXY = (angle, radius) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  })

  const arcPath = (startFrac, endFrac, r) => {
    const startAngle = Math.PI + startFrac * Math.PI
    const endAngle   = Math.PI + endFrac   * Math.PI
    const s = polarToXY(startAngle, r)
    const e = polarToXY(endAngle,   r)
    const large = endFrac - startFrac > 0.5 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const needleAngle = Math.PI + (value / 100) * Math.PI
  const needleTip = polarToXY(needleAngle, r - 6)
  const needleBase1 = polarToXY(needleAngle + Math.PI / 2, 5)
  const needleBase2 = polarToXY(needleAngle - Math.PI / 2, 5)

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      {/* 배경 트랙 세그먼트 */}
      {segments.map((seg, i) => (
        <path key={i} d={arcPath(seg.start, seg.end, r)} fill="none" stroke={seg.color} strokeWidth={8} opacity={0.25} />
      ))}
      {/* 진행 arc */}
      <path
        d={arcPath(0, value / 100, r)}
        fill="none" stroke={color} strokeWidth={8} opacity={0.9}
        strokeLinecap="round"
      />
      {/* 바늘 */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${cx},${cy} ${needleBase2.x},${needleBase2.y}`}
        fill={color} opacity={0.9}
      />
      <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.9} />
      {/* 값 표시 */}
      <text x={cx} y={cy - 12} textAnchor="middle" fill="white" fontSize={20} fontFamily="monospace" fontWeight="bold">
        {value}
      </text>
      {/* 눈금 레이블 */}
      <text x={cx - r - 4} y={cy + 4} textAnchor="middle" fill="#4b6280" fontSize={8} fontFamily="monospace">0</text>
      <text x={cx + r + 4} y={cy + 4} textAnchor="middle" fill="#4b6280" fontSize={8} fontFamily="monospace">100</text>
    </svg>
  )
}

// ─── 4축 레이더 차트 SVG ─────────────────────────────────────────────────────
const RadarChart = ({ scores, lang, size = 160 }) => {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38

  const axes = [
    { key: 'geo',    labelKo: '지정학',   labelEn: 'Geopolitics', angle: -90  },
    { key: 'supply', labelKo: '공급망',   labelEn: 'Supply Chain', angle: 0   },
    { key: 'macro',  labelKo: '거시경제', labelEn: 'Macro',        angle: 90  },
    { key: 'news',   labelKo: '뉴스',     labelEn: 'News',         angle: 180 },
  ]

  const toXY = (angle, r) => ({
    x: cx + r * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + r * Math.sin((angle - 90) * Math.PI / 180),
  })

  // 배경 그리드 (20, 40, 60, 80, 100)
  const gridLevels = [20, 40, 60, 80, 100]
  const gridPolygons = gridLevels.map(level => {
    const pts = axes.map(a => {
      const p = toXY(a.angle, (level / 100) * maxR)
      return `${p.x},${p.y}`
    })
    return pts.join(' ')
  })

  // 값 폴리곤
  const valuePts = axes.map(a => {
    const v = scores[a.key] || 0
    const p = toXY(a.angle, (v / 100) * maxR)
    return `${p.x},${p.y}`
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 그리드 */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#1a3a5c" strokeWidth={0.5} />
      ))}
      {/* 축 선 */}
      {axes.map(a => {
        const tip = toXY(a.angle, maxR)
        return <line key={a.key} x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#1a3a5c" strokeWidth={0.5} />
      })}
      {/* 값 영역 */}
      <polygon points={valuePts.join(' ')} fill="#dc262630" stroke="#dc2626" strokeWidth={1.5} />
      {/* 값 점 */}
      {axes.map(a => {
        const v = scores[a.key] || 0
        const p = toXY(a.angle, (v / 100) * maxR)
        return <circle key={a.key} cx={p.x} cy={p.y} r={3} fill="#dc2626" />
      })}
      {/* 축 레이블 */}
      {axes.map(a => {
        const tip = toXY(a.angle, maxR + 14)
        return (
          <text key={a.key} x={tip.x} y={tip.y + 3} textAnchor="middle"
            fill="#6b7280" fontSize={8} fontFamily="monospace">
            {lang === 'ko' ? a.labelKo : a.labelEn}
          </text>
        )
      })}
      {/* 값 레이블 */}
      {axes.map(a => {
        const v = scores[a.key] || 0
        const p = toXY(a.angle, (v / 100) * maxR + 10)
        return (
          <text key={a.key + '_val'} x={p.x} y={p.y + 3} textAnchor="middle"
            fill="#e2e8f0" fontSize={8} fontFamily="monospace" fontWeight="bold">
            {v}
          </text>
        )
      })}
    </svg>
  )
}

// ─── 메인 패널 ────────────────────────────────────────────────────────────────
const DEFAULT_SYMBOLS = ['NVDA', 'TSM', 'AAPL', '005930', 'TSLA']

export default function IRSPanel() {
  const { t, lang } = useLanguage()
  const [inputSymbol, setInputSymbol] = useState('')
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS)
  const [selected, setSelected] = useState(DEFAULT_SYMBOLS[0])

  const addSymbol = () => {
    const sym = inputSymbol.trim().toUpperCase()
    if (!sym || symbols.includes(sym)) { setInputSymbol(''); return }
    setSymbols(prev => [...prev, sym])
    setSelected(sym)
    setInputSymbol('')
  }

  const removeSymbol = (sym) => {
    setSymbols(prev => prev.filter(s => s !== sym))
    if (selected === sym) setSelected(symbols.find(s => s !== sym) || '')
  }

  // IRS 계산
  const irsData = useMemo(() =>
    symbols.map(sym => {
      const scores = GEOPOLITICAL_SCORES[sym] || DEFAULT_SCORES
      const irs = calcIRS(scores)
      return { sym, scores, irs, risk: getRiskLevel(irs) }
    }).sort((a, b) => b.irs - a.irs),
  [symbols])

  const selectedData = irsData.find(d => d.sym === selected) || irsData[0]

  // 포트폴리오 평균 IRS
  const avgIRS = irsData.length > 0
    ? Math.round(irsData.reduce((s, d) => s + d.irs, 0) / irsData.length)
    : 0
  const avgRisk = getRiskLevel(avgIRS)

  const subScoreLabels = {
    geo:    { ko: '지정학 (30%)', en: 'Geopolitics (30%)' },
    supply: { ko: '공급망 (25%)',  en: 'Supply Chain (25%)' },
    macro:  { ko: '거시경제 (25%)', en: 'Macro Economy (25%)' },
    news:   { ko: '뉴스 (20%)',    en: 'News Sentiment (20%)' },
  }

  return (
    <BloombergPanelWrapper
      title={lang === 'ko' ? '투자 리스크 스코어 (IRS)' : 'Investment Risk Score (IRS)'}
      badge="RISK"
    >
      {/* 종목 추가 */}
      <div className="flex gap-2 mb-3">
        <input
          value={inputSymbol}
          onChange={e => setInputSymbol(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSymbol()}
          placeholder={lang === 'ko' ? '종목 추가 (AAPL, 005930...)' : 'Add symbol (AAPL, 005930...)'}
          className="flex-1 bg-[#0a1929] border border-[#1a3a5c] rounded px-2 py-1 text-[10px] font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#3a5a9c]"
        />
        <button
          onClick={addSymbol}
          className="px-2 py-1 bg-[#0070cc]/20 text-[#5ba4d4] border border-[#0070cc]/40 rounded text-[10px] font-mono hover:bg-[#0070cc]/30 transition-colors"
        >
          + {lang === 'ko' ? '추가' : 'Add'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* 왼쪽: 레이더 + 서브스코어 */}
        <div className="lg:col-span-2">
          {selectedData && (
            <>
              <div className="flex flex-col items-center mb-3">
                <p className="text-[9px] font-mono text-gray-500 mb-1">
                  {selectedData.sym} — {lang === 'ko' ? '리스크 분석' : 'Risk Breakdown'}
                </p>
                <RadarChart scores={selectedData.scores} lang={lang} size={160} />
              </div>

              {/* 서브스코어 바 */}
              <div className="space-y-1.5">
                {Object.entries(subScoreLabels).map(([key, labels]) => {
                  const val = selectedData.scores[key] || 0
                  const color = val >= 70 ? '#dc2626' : val >= 50 ? '#ea580c' : val >= 30 ? '#ca8a04' : '#22c55e'
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[8px] font-mono text-gray-500">
                          {lang === 'ko' ? labels.ko : labels.en}
                        </span>
                        <span className="text-[9px] font-mono font-bold" style={{ color }}>{val}</span>
                      </div>
                      <div className="h-1 bg-[#1a3a5c]/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* 오른쪽: 게이지 + 테이블 */}
        <div className="lg:col-span-3">
          {/* 포트폴리오 종합 게이지 */}
          <div className="mb-3 p-2 rounded bg-[#0a1929] border border-[#1a3a5c]/40">
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1 text-center">
              {lang === 'ko' ? '포트폴리오 평균 리스크' : 'Portfolio Average Risk'}
            </p>
            <div className="flex flex-col items-center">
              <SemiGauge value={avgIRS} color={avgRisk.color} size={120} />
              <span className="text-[10px] font-mono font-bold mt-1" style={{ color: avgRisk.color }}>
                {avgRisk.emoji} {lang === 'ko' ? avgRisk.labelKo : avgRisk.level}
              </span>
            </div>
          </div>

          {/* 종목별 IRS 테이블 */}
          <div>
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">
              {lang === 'ko' ? '종목별 투자 리스크 스코어' : 'Per-Stock Investment Risk Score'}
            </p>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-[#1a3a5c]/50">
                  <th className="text-left text-gray-600 pb-1 font-normal">{lang === 'ko' ? '종목' : 'Symbol'}</th>
                  <th className="text-center text-gray-600 pb-1 font-normal">IRS</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">{lang === 'ko' ? '지정학' : 'Geo'}</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">{lang === 'ko' ? '공급망' : 'Supply'}</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">{lang === 'ko' ? '거시' : 'Macro'}</th>
                  <th className="text-right text-gray-600 pb-1 font-normal">{lang === 'ko' ? '뉴스' : 'News'}</th>
                  <th className="pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {irsData.map(({ sym, scores, irs, risk }) => (
                  <tr
                    key={sym}
                    className={`border-b border-[#1a3a5c]/20 last:border-0 cursor-pointer transition-colors ${
                      selected === sym ? 'bg-[#0a1929]' : 'hover:bg-[#0a1929]/50'
                    }`}
                    onClick={() => setSelected(sym)}
                  >
                    <td className="py-1 text-[#5ba4d4] font-bold">{sym}</td>
                    <td className="py-1 text-center font-bold" style={{ color: risk.color }}>{irs}</td>
                    <td className="py-1 text-right text-gray-400">{scores.geo}</td>
                    <td className="py-1 text-right text-gray-400">{scores.supply}</td>
                    <td className="py-1 text-right text-gray-400">{scores.macro}</td>
                    <td className="py-1 text-right text-gray-400">{scores.news}</td>
                    <td className="py-1 pl-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSymbol(sym) }}
                        className="text-gray-700 hover:text-red-400 text-[10px] leading-none"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 주석 */}
      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40">
        <p className="text-[7px] font-mono text-gray-700">
          {lang === 'ko'
            ? '※ IRS = 지정학(30%) + 공급망(25%) + 거시경제(25%) + 뉴스(20%). 하드코딩 연구 데이터 기반. 투자 판단은 본인 책임.'
            : '※ IRS = Geopolitics(30%) + Supply Chain(25%) + Macro(25%) + News(20%). Based on hardcoded research data. Not financial advice.'}
        </p>
      </div>
    </BloombergPanelWrapper>
  )
}
