import React, { useState } from 'react'
import BloombergPanelWrapper from '../Economic/BloombergPanelWrapper'
import { useLanguage } from '../../contexts/LanguageContext'

// ─── 시나리오 데이터 ────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'chip-supply-shock',
    labelKo: '반도체 공급 충격',
    labelEn: 'Chip Supply Shock',
    descKo: '대만해협 분쟁 또는 주요 팹 생산 중단으로 반도체 공급 30% 감소 가정',
    descEn: 'Taiwan Strait conflict or major fab disruption causes 30% semiconductor supply drop',
    stages: [
      {
        timeKo: '충격 즉시',
        timeEn: 'Immediate',
        nodes: [
          { sectorKo: '반도체', sectorEn: 'Semiconductors', change: -15, colorClass: 'border-red-700 bg-red-900/20', textColor: '#dc2626', stocks: ['TSM', 'NVDA', '005930', '000660'] },
        ],
      },
      {
        timeKo: '1~2개월 후',
        timeEn: '1–2 Months',
        nodes: [
          { sectorKo: '스마트폰·PC', sectorEn: 'Consumer Electronics', change: -8, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['AAPL', 'SSNLF'] },
          { sectorKo: '자동차',      sectorEn: 'Automotive',            change: -5, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['005380', '000270', 'TSLA'] },
          { sectorKo: '데이터센터',  sectorEn: 'Data Centers',          change: -6, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['AMZN', 'MSFT', 'GOOGL'] },
        ],
      },
      {
        timeKo: '2~4개월 후',
        timeEn: '2–4 Months',
        nodes: [
          { sectorKo: 'IT 기기 유통·리테일', sectorEn: 'IT Retail / Distribution', change: -3, colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['AMZN', 'WMT'] },
          { sectorKo: '클라우드·SaaS',       sectorEn: 'Cloud / SaaS',             change: -4, colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['MSFT', 'CRM', 'SNOW'] },
        ],
      },
      {
        timeKo: '4~6개월 후',
        timeEn: '4–6 Months',
        nodes: [
          { sectorKo: '미디어·광고', sectorEn: 'Media / Advertising', change: -2, colorClass: 'border-gray-700 bg-gray-900/20', textColor: '#9ca3af', stocks: ['META', 'GOOGL', 'TTD'] },
          { sectorKo: '소비재',      sectorEn: 'Consumer Goods',       change: -1.5, colorClass: 'border-gray-700 bg-gray-900/20', textColor: '#9ca3af', stocks: ['PG', 'NKE'] },
        ],
      },
    ],
  },
  {
    id: 'oil-spike',
    labelKo: '유가 급등',
    labelEn: 'Oil Price Spike',
    descKo: '호르무즈 해협 봉쇄 또는 중동 확전으로 유가 150달러 돌파 가정',
    descEn: 'Hormuz Strait blockade or Middle East escalation drives oil above $150/bbl',
    stages: [
      {
        timeKo: '충격 즉시',
        timeEn: 'Immediate',
        nodes: [
          { sectorKo: '에너지 (정유)',  sectorEn: 'Energy (Refiners)', change: +18, colorClass: 'border-green-700 bg-green-900/20', textColor: '#22c55e', stocks: ['XOM', 'CVX', 'S-Oil'] },
          { sectorKo: '방산·군수',      sectorEn: 'Defense',           change: +10, colorClass: 'border-green-700 bg-green-900/20', textColor: '#22c55e', stocks: ['LMT', 'RTX', 'NOC'] },
        ],
      },
      {
        timeKo: '1~2개월 후',
        timeEn: '1–2 Months',
        nodes: [
          { sectorKo: '항공',   sectorEn: 'Airlines',           change: -12, colorClass: 'border-red-700 bg-red-900/20',    textColor: '#dc2626', stocks: ['DAL', 'UAL', '003490'] },
          { sectorKo: '해운',   sectorEn: 'Shipping',           change: -8,  colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['ZIM', '011200'] },
          { sectorKo: '물류',   sectorEn: 'Logistics',          change: -7,  colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['FDX', 'UPS'] },
        ],
      },
      {
        timeKo: '2~4개월 후',
        timeEn: '2–4 Months',
        nodes: [
          { sectorKo: '제조업 전반', sectorEn: 'Manufacturing',    change: -5,  colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['MMM', 'CAT', 'POSCO'] },
          { sectorKo: '소비자물가 급등 → 소비재', sectorEn: 'Consumer Goods (inflation)', change: -4, colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['WMT', 'TGT'] },
        ],
      },
      {
        timeKo: '4~6개월 후',
        timeEn: '4–6 Months',
        nodes: [
          { sectorKo: '글로벌 경기침체 리스크', sectorEn: 'Global Recession Risk', change: -8, colorClass: 'border-gray-700 bg-gray-900/20', textColor: '#9ca3af', stocks: ['SPY', 'QQQ'] },
        ],
      },
    ],
  },
  {
    id: 'rate-surge',
    labelKo: '금리 급등',
    labelEn: 'Interest Rate Surge',
    descKo: '인플레이션 재점화로 Fed 10년물 금리 6% 돌파 가정',
    descEn: 'Inflation resurgence forces Fed; 10Y Treasury yield breaks 6%',
    stages: [
      {
        timeKo: '충격 즉시',
        timeEn: 'Immediate',
        nodes: [
          { sectorKo: '성장주·기술주', sectorEn: 'Growth / Tech Stocks', change: -14, colorClass: 'border-red-700 bg-red-900/20', textColor: '#dc2626', stocks: ['NVDA', 'TSLA', 'AAPL'] },
          { sectorKo: '장기채',        sectorEn: 'Long-term Bonds',       change: -12, colorClass: 'border-red-700 bg-red-900/20', textColor: '#dc2626', stocks: ['TLT', 'TMF'] },
        ],
      },
      {
        timeKo: '1~2개월 후',
        timeEn: '1–2 Months',
        nodes: [
          { sectorKo: '은행·금융 (단기 수혜)', sectorEn: 'Banks / Finance (short-term gain)', change: +6, colorClass: 'border-green-700 bg-green-900/20', textColor: '#22c55e', stocks: ['JPM', 'GS', '105560'] },
          { sectorKo: '부동산·리츠',           sectorEn: 'Real Estate / REITs',               change: -9, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['VNQ', 'SPG'] },
        ],
      },
      {
        timeKo: '2~4개월 후',
        timeEn: '2–4 Months',
        nodes: [
          { sectorKo: '소비재 (구매력 감소)', sectorEn: 'Consumer Discretionary (weak spending)', change: -7, colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['AMZN', 'HD'] },
          { sectorKo: '스타트업·VC 생태계',   sectorEn: 'Startups / VC Ecosystem',              change: -18, colorClass: 'border-red-700 bg-red-900/20',    textColor: '#dc2626', stocks: ['ARKK'] },
        ],
      },
      {
        timeKo: '4~6개월 후',
        timeEn: '4–6 Months',
        nodes: [
          { sectorKo: '대형 가치주·배당주 (수혜)', sectorEn: 'Value / Dividend Stocks (winners)', change: +5, colorClass: 'border-green-700 bg-green-900/20', textColor: '#22c55e', stocks: ['JNJ', 'VZ', 'T'] },
          { sectorKo: '신흥시장 주식',             sectorEn: 'Emerging Market Equities',         change: -11, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['EEM', '005930'] },
        ],
      },
    ],
  },
  {
    id: 'krw-crash',
    labelKo: '원화 급락',
    labelEn: 'KRW Depreciation',
    descKo: '달러/원 환율 1,600원 돌파 (한국 금융불안·경상수지 악화 가정)',
    descEn: 'USD/KRW breaks 1,600 (Korean financial stress / current account deterioration)',
    stages: [
      {
        timeKo: '충격 즉시',
        timeEn: 'Immediate',
        nodes: [
          { sectorKo: '수출 대기업 (환차익)', sectorEn: 'Korean Exporters (FX gain)', change: +8, colorClass: 'border-green-700 bg-green-900/20', textColor: '#22c55e', stocks: ['005930', '005380', '000270'] },
          { sectorKo: '한국 금융주',          sectorEn: 'Korean Banks',               change: -12, colorClass: 'border-red-700 bg-red-900/20', textColor: '#dc2626', stocks: ['105560', '055550', '086790'] },
        ],
      },
      {
        timeKo: '1~2개월 후',
        timeEn: '1–2 Months',
        nodes: [
          { sectorKo: '수입의존 기업 (원자재)', sectorEn: 'Import-dependent (raw materials)', change: -10, colorClass: 'border-orange-700 bg-orange-900/20', textColor: '#ea580c', stocks: ['한국전력', 'S-Oil'] },
          { sectorKo: '항공·여행',             sectorEn: 'Aviation / Travel',                change: -8, colorClass: 'border-orange-700 bg-orange-900/20',  textColor: '#ea580c', stocks: ['003490', '020560'] },
        ],
      },
      {
        timeKo: '2~4개월 후',
        timeEn: '2–4 Months',
        nodes: [
          { sectorKo: '소비재 (수입 인플레)', sectorEn: 'Consumer Goods (import inflation)', change: -6, colorClass: 'border-yellow-700 bg-yellow-900/20', textColor: '#ca8a04', stocks: ['롯데쇼핑', '이마트'] },
          { sectorKo: '한국 IT·서비스',       sectorEn: 'Korean IT / Services',              change: +4, colorClass: 'border-green-700 bg-green-900/20',   textColor: '#22c55e', stocks: ['NAVER', 'Kakao'] },
        ],
      },
      {
        timeKo: '4~6개월 후',
        timeEn: '4–6 Months',
        nodes: [
          { sectorKo: '외국인 투자자 이탈 → KOSPI 약세', sectorEn: 'Foreign capital outflow → KOSPI decline', change: -9, colorClass: 'border-gray-700 bg-gray-900/20', textColor: '#9ca3af', stocks: ['KODEX 200', 'TIGER 코스닥'] },
        ],
      },
    ],
  },
]

export default function SectorCascadePanel() {
  const { lang } = useLanguage()
  const [activeId, setActiveId] = useState(SCENARIOS[0].id)
  const [animStage, setAnimStage] = useState(-1) // -1 = 전체 표시

  const scenario = SCENARIOS.find(s => s.id === activeId) || SCENARIOS[0]

  const handleScenarioChange = (id) => {
    setActiveId(id)
    setAnimStage(-1)
  }

  const handleAnimate = () => {
    setAnimStage(0)
    let stage = 0
    const interval = setInterval(() => {
      stage++
      if (stage >= scenario.stages.length) {
        clearInterval(interval)
        setAnimStage(-1)
        return
      }
      setAnimStage(stage)
    }, 900)
  }

  return (
    <BloombergPanelWrapper
      title={lang === 'ko' ? '섹터 캐스케이드 분석' : 'Sector Cascade Analysis'}
      badge="CASCADE"
    >
      {/* 시나리오 선택 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => handleScenarioChange(s.id)}
            className={`px-2.5 py-1 rounded text-[9px] font-mono transition-all ${
              activeId === s.id
                ? 'bg-[#0070cc]/30 text-[#5ba4d4] border border-[#0070cc]/50'
                : 'text-gray-500 border border-[#1a3a5c]/40 hover:text-gray-300'
            }`}
          >
            {lang === 'ko' ? s.labelKo : s.labelEn}
          </button>
        ))}
        <button
          onClick={handleAnimate}
          className="ml-auto px-2.5 py-1 rounded text-[9px] font-mono text-green-400 border border-green-800/40 hover:bg-green-900/20 transition-colors"
        >
          ▶ {lang === 'ko' ? '단계별 재생' : 'Play Steps'}
        </button>
      </div>

      {/* 시나리오 설명 */}
      <p className="text-[8px] font-mono text-gray-500 mb-3 px-1 border-l-2 border-[#0070cc]/50 pl-2">
        {lang === 'ko' ? scenario.descKo : scenario.descEn}
      </p>

      {/* 캐스케이드 흐름도 */}
      <div className="space-y-2">
        {scenario.stages.map((stage, stageIdx) => {
          const isHighlighted = animStage === -1 || animStage >= stageIdx
          return (
            <div key={stageIdx} className={`transition-opacity duration-500 ${isHighlighted ? 'opacity-100' : 'opacity-25'}`}>
              {/* 시간 레이블 */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1a3a5c] text-[9px] font-mono font-bold text-[#5ba4d4] flex-shrink-0">
                  {stageIdx + 1}
                </div>
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                  {lang === 'ko' ? stage.timeKo : stage.timeEn}
                </span>
                {stageIdx < scenario.stages.length - 1 && (
                  <div className="flex-1 border-t border-[#1a3a5c]/40" />
                )}
              </div>

              {/* 노드들 */}
              <div className="flex flex-wrap gap-2 ml-7">
                {stage.nodes.map((node, nodeIdx) => (
                  <div key={nodeIdx} className={`rounded border px-2.5 py-1.5 ${node.colorClass}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold" style={{ color: node.textColor }}>
                        {node.change > 0 ? '+' : ''}{node.change}%
                      </span>
                      <span className="text-[9px] font-mono text-gray-300">
                        {lang === 'ko' ? node.sectorKo : node.sectorEn}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {node.stocks.slice(0, 3).map(s => (
                        <span key={s} className="text-[7px] font-mono text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 화살표 (마지막 단계 제외) */}
              {stageIdx < scenario.stages.length - 1 && (
                <div className="flex items-center ml-7 mt-1.5">
                  <span className="text-[10px] text-gray-700">↓</span>
                  <span className="text-[7px] font-mono text-gray-700 ml-1">
                    {lang === 'ko' ? scenario.stages[stageIdx + 1].timeKo : scenario.stages[stageIdx + 1].timeEn}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-[#1a3a5c]/40">
        <p className="text-[7px] font-mono text-gray-700">
          {lang === 'ko'
            ? '※ 시나리오 기반 추정치. 실제 시장 반응은 다를 수 있습니다.'
            : '※ Scenario-based estimates. Actual market reactions may differ.'}
        </p>
      </div>
    </BloombergPanelWrapper>
  )
}
